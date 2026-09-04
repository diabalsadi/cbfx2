from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List

from backend_shared.models.forum_reply import ForumReply


def get_reply_count_lookup(db: Session, thread_ids: List[str]) -> dict[str, int]:
    """One GROUP BY query for however many thread_ids are passed, instead of
    a separate COUNT per thread — used by both forum.py's own thread list
    and public.py's homepage aggregate."""
    if not thread_ids:
        return {}
    counts = (
        db.query(
            ForumReply.thread_id,
            func.count(ForumReply.id).label("reply_count"),
        )
        .filter(ForumReply.thread_id.in_(thread_ids))
        .group_by(ForumReply.thread_id)
        .all()
    )
    return {thread_id: count for thread_id, count in counts}
