from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class InventoryItem(Base):
    __tablename__ = "inventory_items"
    __table_args__ = (
        CheckConstraint("quantity >= 0", name="ck_inventory_quantity_nonnegative"),
        CheckConstraint(
            "purchase_cost >= 0", name="ck_inventory_purchase_cost_nonnegative"
        ),
        CheckConstraint(
            "selling_price >= 0", name="ck_inventory_selling_price_nonnegative"
        ),
        CheckConstraint(
            "low_stock_threshold >= 0",
            name="ck_inventory_low_stock_threshold_nonnegative",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    sku: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    quantity: Mapped[int] = mapped_column(nullable=False)
    purchase_cost: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    selling_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    low_stock_threshold: Mapped[int] = mapped_column(
        default=0, server_default="0", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
