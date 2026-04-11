import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin, get_current_user
from app.models.user import User
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.utils.pagination import paginate
from app.utils.security import hash_pin

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=PaginatedResponse[UserOut])
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(User).order_by(User.created_at.desc())
    items, meta = await paginate(db, query, page, per_page)
    return PaginatedResponse(data=items, pagination=meta)


@router.post("", response_model=SuccessResponse[UserOut], status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(User).where(User.mobile == body.mobile))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Mobile already registered")

    user = User(name=body.name, mobile=body.mobile, pin_hash=hash_pin(body.pin), role=body.role)
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return SuccessResponse(data=user, message="User created")


@router.get("/{user_id}", response_model=SuccessResponse[UserOut])
async def get_user(user_id: uuid.UUID, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return SuccessResponse(data=user)


@router.put("/{user_id}", response_model=SuccessResponse[UserOut])
async def update_user(
    user_id: uuid.UUID,
    body: UserUpdate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    updates = body.model_dump(exclude_none=True)
    if "pin" in updates:
        user.pin_hash = hash_pin(updates.pop("pin"))
    for field, value in updates.items():
        setattr(user, field, value)
    return SuccessResponse(data=user)


@router.patch("/{user_id}/deactivate", response_model=SuccessResponse[UserOut])
async def deactivate_user(user_id: uuid.UUID, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_active = False
    return SuccessResponse(data=user, message="User deactivated")
