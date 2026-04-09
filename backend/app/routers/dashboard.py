import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.appointment import Appointment
from app.models.patient import Patient
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class DashboardStats(BaseModel):
    today_appointments: int
    today_completed: int
    today_cancelled: int
    total_patients: int
    upcoming_7_days: int


@router.get("/stats", response_model=DashboardStats)
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()

    base = select(Appointment).where(Appointment.is_deleted == False, Appointment.appointment_date == today)
    if current_user.role == "doctor":
        base = base.where(Appointment.doctor_id == current_user.id)

    total_today = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
    completed = (
        await db.execute(
            select(func.count()).select_from(
                base.where(Appointment.status == "completed").subquery()
            )
        )
    ).scalar_one()
    cancelled = (
        await db.execute(
            select(func.count()).select_from(
                base.where(Appointment.status == "cancelled").subquery()
            )
        )
    ).scalar_one()
    total_patients = (
        await db.execute(select(func.count()).select_from(select(Patient).where(Patient.is_active == True).subquery()))
    ).scalar_one()
    upcoming = (
        await db.execute(
            select(func.count()).select_from(
                select(Appointment)
                .where(
                    Appointment.is_deleted == False,
                    Appointment.appointment_date > today,
                    Appointment.appointment_date <= today + timedelta(days=7),
                    Appointment.status.in_(["scheduled", "confirmed"]),
                )
                .subquery()
            )
        )
    ).scalar_one()

    return DashboardStats(
        today_appointments=total_today,
        today_completed=completed,
        today_cancelled=cancelled,
        total_patients=total_patients,
        upcoming_7_days=upcoming,
    )


@router.get("/appointments/today")
async def today_appointments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy.orm import selectinload

    today = date.today()
    query = (
        select(Appointment)
        .options(selectinload(Appointment.patient), selectinload(Appointment.doctor), selectinload(Appointment.treatment_type))
        .where(Appointment.is_deleted == False, Appointment.appointment_date == today)
        .order_by(Appointment.appointment_time)
    )
    if current_user.role == "doctor":
        query = query.where(Appointment.doctor_id == current_user.id)

    result = await db.execute(query)
    appointments = result.scalars().all()
    return {"success": True, "data": appointments}
