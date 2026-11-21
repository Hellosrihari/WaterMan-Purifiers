import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    test_session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        with test_session() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def register_owner(client: TestClient) -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "owner@example.com", "password": "secure-pass-123"},
    )
    assert response.status_code == 201
    return response.json()


def login_headers(client: TestClient, email: str, password: str) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_only_first_registration_can_create_owner(client: TestClient) -> None:
    assert client.get("/api/v1/auth/setup-status").json() == {
        "owner_setup_required": True
    }

    owner = register_owner(client)
    assert owner["email"] == "owner@example.com"
    assert owner["role"] == "owner"
    assert "hashed_password" not in owner
    assert client.get("/api/v1/auth/setup-status").json() == {
        "owner_setup_required": False
    }

    second_registration = client.post(
        "/api/v1/auth/register",
        json={"email": "another@example.com", "password": "secure-pass-123"},
    )
    assert second_registration.status_code == 403

    headers = login_headers(client, owner["email"], "secure-pass-123")
    me = client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200
    claims = jwt.decode(
        headers["Authorization"].removeprefix("Bearer "),
        settings.jwt_secret_key,
        algorithms=["HS256"],
    )
    assert claims["sub"] == str(owner["id"])


def test_shop_records_can_be_added_and_edited_by_staff(client: TestClient) -> None:
    register_owner(client)
    owner_headers = login_headers(client, "owner@example.com", "secure-pass-123")

    customer = client.post(
        "/api/v1/customers",
        headers=owner_headers,
        json={
            "name": "  Alex Waterman ",
            "phone": "555-0123",
            "email": "ALEX@example.com",
            "address": "4 Main Street",
        },
    )
    assert customer.status_code == 201
    assert customer.json()["name"] == "Alex Waterman"
    assert customer.json()["email"] == "alex@example.com"

    item = client.post(
        "/api/v1/inventory",
        headers=owner_headers,
        json={
            "name": "Water filter",
            "sku": "filter-01",
            "category": "Filters",
            "quantity": 2,
            "purchase_cost": "25.50",
            "selling_price": "40.00",
            "low_stock_threshold": 3,
        },
    )
    assert item.status_code == 201
    assert item.json()["sku"] == "FILTER-01"

    staff = client.post(
        "/api/v1/staff",
        headers=owner_headers,
        json={
            "name": "Sam Staff",
            "phone": "555-0199",
            "email": "sam@example.com",
            "job_title": "Shop assistant",
            "start_date": "2025-03-01",
            "is_active": True,
            "password": "staff-pass-123",
        },
    )
    assert staff.status_code == 201
    assert staff.json()["has_login"] is True
    assert "password" not in staff.json()

    staff_login = client.post(
        "/api/v1/auth/login",
        json={"email": "sam@example.com", "password": "staff-pass-123"},
    )
    assert staff_login.status_code == 200
    assert staff_login.json()["user"]["job_title"] == "Shop assistant"
    staff_headers = {
        "Authorization": f"Bearer {staff_login.json()['access_token']}"
    }
    staff_me = client.get("/api/v1/auth/me", headers=staff_headers)
    assert staff_me.json()["job_title"] == "Shop assistant"
    updated_customer = client.put(
        f"/api/v1/customers/{customer.json()['id']}",
        headers=staff_headers,
        json={
            "name": "Alex Waterman",
            "phone": "555-0124",
            "email": "alex@example.com",
            "address": "5 Main Street",
        },
    )
    assert updated_customer.status_code == 200
    assert updated_customer.json()["phone"] == "555-0124"

    updated_item = client.put(
        f"/api/v1/inventory/{item.json()['id']}",
        headers=staff_headers,
        json={
            "name": "Water filter",
            "sku": "FILTER-01",
            "category": "Filters",
            "quantity": 9,
            "purchase_cost": "25.50",
            "selling_price": "40.00",
            "low_stock_threshold": 3,
        },
    )
    assert updated_item.status_code == 200
    assert updated_item.json()["quantity"] == 9

    summary = client.get("/api/v1/dashboard/summary", headers=staff_headers)
    assert summary.json() == {
        "inventory_items": 1,
        "customers": 1,
        "staff": 1,
        "low_stock_items": 0,
    }

    assert client.get("/api/v1/staff", headers=staff_headers).status_code == 403
    forbidden_staff = client.post(
        "/api/v1/staff",
        headers=staff_headers,
        json={
            "name": "Another Staff",
            "phone": "555-0101",
            "email": "another@example.com",
            "job_title": "Assistant",
            "password": "another-pass-123",
        },
    )
    assert forbidden_staff.status_code == 403

    owner_edit = client.put(
        f"/api/v1/staff/{staff.json()['id']}",
        headers=owner_headers,
        json={
            "name": "Sam Staff",
            "phone": "555-0199",
            "email": "sam@example.com",
            "job_title": "Senior shop assistant",
            "start_date": "2025-03-01",
            "is_active": True,
        },
    )
    assert owner_edit.status_code == 200
    assert owner_edit.json()["job_title"] == "Senior shop assistant"


def test_inactive_staff_cannot_sign_in_or_use_existing_token(
    client: TestClient,
) -> None:
    register_owner(client)
    owner_headers = login_headers(client, "owner@example.com", "secure-pass-123")
    staff = client.post(
        "/api/v1/staff",
        headers=owner_headers,
        json={
            "name": "Inactive Staff",
            "phone": "555-0188",
            "email": "inactive@example.com",
            "job_title": "Assistant",
            "password": "staff-pass-123",
        },
    ).json()
    staff_headers = login_headers(client, "inactive@example.com", "staff-pass-123")

    response = client.put(
        f"/api/v1/staff/{staff['id']}",
        headers=owner_headers,
        json={
            "name": "Inactive Staff",
            "phone": "555-0188",
            "email": "inactive@example.com",
            "job_title": "Assistant",
            "is_active": False,
        },
    )
    assert response.status_code == 200
    assert client.get("/api/v1/customers", headers=staff_headers).status_code == 403
    assert (
        client.post(
            "/api/v1/auth/login",
            json={
                "email": "inactive@example.com",
                "password": "staff-pass-123",
            },
        ).status_code
        == 403
    )
