from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..models import PasswordResetToken, Role, User, UserStatus
from ..rate_limit import limit
from ..schemas import (
    ForgotPasswordIn,
    LoginIn,
    RegisterIn,
    ResetPasswordIn,
    TokenOut,
    UserOut,
)
from ..security import create_access_token, generate_reset_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut, status_code=201)
def register(payload: RegisterIn, request: Request, db: Session = Depends(get_db)):
    limit(request, "register", max_hits=5, window_seconds=300)
    email = payload.email.lower()
    exists = db.scalar(select(func.count()).select_from(User).where(func.lower(User.email) == email))
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "That email is already registered.")
    user = User(
        name=payload.name.strip(),
        email=email,
        password=hash_password(payload.password),
        role=Role.STUDENT,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenOut(access_token=create_access_token(user.id, user.role.value), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, request: Request, db: Session = Depends(get_db)):
    limit(request, "login", max_hits=10, window_seconds=60)
    user = db.scalar(select(User).where(func.lower(User.email) == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email or password is incorrect.")
    if user.status is UserStatus.INACTIVE:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is deactivated. Contact the admin.")
    return TokenOut(access_token=create_access_token(user.id, user.role.value), user=UserOut.model_validate(user))


@router.post("/logout", status_code=204)
def logout(_: User = Depends(get_current_user)):
    """Tokens are stateless; the client clears storage. Kept for API parity."""
    return None


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordIn, request: Request, db: Session = Depends(get_db)):
    limit(request, "forgot", max_hits=5, window_seconds=300)
    user = db.scalar(select(User).where(func.lower(User.email) == payload.email.lower()))
    response = {"message": "If that email exists, a reset link has been sent."}
    if not user:
        return response
    token = generate_reset_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.reset_token_expire_minutes),
        )
    )
    db.commit()
    # No mail server in this build: the token is surfaced so the flow is testable end to end.
    response["reset_token"] = token
    return response


@router.post("/reset-password")
def reset_password(payload: ResetPasswordIn, request: Request, db: Session = Depends(get_db)):
    limit(request, "reset", max_hits=10, window_seconds=300)
    record = db.scalar(select(PasswordResetToken).where(PasswordResetToken.token == payload.token))
    if not record or record.used:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This reset link is not valid.")
    expires = record.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This reset link has expired. Request a new one.")
    user = db.get(User, record.user_id)
    user.password = hash_password(payload.password)
    record.used = True
    db.commit()
    return {"message": "Password updated. Sign in with your new password."}
