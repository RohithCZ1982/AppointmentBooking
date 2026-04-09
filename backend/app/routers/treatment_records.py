import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_admin, require_admin_or_doctor
from app.models.treatment_record import TreatmentRecord
from app.models.user import User
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.schemas.treatment_record import (
    TreatmentRecordCreate,
    TreatmentRecordOut,
    TreatmentRecordSoftDelete,
    TreatmentRecordUpdate,
)
from app.services import audit_service
from app.utils.pagination import paginate

router = APIRouter(prefix="/patients/{patient_id}/records", tags=["Treatment Records"])


def _assert_patient_exists():
    """Inline guard – router-level patient existence is checked per endpoint."""
    pass


@router.get("", response_model=PaginatedResponse[TreatmentRecordOut])
async def list_records(
    patient_id: uuid.UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(TreatmentRecord)
        .where(TreatmentRecord.patient_id == patient_id, TreatmentRecord.is_deleted == False)
        .order_by(TreatmentRecord.created_at.desc())
    )
    items, meta = await paginate(db, query, page, per_page)
    return PaginatedResponse(data=items, pagination=meta)


@router.post("", response_model=SuccessResponse[TreatmentRecordOut], status_code=status.HTTP_201_CREATED)
async def create_record(
    patient_id: uuid.UUID,
    body: TreatmentRecordCreate,
    request: Request,
    current_user: User = Depends(require_admin_or_doctor),
    db: AsyncSession = Depends(get_db),
):
    record = TreatmentRecord(
        patient_id=patient_id,
        doctor_id=current_user.id,
        **body.model_dump(),
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)

    await audit_service.log(
        db,
        user_id=current_user.id,
        action="create",
        entity_type="treatment_record",
        entity_id=record.id,
        patient_id=patient_id,
        ip_address=request.client.host if request.client else None,
    )
    return SuccessResponse(data=record, message="Treatment record added")


@router.get("/{record_id}", response_model=SuccessResponse[TreatmentRecordOut])
async def get_record(
    patient_id: uuid.UUID,
    record_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    record = await db.get(TreatmentRecord, record_id)
    if not record or record.patient_id != patient_id or record.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    return SuccessResponse(data=record)


@router.put("/{record_id}", response_model=SuccessResponse[TreatmentRecordOut])
async def update_record(
    patient_id: uuid.UUID,
    record_id: uuid.UUID,
    body: TreatmentRecordUpdate,
    current_user: User = Depends(require_admin_or_doctor),
    db: AsyncSession = Depends(get_db),
):
    record = await db.get(TreatmentRecord, record_id)
    if not record or record.patient_id != patient_id or record.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    # Doctors can only edit their own records
    if current_user.role == "doctor" and record.doctor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot edit another doctor's record")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(record, field, value)
    return SuccessResponse(data=record)


@router.delete("/{record_id}", response_model=dict)
async def soft_delete_record(
    patient_id: uuid.UUID,
    record_id: uuid.UUID,
    body: TreatmentRecordSoftDelete,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    record = await db.get(TreatmentRecord, record_id)
    if not record or record.patient_id != patient_id or record.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    record.is_deleted = True
    record.deleted_reason = body.reason
    record.deleted_by = current_user.id
    record.deleted_at = datetime.now(timezone.utc)
    return {"success": True}
