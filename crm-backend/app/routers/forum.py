"""Moderation-only forum action — duplicated from user-backend (the owner
of the full forum CRUD) per plan.md Phase 3's mixed-file split. Pinning is
admin-exclusive (no self-authorship bypass, unlike update/delete thread),
so it's the one forum endpoint crm-frontend's admin dashboard needs
directly rather than through user-backend."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend_shared.database import get_db
from backend_shared.models.forum_thread import ForumThread as ForumThreadModel
from backend_shared.schemas.forum import ForumThread, ForumThreadPinUpdate
from backend_shared.schemas.user import ADMIN_ROLES
from backend_shared.utils.auth import get_current_user
from backend_shared.utils.cache import purge_public_cache
from backend_shared.models.user import User

router = APIRouter(prefix="/forum", tags=["forum"])


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
