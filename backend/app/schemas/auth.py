from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.user import UserResponse


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    email: Optional[str] = None
    roles: list[str] = []
    permissions: list[str] = []


class LoginRequest(BaseModel):
    username_or_email: str = Field(..., description="Email address or username")
    password: str = Field(..., description="User password")


class PasswordResetRequest(BaseModel):
    email: str = Field(..., description="Account email address")
    new_password: str = Field(..., min_length=8, description="New password")
    reset_code: Optional[str] = Field("DEV-DEMO-RESET", description="Reset code or dev override")


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)
