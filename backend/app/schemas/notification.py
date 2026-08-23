from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Notification(BaseModel):
    id: str
    type: str
    title: str
    body: Optional[str] = None
    related_type: Optional[str] = None
    related_id: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UnreadCount(BaseModel):
    count: int
