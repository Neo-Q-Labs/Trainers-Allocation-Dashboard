from __future__ import annotations

import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.db import get_users_collection
from app.auth_utils import verify_password, create_access_token, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    email: str = Field(..., description="The user's login email address or username")
    password: str = Field(..., description="The user's secret password")
    role: str | None = Field(None, description="The requested login role (e.g. 'admin' or 'teamlead')")


class UserResponse(BaseModel):
    id: str
    email: str
    name: str | None = None
    role: str | None = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest) -> Any:
    """Authenticate user credentials and issue a JWT access token."""
    email_clean = body.email.strip()
    
    users_coll = get_users_collection()
    # Search for user by email, employeeId, or username (case-insensitive for safety)
    user = await users_coll.find_one({
        "$or": [
            {"email": {"$regex": f"^{email_clean}$", "$options": "i"}},
            {"employeeId": {"$regex": f"^{email_clean}$", "$options": "i"}},
            {"username": {"$regex": f"^{email_clean}$", "$options": "i"}}
        ]
    })
    
    if not user:
        logger.warning(f"Failed login attempt: User '{email_clean}' not found.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
        
    hashed_pwd = user.get("password") or ""
    if not verify_password(body.password, hashed_pwd):
        logger.warning(f"Failed login attempt: Incorrect password for user '{email_clean}'.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
        
    # Generate the access token using the user's email or employeeId
    user_email = user.get("email") or user.get("employeeId") or user.get("username") or email_clean
    # The dashboard is open to all authenticated users — no role gate.
    # The role from the login form is accepted as a hint only (used by the
    # client to skin Admin mode); we no longer reject any value.

    access_token = create_access_token(data={"sub": user_email})
    
    user_id = str(user.get("_id"))
    user_name = user.get("name") or user.get("username") or user_email.split("@")[0]
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user.get("email") or user.get("employeeId") or user_email,
            "name": user_name,
            "role": user.get("role") or "user"
        }
    }


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict[str, Any] = Depends(get_current_user)) -> Any:
    """Retrieve the profile metadata of the currently authenticated user."""
    return current_user
