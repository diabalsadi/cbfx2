from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.forum_thread import ForumThread as ForumThreadModel
from app.models.forum_reply import ForumReply as ForumReplyModel
from app.schemas.forum import (
    ForumThread,
    ForumThreadCreate,
    ForumThreadUpdate,
    ForumThreadDetail,
    ForumReply,
    ForumReplyCreate,
)
from app.utils.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/forum", tags=["forum"])


# ── Threads ────────────────────────────────────────────────────────────────────

@router.get("/threads", response_model=List[ForumThread])
def list_threads(
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Public — paginated list of threads, pinned first, then newest."""
    q = db.query(ForumThreadModel)
    if category:
        q = q.filter(ForumThreadModel.category == category)
    threads = (
        q.order_by(
            ForumThreadModel.is_pinned.desc(),
            ForumThreadModel.created_at.desc(),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )
    return threads


@router.get("/threads/{thread_id}", response_model=ForumThreadDetail)
def get_thread(thread_id: str, db: Session = Depends(get_db)):
    """Public — single thread with all replies."""
    thread = db.query(ForumThreadModel).filter(ForumThreadModel.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    replies = (
        db.query(ForumReplyModel)
        .filter(ForumReplyModel.thread_id == thread_id)
        .order_by(ForumReplyModel.created_at.asc())
        .all()
    )
    result = ForumThreadDetail.model_validate(thread)
    result.replies = [ForumReply.model_validate(r) for r in replies]
    return result


@router.post("/threads", response_model=ForumThread, status_code=status.HTTP_201_CREATED)
def create_thread(
    data: ForumThreadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Authenticated — any logged-in user can create a thread."""
    thread = ForumThreadModel(
        **data.model_dump(),
        author_email=current_user.email,
    )
    db.add(thread)
    db.commit()
    db.refresh(thread)
    return thread


@router.put("/threads/{thread_id}", response_model=ForumThread)
def update_thread(
    thread_id: str,
    data: ForumThreadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Author or admin — update thread metadata."""
    thread = db.query(ForumThreadModel).filter(ForumThreadModel.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    if thread.author_email != current_user.email and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorised")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(thread, field, value)
    db.commit()
    db.refresh(thread)
    return thread


@router.delete("/threads/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_thread(
    thread_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Author or admin — delete a thread and all its replies."""
    thread = db.query(ForumThreadModel).filter(ForumThreadModel.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    if thread.author_email != current_user.email and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorised")
    # Replies cascade-delete via FK ondelete=CASCADE
    db.delete(thread)
    db.commit()


# ── Replies ────────────────────────────────────────────────────────────────────

@router.post("/threads/{thread_id}/replies", response_model=ForumReply, status_code=status.HTTP_201_CREATED)
def create_reply(
    thread_id: str,
    data: ForumReplyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Authenticated — post a reply to a thread."""
    thread = db.query(ForumThreadModel).filter(ForumThreadModel.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    reply = ForumReplyModel(
        thread_id=thread_id,
        body=data.body,
        author_email=current_user.email,
    )
    db.add(reply)
    # Increment cached reply count
    thread.reply_count = ForumThreadModel.reply_count + 1
    db.commit()
    db.refresh(reply)
    return reply


@router.delete("/replies/{reply_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reply(
    reply_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Author or admin — delete a reply."""
    reply = db.query(ForumReplyModel).filter(ForumReplyModel.id == reply_id).first()
    if not reply:
        raise HTTPException(status_code=404, detail="Reply not found")
    if reply.author_email != current_user.email and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorised")
    # Decrement cached reply count
    thread = db.query(ForumThreadModel).filter(ForumThreadModel.id == reply.thread_id).first()
    if thread and thread.reply_count > 0:
        thread.reply_count = ForumThreadModel.reply_count - 1
    db.delete(reply)
    db.commit()
