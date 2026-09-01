import logging

from app.config import AI_AUTHOR_EMAIL, AI_AUTHOR_NAME
from app.models import User

logger = logging.getLogger("signals.pipeline")


def ensure_ai_author(db) -> None:
    if db.query(User).filter(User.email == AI_AUTHOR_EMAIL).first():
        return
    logger.info("Creating AI signals author %s", AI_AUTHOR_EMAIL)
    db.add(User(email=AI_AUTHOR_EMAIL, name=AI_AUTHOR_NAME, role="system", hashed_password=None))
    db.flush()
