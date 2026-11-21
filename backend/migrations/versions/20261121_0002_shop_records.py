"""Add shop records and owner/staff roles.

Revision ID: 20261121_0002
Revises: 20261121_0001
Create Date: 2026-11-21
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20261121_0002"
down_revision: Union[str, None] = "20261121_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("phone", sa.String(length=30), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("address", sa.String(length=500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_customers_name", "customers", ["name"], unique=False)

    op.create_table(
        "inventory_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("sku", sa.String(length=80), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("purchase_cost", sa.Numeric(12, 2), nullable=False),
        sa.Column("selling_price", sa.Numeric(12, 2), nullable=False),
        sa.Column(
            "low_stock_threshold",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "quantity >= 0",
            name="ck_inventory_quantity_nonnegative",
        ),
        sa.CheckConstraint(
            "purchase_cost >= 0",
            name="ck_inventory_purchase_cost_nonnegative",
        ),
        sa.CheckConstraint(
            "selling_price >= 0",
            name="ck_inventory_selling_price_nonnegative",
        ),
        sa.CheckConstraint(
            "low_stock_threshold >= 0",
            name="ck_inventory_low_stock_threshold_nonnegative",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sku"),
    )
    op.create_index("ix_inventory_items_name", "inventory_items", ["name"])
    op.create_index("ix_inventory_items_sku", "inventory_items", ["sku"])

    op.create_table(
        "staff",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("phone", sa.String(length=30), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("job_title", sa.String(length=100), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.true(),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_staff_name", "staff", ["name"])

    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.String(length=20),
            server_default="owner",
            nullable=False,
        ),
    )
    op.create_check_constraint(
        "ck_users_role",
        "users",
        "role IN ('owner', 'staff')",
    )
    op.add_column("users", sa.Column("staff_id", sa.Integer(), nullable=True))
    op.create_unique_constraint("uq_users_staff_id", "users", ["staff_id"])
    op.create_foreign_key(
        "fk_users_staff_id_staff",
        "users",
        "staff",
        ["staff_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "uq_users_single_owner",
        "users",
        ["role"],
        unique=True,
        postgresql_where=sa.text("role = 'owner'"),
    )


def downgrade() -> None:
    op.drop_index("uq_users_single_owner", table_name="users")
    op.drop_constraint("fk_users_staff_id_staff", "users", type_="foreignkey")
    op.drop_constraint("uq_users_staff_id", "users", type_="unique")
    op.drop_column("users", "staff_id")
    op.drop_constraint("ck_users_role", "users", type_="check")
    op.drop_column("users", "role")

    op.drop_index("ix_staff_name", table_name="staff")
    op.drop_table("staff")

    op.drop_index("ix_inventory_items_sku", table_name="inventory_items")
    op.drop_index("ix_inventory_items_name", table_name="inventory_items")
    op.drop_table("inventory_items")

    op.drop_index("ix_customers_name", table_name="customers")
    op.drop_table("customers")
