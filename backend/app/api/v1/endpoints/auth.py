from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models import Staff, User
from app.schemas.auth import (
    LoginRequest,
    RegistrationRequest,
    SetupStatus,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth")


def serialize_user(user: User, db: Session) -> UserResponse:
    staff = (
        db.get(Staff, user.staff_id)
        if user.role == "staff" and user.staff_id is not None
        else None
    )
    return UserResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        job_title=staff.job_title if staff else None,
    )


@router.get("/setup-status", response_model=SetupStatus)
def setup_status(db: Session = Depends(get_db)) -> SetupStatus:
    owner_exists = db.scalar(select(User.id).where(User.role == "owner").limit(1))
    return SetupStatus(owner_setup_required=owner_exists is None)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    credentials: RegistrationRequest,
    db: Session = Depends(get_db),
) -> User:
    owner_exists = db.scalar(select(User.id).where(User.role == "owner").limit(1))
    if owner_exists is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner setup is complete. Ask the owner to create your staff account.",
        )

    email = str(credentials.email)
    user = User(
        email=email,
        hashed_password=hash_password(credentials.password),
        role="owner",
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Owner setup has already been completed or the email is already in use",
        ) from error
    db.refresh(user)
    return user


@router.get("/me", response_model=UserResponse)
def current_user(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    return serialize_user(user, db)


@router.post("/login", response_model=TokenResponse)
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == str(credentials.email)))
    if user is None or not verify_password(
        credentials.password, user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    staff = None
    if user.role == "staff":
        staff = db.get(Staff, user.staff_id) if user.staff_id is not None else None
        if staff is None or not staff.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This staff account is inactive",
            )

    return TokenResponse(
        access_token=create_access_token(user.id),
        user=serialize_user(user, db),
    )
