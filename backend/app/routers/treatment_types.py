import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.treatment_type import TreatmentType
from app.models.user import User
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.utils.pagination import paginate

router = APIRouter(prefix="/treatment-types", tags=["Treatment Types"])


class TreatmentTypeCreate(BaseModel):
    name: str
    description: str | None = None
    default_duration_minutes: int = 30
    color: str | None = None


class TreatmentTypeOut(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    name: str
    description: str | None
    default_duration_minutes: int
    color: str | None
    is_active: bool


@router.get("", response_model=list[TreatmentTypeOut])
async def list_treatment_types(
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TreatmentType).where(TreatmentType.is_active == True).order_by(TreatmentType.name))
    return result.scalars().all()


@router.post("", response_model=SuccessResponse[TreatmentTypeOut], status_code=status.HTTP_201_CREATED)
async def create_treatment_type(
    body: TreatmentTypeCreate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    tt = TreatmentType(**body.model_dump())
    db.add(tt)
    await db.flush()
    await db.refresh(tt)
    return SuccessResponse(data=tt, message="Treatment type created")


@router.get("/{tt_id}", response_model=SuccessResponse[TreatmentTypeOut])
async def get_treatment_type(tt_id: uuid.UUID, _: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    tt = await db.get(TreatmentType, tt_id)
    if not tt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return SuccessResponse(data=tt)


@router.put("/{tt_id}", response_model=SuccessResponse[TreatmentTypeOut])
async def update_treatment_type(
    tt_id: uuid.UUID,
    body: TreatmentTypeCreate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    tt = await db.get(TreatmentType, tt_id)
    if not tt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(tt, field, value)
    return SuccessResponse(data=tt)


@router.delete("/{tt_id}", response_model=dict)
async def delete_treatment_type(tt_id: uuid.UUID, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    tt = await db.get(TreatmentType, tt_id)
    if not tt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    tt.is_active = False
    return {"success": True}
