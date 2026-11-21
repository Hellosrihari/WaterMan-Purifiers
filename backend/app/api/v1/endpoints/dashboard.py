from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models import Customer, InventoryItem, Staff
from app.schemas.shop import DashboardSummary

router = APIRouter(
    prefix="/dashboard",
    dependencies=[Depends(get_current_user)],
)


def count_records(db: Session, statement) -> int:
    return db.scalar(statement) or 0


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(
    db: Session = Depends(get_db),
) -> DashboardSummary:
    return DashboardSummary(
        inventory_items=count_records(
            db, select(func.count()).select_from(InventoryItem)
        ),
        customers=count_records(db, select(func.count()).select_from(Customer)),
        staff=count_records(db, select(func.count()).select_from(Staff)),
        low_stock_items=count_records(
            db,
            select(func.count())
            .select_from(InventoryItem)
            .where(InventoryItem.quantity <= InventoryItem.low_stock_threshold),
        ),
    )
