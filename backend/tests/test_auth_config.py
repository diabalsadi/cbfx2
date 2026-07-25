import importlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def test_auth_module_uses_fallback_secret_when_env_missing(monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)
    sys.modules.pop("app.utils.auth", None)

    module = importlib.import_module("app.utils.auth")

    assert module.SECRET_KEY == "dev-secret-change-me"
