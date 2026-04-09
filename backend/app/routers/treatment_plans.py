import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_admin, require_admin_or_doctor
from app.models.treatment_plan import TreatmentPlan, TreatmentPlanItem
from app.models.user import User
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.schemas.treatment_plan import (
    TreatmentPlanCreate,
    TreatmentPlanItemCreate,
    TreatmentPlanItemOut,
    TreatmentPlanItemUpdate,
    TreatmentPlanOut,
    TreatmentPlanSoftDelete,
    TreatmentPlanUpdate,
)
from app.utils.pagination import paginate

router = APIRouter(prefix="/patients/{patient_id}/plans", tags=["Treatment Plans"])


@router.get("", response_model=PaginatedResponse[TreatmentPlanOut])
async def list_plans(
    patient_id: uuid.UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(TreatmentPlan)
        .options(selectinload(TreatmentPlan.items))
        .where(TreatmentPlan.patient_id == patient_id, TreatmentPlan.is_deleted == False)
        .order_by(TreatmentPlan.created_at.desc())
    )
    items, meta = await paginate(db, query, page, per_page)
    return PaginatedResponse(data=items, pagination=meta)


@router.post("", response_model=SuccessResponse[TreatmentPlanOut], status_code=status.HTTP_201_CREATED)
async def create_plan(
    patient_id: uuid.UUID,
    body: TreatmentPlanCreate,
    current_user: User = Depends(require_admin_or_doctor),
    db: AsyncSession = Depends(get_db),
):
    plan = TreatmentPlan(
        patient_id=patient_id,
        doctor_id=current_user.id,
        title=body.title,
        description=body.description,
    )
    db.add(plan)
    await db.flush()

    for item_data in body.items:
        item = TreatmentPlanItem(treatment_plan_id=plan.id, **item_data.model_dump())
        db.add(item)

    await db.flush()

    result = await db.execute(
        select(TreatmentPlan).options(selectinload(TreatmentPlan.items)).where(TreatmentPlan.id == plan.id)
    )
    plan = result.scalar_one()
    return SuccessResponse(data=plan, message="Treatment plan created")


@router.get("/{plan_id}", response_model=SuccessResponse[TreatmentPlanOut])
async def get_plan(
    patient_id: uuid.UUID,
    plan_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TreatmentPlan)
        .options(selectinload(TreatmentPlan.items))
        .where(TreatmentPlan.id == plan_id, TreatmentPlan.patient_id == patient_id, TreatmentPlan.is_deleted == False)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return SuccessResponse(data=plan)


@router.put("/{plan_id}", response_model=SuccessResponse[TreatmentPlanOut])
async def update_plan(
    patient_id: uuid.UUID,
    plan_id: uuid.UUID,
    body: TreatmentPlanUpdate,
    _: User = Depends(require_admin_or_doctor),
    db: AsyncSession = Depends(get_db),
):
    plan = await db.get(TreatmentPlan, plan_id)
    if not plan or plan.patient_id != patient_id or plan.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(plan, field, value)
    return SuccessResponse(data=plan)


@router.delete("/{plan_id}", response_model=dict)
async def soft_delete_plan(
    patient_id: uuid.UUID,
    plan_id: uuid.UUID,
    body: TreatmentPlanSoftDelete,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    plan = await db.get(TreatmentPlan, plan_id)
    if not plan or plan.patient_id != patient_id or plan.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    plan.is_deleted = True
    plan.deleted_reason = body.reason
    plan.deleted_by = current_user.id
    plan.deleted_at = datetime.now(timezone.utc)
    return {"success": True}


# ── Plan items ──────────────────────────────────────────────────

@router.post("/{plan_id}/items", response_model=SuccessResponse[TreatmentPlanItemOut], status_code=status.HTTP_201_CREATED)
async def add_item(
    patient_id: uuid.UUID,
    plan_id: uuid.UUID,
    body: TreatmentPlanItemCreate,
    _: User = Depends(require_admin_or_doctor),
    db: AsyncSession = Depends(get_db),
):
    plan = await db.get(TreatmentPlan, plan_id)
    if not plan or plan.patient_id != patient_id or plan.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    item = TreatmentPlanItem(treatment_plan_id=plan_id, **body.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return SuccessResponse(data=item, message="Item added")


@router.put("/{plan_id}/items/{item_id}", response_model=SuccessResponse[TreatmentPlanItemOut])
async def update_item(
    patient_id: uuid.UUID,
    plan_id: uuid.UUID,
    item_id: uuid.UUID,
    body: TreatmentPlanItemUpdate,
    _: User = Depends(require_admin_or_doctor),
    db: AsyncSession = Depends(get_db),
):
    item = await db.get(TreatmentPlanItem, item_id)
    if not item or item.treatment_plan_id != plan_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(item, field, value)
    return SuccessResponse(data=item)


@router.delete("/{plan_id}/items/{item_id}", response_model=dict)
async def delete_item(
    patient_id: uuid.UUID,
    plan_id: uuid.UUID,
    item_id: uuid.UUID,
    _: User = Depends(require_admin_or_doctor),
    db: AsyncSession = Depends(get_db),
):
    item = await db.get(TreatmentPlanItem, item_id)
    if not item or item.treatment_plan_id != plan_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    await db.delete(item)
    return {"success": True}
