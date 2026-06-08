import secrets
from typing import Optional
from sqlalchemy.orm import Session
from app.modules.auth.models import User
from app.modules.auth.schemas import UserCreate
from app.core.security import hash_password, verify_password

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """
    Retrieves a user from the database by email.
    """
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """
    Retrieves a user from the database by ID.
    """
    return db.query(User).filter(User.id == user_id).first()

def register_user(db: Session, user_in: UserCreate) -> User:
    """
    Registers a new user, hashes password, and generates verification token.
    """
    # 1. Generate standard verification token (random 32 bytes hex)
    verification_token = secrets.token_urlsafe(32)
    
    # 2. Hash password & create user model
    db_user = User(
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
        verification_token=verification_token,
        is_verified=False  # Must verify email first
    )
    
    # 3. Save to database
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # 4. Trigger Email Verification event (Print statement mock for Resend/Brevo)
    print(f"[RESEND/BREVO MOCK] Sending verification email to {db_user.email}...")
    print(f"[LINK] http://localhost:8000/api/v1/auth/verify?email={db_user.email}&token={verification_token}")
    
    return db_user

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """
    Validates email and password, returning user if authentic.
    """
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def verify_user_email(db: Session, email: str, token: str) -> bool:
    """
    Verifies user email using token. Returns True if successful.
    """
    user = get_user_by_email(db, email)
    if not user or user.is_verified:
        return False
    
    if user.verification_token == token:
        user.is_verified = True
        user.verification_token = None
        db.commit()
        db.refresh(user)
        return True
        
    return False
