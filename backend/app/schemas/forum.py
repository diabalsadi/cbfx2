from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── Thread schemas ─────────────────────────────────────────────────────────────

class ForumThreadBase(BaseModel):
    title: str
    body: Optional[str] = None
    category: str = "General"  # "General"|"Forex"|"Crypto"|"Metals"|"Indices"|"Strategy"


class ForumThreadCreate(ForumThreadBase):
    pass


class ForumThreadUpdate(BaseModel):
    """Fields a thread's own author (or an admin) may edit. is_pinned is
    deliberately excluded — it's moderation-only, see ForumThreadPinUpdate."""

    title: Optional[str] = None
    body: Optional[str] = None
    category: Optional[str] = None


class ForumThreadPinUpdate(BaseModel):
    is_pinned: bool


class ForumThread(ForumThreadBase):
    id: str
    author_email: str
    reply_count: int
    image_url: Optional[str] = None
    is_pinned: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Reply schemas ──────────────────────────────────────────────────────────────

class ForumReplyBase(BaseModel):
    body: Optional[str] = ""


class ForumReplyCreate(ForumReplyBase):
    pass


class ForumReply(ForumReplyBase):
    id: str
    thread_id: str
    author_email: str
    image_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Thread with replies ────────────────────────────────────────────────────────

class ForumThreadDetail(ForumThread):
    replies: List[ForumReply] = []
