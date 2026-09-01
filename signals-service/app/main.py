from fastapi import Depends, FastAPI, Header, HTTPException

from app.config import TASK_AUTH_TOKEN
from app.logging_config import configure_logging
from app.pipeline.generate import run_generate_job
from app.pipeline.monitor import run_monitor_job

configure_logging()

app = FastAPI(title="cbfx-signals-service")


def require_task_token(authorization: str = Header(default="")) -> None:
    """The Cloudflare Worker cron trigger is the only intended caller — these
    endpoints move money-adjacent data and call paid APIs, so they must not
    be publicly invokable by anyone who finds the container's URL."""
    expected = f"Bearer {TASK_AUTH_TOKEN}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/tasks/generate")
def tasks_generate(_: None = Depends(require_task_token)):
    """Triggered every 30 minutes by the Cloudflare Worker cron — see
    app/pipeline/generate.py:run_generate_job."""
    return run_generate_job()


@app.post("/tasks/monitor")
def tasks_monitor(_: None = Depends(require_task_token)):
    """Triggered every 10 minutes by the Cloudflare Worker cron — see
    app/pipeline/monitor.py:run_monitor_job."""
    return run_monitor_job()
