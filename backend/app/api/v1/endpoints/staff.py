from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.dependencies import require_owner
from app.core.security import hash_password
from app.db.session import get_db
from app.models import Staff, User
from app.schemas.shop import StaffCreate, StaffResponse, StaffUpdate

router = APIRouter(prefix="/staff", dependencies=[Depends(require_owner)])


def staff_response(staff: Staff, has_login: bool) -> StaffResponse:
    return StaffResponse(
        id=staff.id,
        name=staff.name,
        phone=staff.phone,
        email=staff.email,
        job_title=staff.job_title,
        start_date=staff.start_date,
        is_active=staff.is_active,
        has_login=has_login,
        created_at=staff.created_at,
        updated_at=staff.updated_at,
    )


@router.get("", response_model=list[StaffResponse])
def list_staff(
    db: Session = Depends(get_db),
) -> list[StaffResponse]:
    records = db.execute(
        select(Staff, User.id)
        .outerjoin(User, User.staff_id == Staff.id)
        .order_by(Staff.name)
    ).all()
    return [staff_response(staff, user_id is not None) for staff, user_id in records]


@router.post(
    "",
    response_model=StaffResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_staff(
    staff_data: StaffCreate,
    db: Session = Depends(get_db),
) -> StaffResponse:
    staff_fields = staff_data.model_dump(exclude={"password"})
    staff = Staff(**staff_fields)
    db.add(staff)
    try:
        db.flush()
        db.add(
            User(
                email=str(staff_data.email),
                hashed_password=hash_password(staff_data.password),
                role="staff",
                staff_id=staff.id,
            )
        )
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A staff member or login with this email already exists",
        ) from error
    db.refresh(staff)
    return staff_response(staff, has_login=True)


@router.put("/{staff_id}", response_model=StaffResponse)
def update_staff(
    staff_id: int,
    staff_data: StaffUpdate,
    db: Session = Depends(get_db),
) -> StaffResponse:
    staff = db.get(Staff, staff_id)
    if staff is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found",
        )

    account = db.scalar(select(User).where(User.staff_id == staff_id))
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This staff record has no login account",
        )

    for field, value in staff_data.model_dump(exclude={"password"}).items():
        setattr(staff, field, value)
    account.email = str(staff_data.email)
    if staff_data.password:
        account.hashed_password = hash_password(staff_data.password)

    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A staff member or login with this email already exists",
        ) from error
    db.refresh(staff)
    return staff_response(staff, has_login=True)
