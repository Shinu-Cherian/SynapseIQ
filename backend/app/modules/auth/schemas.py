from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict

# Shared properties
class UserBase(BaseModel):
    email: EmailStr
    full_name: str

# Properties to receive on user signup
class UserCreate(UserBase):
    password: str

# Properties to return to client
class UserResponse(UserBase):
    id: int
    is_active: bool
    is_verified: bool
    created_at: datetime

    # Tell Pydantic to read database models (ORM objects) directly
    model_config = ConfigDict(from_attributes=True)

# Login credentials schema
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Token response schema
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Token payload schema (for decoding JWTs)
class TokenPayload(BaseModel):
    sub: Optional[str] = None
