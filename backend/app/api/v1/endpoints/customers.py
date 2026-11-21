from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models import Customer
from app.schemas.shop import CustomerInput, CustomerResponse

router = APIRouter(
    prefix="/customers",
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=list[CustomerResponse])
def list_customers(
    db: Session = Depends(get_db),
) -> list[Customer]:
    return list(db.scalars(select(Customer).order_by(Customer.name)).all())


@router.post(
    "",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_customer(
    customer_data: CustomerInput,
    db: Session = Depends(get_db),
) -> Customer:
    customer = Customer(**customer_data.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: int,
    customer_data: CustomerInput,
    db: Session = Depends(get_db),
) -> Customer:
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    for field, value in customer_data.model_dump().items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return customer
