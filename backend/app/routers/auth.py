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
    user_role = str(user.get("role") or "user").strip().lower()
    
    # If a role is requested in the login form, verify that it matches the user's actual role in MongoDB
    # The frontend's "Employee" tab tries multiple non-admin roles (teamlead, programmanager,
    # program_manager, manager) — accept any of the team-lead-equivalent shapes here.
    if body.role:
        req_role = body.role.strip().lower().replace(" ", "").replace("_", "")
        actual_role = user_role.replace(" ", "").replace("_", "")
        team_lead_equivalents = (
            "teamlead", "lead", "manager", "teamleads", "sme",
            "programmanager", "pm",
        )
        if req_role in team_lead_equivalents:
            if actual_role not in team_lead_equivalents:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied. Your account is not registered as a Team Lead or Program Manager."
                )
        elif req_role == "admin":
            if actual_role != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied. Your account is not registered as an Admin."
                )
    
    # Role checking: Admins, Team Leads, and Program Managers are authorized to access this dashboard.
    # MongoDB stores the role as plain "programmanager" (no space, no underscore) — we accept all
    # casing/spacing variants for safety.
    allowed_roles = {
        "admin",
        "team lead", "team_lead", "teamlead", "lead",
        "manager", "teamleads", "sme",
        "programmanager", "program manager", "program_manager", "pm",
    }
    if user_role not in allowed_roles:
        logger.warning(f"Forbidden login attempt: User '{email_clean}' has unauthorized role '{user_role}'.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only Admins, Team Leads, and Program Managers are authorized to access this dashboard."
        )
        
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
