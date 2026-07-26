from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── Thread schemas ─────────────────────────────────────────────────────────────

class ForumThreadBase(BaseModel):
    title: str
    body: Optional[str] = None
    category: str = "General"  # "General"|"EUR"|"CRYPTO"|"USD"|"Metals"|"Strategy"
    image_url: Optional[str] = None


class ForumThreadCreate(ForumThreadBase):
    pass


class ForumThreadUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    category: Optional[str] = None
    is_pinned: Optional[bool] = None


class ForumThread(ForumThreadBase):
    id: str
    author_email: str
    reply_count: int
    is_pinned: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Reply schemas ──────────────────────────────────────────────────────────────

class ForumReplyBase(BaseModel):
    body: str
    image_url: Optional[str] = None


class ForumReplyCreate(ForumReplyBase):
    pass


class ForumReply(ForumReplyBase):
    id: str
    thread_id: str
    author_email: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Thread with replies ────────────────────────────────────────────────────────

class ForumThreadDetail(ForumThread):
    replies: List[ForumReply] = []
