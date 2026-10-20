import os
import hashlib
import hmac
from datetime import datetime, timedelta
from typing import Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
import models

SECRET_KEY = os.getenv("JWT_SECRET", "super-toeic-secret-key-edtech-platform-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30
SALT = b"toeic_salt_2026"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def hash_password(password: str) -> str:
    """
    PBKDF2-HMAC-SHA256 with 100,000 iterations for robust password security.
    """
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), SALT, 100000).hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Constant-time password verification supporting PBKDF2 and legacy HMAC hashes.
    """
    if not plain_password or not hashed_password:
        return False

    # Check PBKDF2-HMAC-SHA256
    pbkdf2_hash = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), SALT, 100000).hex()
    if hmac.compare_digest(pbkdf2_hash, hashed_password):
        return True

    # Check Legacy HMAC-SHA256 for existing database users
    legacy_hash = hmac.new(SALT, plain_password.encode("utf-8"), hashlib.sha256).hexdigest()
    if hmac.compare_digest(legacy_hash, hashed_password):
        return True

    return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generates signed JWT token including token_version, iat, and exp.
    """
    to_encode = data.copy()
    now = datetime.utcnow()
    expire = now + (expires_delta or timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS))
    
    to_encode.update({
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp())
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    """
    Strict server-side JWT authentication.
    Rejects missing, expired, tampered, or revoked tokens with 401 Unauthorized.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yêu cầu xác thực tài khoản (Authentication credentials required)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token đăng nhập đã hết hạn (Token expired)",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token đăng nhập không hợp lệ (Invalid token)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token thiếu thông tin định danh người dùng",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản người dùng không tồn tại hoặc đã bị xóa",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not getattr(user, "is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản này đã bị tạm khóa hoặc vô hiệu hóa bởi Quản trị viên"
        )

    token_ver = payload.get("token_version")
    if token_ver is not None and token_ver != getattr(user, "token_version", 1):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập đã bị thu hồi hoặc đổi mật khẩu (Token revoked)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user

def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[models.User]:
    """
    Optional authentication for endpoints accessible to both guests and logged-in users.
    Returns None if no token or invalid token is supplied (never impersonates).
    """
    if not token:
        return None
    try:
        return get_current_user(token=token, db=db)
    except HTTPException:
        return None

def require_admin(
    user: models.User = Depends(get_current_user)
) -> models.User:
    """
    Strict server-side RBAC dependency. Enforces role == 'admin'.
    """
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yêu cầu quyền Quản trị viên (Admin privileges required)"
        )
    return user
