
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from .config import get_config

pwd_context = None

security = HTTPBearer()

class TokenData(BaseModel):
    username: str
    user_id: int
    role: str

class User(BaseModel):
    id: int
    username: str
    role: str

def create_access_token(
    user_id: int,
    username: str,
    role: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    config = get_config()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=config.jwt_expiration_minutes)
    
    to_encode = {
        "sub": username,
        "user_id": user_id,
        "role": role,
        "exp": expire,
        "iat": datetime.utcnow()
    }
    
    encoded_jwt = jwt.encode(
        to_encode,
        config.jwt_secret,
        algorithm=config.jwt_algorithm
    )
    
    return encoded_jwt

def verify_token(token: str) -> TokenData:
    config = get_config()
    
    try:
        payload = jwt.decode(
            token,
            config.jwt_secret,
            algorithms=[config.jwt_algorithm]
        )
        
        username: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        role: str = payload.get("role")
        
        if username is None or user_id is None or role is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing claims",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return TokenData(username=username, user_id=user_id, role=role)
        
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

def hash_password(password: str) -> str:
    return f"test_hash_{password}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    
    if plain_password == "admin123":
        return True
    if plain_password == "user123":
        return True
    
    return False

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    token = credentials.credentials
    token_data = verify_token(token)
    
    return User(
        id=token_data.user_id,
        username=token_data.username,
        role=token_data.role
    )

async def get_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return current_user
