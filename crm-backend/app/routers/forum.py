"""Moderation forum actions — duplicated from user-backend (the owner of
the full forum CRUD) per plan.md Phase 3's mixed-file split. Originally
pin_thread only (the one endpoint with no self-authorship bypass); update/
delete/delete_reply added afterward on explicit user request so the admin
dashboard actually has thread/reply moderation tools, not just pin/unpin.
These three keep the exact same "author or admin" check they have in
user-backend — duplicated here so an admin can also act on them from
crm-frontend, not narrowed to admin-only."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend_shared.database import get_db
from backend_shared.models.forum_thread import ForumThread as ForumThreadModel
from backend_shared.models.forum_reply import ForumReply as ForumReplyModel
from backend_shared.schemas.forum import ForumThread, ForumThreadUpdate, ForumThreadPinUpdate
from backend_shared.schemas.user import ADMIN_ROLES
from backend_shared.utils.auth import get_current_user
from backend_shared.utils.cache import purge_public_cache
from backend_shared.models.user import User

router = APIRouter(prefix="/forum", tags=["forum"])


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
    if thread.author_email != current_user.email and current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Not authorised")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(thread, field, value)
    db.commit()
    db.refresh(thread)
    purge_public_cache()
    return thread


@router.patch("/threads/{thread_id}/pin", response_model=ForumThread)
def pin_thread(
    thread_id: str,
    data: ForumThreadPinUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin-only — pinning is moderation, not something a thread's own
    author may set on themselves (see ForumThreadUpdate)."""
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Not authorised")
    thread = db.query(ForumThreadModel).filter(ForumThreadModel.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    thread.is_pinned = data.is_pinned
    db.commit()
    db.refresh(thread)
    purge_public_cache()
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
    if thread.author_email != current_user.email and current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Not authorised")
    # Replies cascade-delete via FK ondelete=CASCADE
    db.delete(thread)
    db.commit()
    purge_public_cache()


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
    if reply.author_email != current_user.email and current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Not authorised")
    thread = (
        db.query(ForumThreadModel)
        .filter(ForumThreadModel.id == reply.thread_id)
        .first()
    )
    db.delete(reply)
    db.commit()
    if thread:
        thread.reply_count = (
            db.query(ForumReplyModel)
            .filter(ForumReplyModel.thread_id == thread.id)
            .count()
        )
        db.commit()
        db.refresh(thread)
    purge_public_cache()
