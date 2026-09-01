import logging


def configure_logging() -> None:
    """Same rationale as backend/app/logging_config.py: without an explicit
    handler, INFO-level logs are silently dropped."""
    if logging.getLogger().handlers:
        return
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
