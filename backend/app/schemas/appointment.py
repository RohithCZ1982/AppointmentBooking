import uuid
from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel

AppointmentStatus = Literal["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"]


class AppointmentCreate(BaseModel):
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    treatment_type_id: uuid.UUID | None = None
    appointment_date: date
    appointment_time: time
    duration_minutes: int = 30
    notes: str | None = None


class AppointmentUpdate(BaseModel):
    doctor_id: uuid.UUID | None = None
    treatment_type_id: uuid.UUID | None = None
    appointment_date: date | None = None
    appointment_time: time | None = None
    duration_minutes: int | None = None
    notes: str | None = None


class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatus


class AppointmentOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    treatment_type_id: uuid.UUID | None
    appointment_date: date
    appointment_time: time
    duration_minutes: int
    status: AppointmentStatus
    notes: str | None
    whatsapp_confirmation_sent: bool
    whatsapp_reminder_sent: bool
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
