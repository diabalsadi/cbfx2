from pathlib import Path
import uuid

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.forum_thread import ForumThread as ForumThreadModel
from app.models.forum_reply import ForumReply as ForumReplyModel
from app.schemas.forum import (
    ForumThread,
    ForumThreadCreate,
    ForumThreadUpdate,
    ForumThreadPinUpdate,
    ForumThreadDetail,
    ForumReply,
    ForumReplyCreate,
)
from app.schemas.user import ADMIN_ROLES
from app.utils.auth import get_current_user
from app.utils.forum_stats import get_reply_count_lookup
from app.models.user import User

router = APIRouter(prefix="/forum", tags=["forum"])
UPLOAD_ROOT = Path(__file__).resolve().parent.parent / "uploads" / "forum"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

# Extension is derived from this allowlist (never from the client-supplied
# filename) so an upload can't be stored/served as .html/.svg/etc. and have
# its attacker-chosen content executed when served back same-origin.
ALLOWED_IMAGE_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


def _save_uploaded_image(upload: Optional[UploadFile]) -> Optional[str]:
    if upload is None or upload.filename is None:
        return None

    suffix = ALLOWED_IMAGE_TYPES.get((upload.content_type or "").lower())
    if suffix is None:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image type. Allowed: PNG, JPEG, WEBP, GIF.",
        )
    filename = f"{uuid.uuid4().hex}{suffix}"
    destination = UPLOAD_ROOT / filename
    contents = upload.file.read()
    destination.write_bytes(contents)
    return f"/api/proxy/forum/uploads/{filename}"


@router.get("/uploads/{filename}")
def get_uploaded_image(filename: str):
    safe_name = Path(filename).name
    path = UPLOAD_ROOT / safe_name
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Image not found")
    # media_type is pinned to the fixed allowlist above (never inferred from
    # the filename) and nosniff blocks the browser from second-guessing it —
    # together these keep an uploaded file from ever being executed as
    # HTML/SVG/script when opened directly, same-origin as the JWT in
    # localStorage.
    media_type = next(
        (mt for mt, ext in ALLOWED_IMAGE_TYPES.items() if safe_name.endswith(ext)),
        "application/octet-stream",
    )
    return FileResponse(
        path,
        media_type=media_type,
        headers={"X-Content-Type-Options": "nosniff"},
    )


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
    counts = get_reply_count_lookup(db, [thread.id for thread in threads])
    for thread in threads:
        thread.reply_count = counts.get(thread.id, 0)
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
    thread.reply_count = len(replies)
    result = ForumThreadDetail.model_validate(thread)
    result.replies = [ForumReply.model_validate(r) for r in replies]
    return result


@router.post(
    "/threads", response_model=ForumThread, status_code=status.HTTP_201_CREATED
)
def create_thread(
    title: str = Form(...),
    body: Optional[str] = Form(None),
    category: str = Form("General"),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Authenticated — any logged-in user can create a thread with an optional image."""
    data = ForumThreadCreate(title=title, body=body, category=category)
    thread = ForumThreadModel(
        title=data.title,
        body=data.body,
        category=data.category,
        image_url=_save_uploaded_image(image),
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
    if thread.author_email != current_user.email and current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Not authorised")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(thread, field, value)
    db.commit()
    db.refresh(thread)
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


# ── Replies ────────────────────────────────────────────────────────────────────


@router.post(
    "/threads/{thread_id}/replies",
    response_model=ForumReply,
    status_code=status.HTTP_201_CREATED,
)
def create_reply(
    thread_id: str,
    body: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Authenticated — post a reply to a thread with an optional image."""
    thread = db.query(ForumThreadModel).filter(ForumThreadModel.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    data = ForumReplyCreate(body=(body or "").strip())
    if not data.body and image is None:
        raise HTTPException(status_code=400, detail="Reply body or image is required")
    reply = ForumReplyModel(
        thread_id=thread_id,
        body=data.body,
        image_url=_save_uploaded_image(image),
        author_email=current_user.email,
    )
    db.add(reply)
    db.commit()
    db.refresh(reply)
    thread.reply_count = (
        db.query(ForumReplyModel).filter(ForumReplyModel.thread_id == thread_id).count()
    )
    db.commit()
    db.refresh(thread)
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
