import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.utils.pagination import paginate
from pydantic import BaseModel
from datetime import datetime


class AuditLogOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID | None
    action: str
    entity_type: str
    entity_id: uuid.UUID | None
    patient_id: uuid.UUID | None
    changes: dict
    ip_address: str | None
    timestamp: datetime


router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=PaginatedResponse[AuditLogOut])
async def list_audit_logs(
    user_id: uuid.UUID | None = None,
    entity_type: str | None = None,
    from_date: datetime | None = Query(None, alias="from"),
    to_date: datetime | None = Query(None, alias="to"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(AuditLog).order_by(AuditLog.timestamp.desc())
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if from_date:
        query = query.where(AuditLog.timestamp >= from_date)
    if to_date:
        query = query.where(AuditLog.timestamp <= to_date)
    items, meta = await paginate(db, query, page, per_page)
    return PaginatedResponse(data=items, pagination=meta)


@router.get("/patient/{patient_id}", response_model=PaginatedResponse[AuditLogOut])
async def patient_audit_log(
    patient_id: uuid.UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(AuditLog)
        .where(AuditLog.patient_id == patient_id)
        .order_by(AuditLog.timestamp.desc())
    )
    items, meta = await paginate(db, query, page, per_page)
    return PaginatedResponse(data=items, pagination=meta)
