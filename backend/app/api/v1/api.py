from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    customers,
    dashboard,
    health,
    inventory,
    staff,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, tags=["authentication"])
api_router.include_router(dashboard.router, tags=["dashboard"])
api_router.include_router(customers.router, tags=["customers"])
api_router.include_router(inventory.router, tags=["inventory"])
api_router.include_router(staff.router, tags=["staff"])
