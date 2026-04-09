import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.appointment import Appointment
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentOut, AppointmentStatusUpdate, AppointmentUpdate
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.services import audit_service, whatsapp_service
from app.utils.pagination import paginate


def _options():
    return (
        selectinload(Appointment.patient),
        selectinload(Appointment.doctor),
        selectinload(Appointment.treatment_type),
    )


def _serialize(appt: Appointment) -> dict:
    """Return appointment dict with nested patient/doctor/treatment_type names."""
    d = {
        "id": appt.id,
        "patient_id": appt.patient_id,
        "doctor_id": appt.doctor_id,
        "treatment_type_id": appt.treatment_type_id,
        "appointment_date": appt.appointment_date,
        "appointment_time": appt.appointment_time,
        "duration_minutes": appt.duration_minutes,
        "status": appt.status,
        "notes": appt.notes,
        "whatsapp_confirmation_sent": appt.whatsapp_confirmation_sent,
        "whatsapp_reminder_sent": appt.whatsapp_reminder_sent,
        "created_by": appt.created_by,
        "created_at": appt.created_at,
        "updated_at": appt.updated_at,
        # Nested names for display
        "patient": {"id": appt.patient.id, "name": appt.patient.name, "mobile": appt.patient.mobile} if appt.patient else None,
        "doctor": {"id": appt.doctor.id, "name": appt.doctor.name} if appt.doctor else None,
        "treatment_type": {"id": appt.treatment_type.id, "name": appt.treatment_type.name} if appt.treatment_type else None,
    }
    return d


def _serialize_many(items: list) -> list:
    return [_serialize(a) for a in items]


router = APIRouter(prefix="/appointments", tags=["Appointments"])


@router.get("")
async def list_appointments(
    appt_date: date | None = Query(None, alias="date"),
    doctor_id: uuid.UUID | None = None,
    appt_status: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Appointment)
        .options(*_options())
        .where(Appointment.is_deleted == False)
    )
    if appt_date:
        query = query.where(Appointment.appointment_date == appt_date)
    if doctor_id:
        query = query.where(Appointment.doctor_id == doctor_id)
    if appt_status:
        query = query.where(Appointment.status == appt_status)
    if current_user.role == "doctor":
        query = query.where(Appointment.doctor_id == current_user.id)
    query = query.order_by(Appointment.appointment_date, Appointment.appointment_time)
    items, meta = await paginate(db, query, page, per_page)
    return {"success": True, "data": _serialize_many(items), "pagination": meta.model_dump()}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_appointment(
    body: AppointmentCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    appt = Appointment(**body.model_dump(), created_by=current_user.id)
    db.add(appt)
    await db.flush()

    # Reload with relations
    result = await db.execute(
        select(Appointment).options(*_options()).where(Appointment.id == appt.id)
    )
    appt = result.scalar_one()

    await audit_service.log(
        db,
        user_id=current_user.id,
        action="create",
        entity_type="appointment",
        entity_id=appt.id,
        patient_id=appt.patient_id,
        ip_address=request.client.host if request.client else None,
    )
    return {"success": True, "data": _serialize(appt), "message": "Appointment booked"}


@router.get("/{appt_id}")
async def get_appointment(
    appt_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Appointment).options(*_options()).where(Appointment.id == appt_id)
    )
    appt = result.scalar_one_or_none()
    if not appt or appt.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    return {"success": True, "data": _serialize(appt)}


@router.put("/{appt_id}")
async def update_appointment(
    appt_id: uuid.UUID,
    body: AppointmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    appt = await db.get(Appointment, appt_id)
    if not appt or appt.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(appt, field, value)
    await db.flush()
    result = await db.execute(
        select(Appointment).options(*_options()).where(Appointment.id == appt_id)
    )
    appt = result.scalar_one()
    return {"success": True, "data": _serialize(appt)}


@router.patch("/{appt_id}/status")
async def update_status(
    appt_id: uuid.UUID,
    body: AppointmentStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    appt = await db.get(Appointment, appt_id)
    if not appt or appt.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    appt.status = body.status
    await db.flush()
    result = await db.execute(
        select(Appointment).options(*_options()).where(Appointment.id == appt_id)
    )
    appt = result.scalar_one()
    return {"success": True, "data": _serialize(appt)}


@router.delete("/{appt_id}")
async def cancel_appointment(
    appt_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    appt = await db.get(Appointment, appt_id)
    if not appt or appt.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    appt.is_deleted = True
    appt.deleted_by = current_user.id
    appt.deleted_at = datetime.now(timezone.utc)
    appt.status = "cancelled"
    return {"success": True}


@router.post("/{appt_id}/whatsapp-confirm")
async def send_whatsapp_confirmation(
    appt_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Appointment).options(*_options()).where(Appointment.id == appt_id)
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    appt_dt = f"{appt.appointment_date} {appt.appointment_time}"
    sent = await whatsapp_service.send_confirmation(
        appt.patient.mobile, appt.patient.name, appt_dt, appt.doctor.name
    )
    if sent:
        appt.whatsapp_confirmation_sent = True
        appt.whatsapp_confirmation_sent_at = datetime.now(timezone.utc)
    return {"success": sent}
