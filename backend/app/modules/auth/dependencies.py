from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.modules.auth.schemas import TokenPayload
from app.modules.auth.services import get_user_by_id
from app.modules.auth.models import User

# HTTPBearer extracts the Authorization header e.g., 'Bearer <token>'
security_scheme = HTTPBearer()

def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme)
) -> User:
    """
    Decodes JWT token, validates authenticity, and returns the current user.
    Throws 401 Unauthorized if invalid or inactive.
    """
    token = credentials.credentials
    try:
        # 1. Decode JWT payload
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id_str: str = payload.get("sub")
        if not user_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token payload missing subject identifier",
            )
        token_data = TokenPayload(sub=user_id_str)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature or expired token",
        )
        
    # 2. Retrieve user
    user = get_user_by_id(db, user_id=int(token_data.sub))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="User associated with token not found"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="User account is deactivated"
        )
        
    return user
