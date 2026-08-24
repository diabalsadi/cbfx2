from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from typing import List

from app.models.user import User
from app.schemas.media import MediaImage
from app.services import r2_storage
from app.utils.auth import get_current_user

router = APIRouter(prefix="/media", tags=["media"])

ALLOWED_ROLES = {"super_admin", "editor"}


def require_roles(roles: set):
    def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return checker


@router.get("/images", response_model=List[MediaImage])
def list_images(current_user: User = Depends(require_roles(ALLOWED_ROLES))):
    try:
        return r2_storage.list_images()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/images", response_model=MediaImage, status_code=status.HTTP_201_CREATED)
def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="A file is required")
    contents = file.file.read()
    try:
        return r2_storage.upload_image(file.filename, file.content_type or "", contents)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.delete("/images/{key:path}", status_code=status.HTTP_204_NO_CONTENT)
def delete_image(
    key: str,
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    try:
        r2_storage.delete_image(key)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
