from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class CustomerInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=1, max_length=30)
    email: EmailStr | None = Field(default=None, max_length=320)
    address: str | None = Field(default=None, max_length=500)

    @field_validator("name", "phone", "address", mode="before")
    @classmethod
    def strip_text(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip() or None
        return value

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower() or None
        return value


class CustomerResponse(CustomerInput):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InventoryInput(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    sku: str = Field(min_length=1, max_length=80)
    category: str = Field(min_length=1, max_length=100)
    quantity: int = Field(ge=0)
    purchase_cost: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    selling_price: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    low_stock_threshold: int = Field(ge=0)

    @field_validator("name", "category", mode="before")
    @classmethod
    def strip_text(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("sku", mode="before")
    @classmethod
    def normalize_sku(cls, value: object) -> object:
        return value.strip().upper() if isinstance(value, str) else value


class InventoryResponse(InventoryInput):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StaffFields(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=1, max_length=30)
    email: EmailStr = Field(max_length=320)
    job_title: str = Field(min_length=1, max_length=100)
    start_date: date | None = None
    is_active: bool = True

    @field_validator("name", "phone", "job_title", mode="before")
    @classmethod
    def strip_text(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value


class StaffCreate(StaffFields):
    password: str = Field(min_length=8, max_length=128)


class StaffUpdate(StaffFields):
    password: str | None = Field(default=None, min_length=8, max_length=128)


class StaffResponse(StaffFields):
    id: int
    has_login: bool
    created_at: datetime
    updated_at: datetime


class DashboardSummary(BaseModel):
    inventory_items: int
    customers: int
    staff: int
    low_stock_items: int
