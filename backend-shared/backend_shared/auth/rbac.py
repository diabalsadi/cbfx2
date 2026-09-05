from fastapi import Depends, HTTPException

from backend_shared.models.user import User
from backend_shared.utils.auth import get_current_user


def require_roles(roles: set):
    def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return checker
