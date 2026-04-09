import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel

TreatmentPlanStatus = Literal["proposed", "approved", "in_progress", "completed", "cancelled"]
PlanItemStatus = Literal["planned", "in_progress", "completed", "cancelled"]


class TreatmentPlanItemCreate(BaseModel):
    treatment_type_id: uuid.UUID | None = None
    tooth_numbers: list[int] = []
    description: str | None = None
    phase_number: int = 1
    sequence_order: int = 1
    estimated_cost: Decimal | None = None
    estimated_duration_minutes: int | None = None


class TreatmentPlanItemUpdate(TreatmentPlanItemCreate):
    status: PlanItemStatus | None = None
    appointment_id: uuid.UUID | None = None


class TreatmentPlanItemOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    treatment_plan_id: uuid.UUID
    treatment_type_id: uuid.UUID | None
    tooth_numbers: list
    description: str | None
    phase_number: int
    sequence_order: int
    estimated_cost: Decimal | None
    estimated_duration_minutes: int | None
    status: PlanItemStatus
    appointment_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class TreatmentPlanCreate(BaseModel):
    title: str
    description: str | None = None
    items: list[TreatmentPlanItemCreate] = []


class TreatmentPlanUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: TreatmentPlanStatus | None = None
    patient_consent: bool | None = None


class TreatmentPlanSoftDelete(BaseModel):
    reason: str


class TreatmentPlanOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    title: str
    description: str | None
    status: TreatmentPlanStatus
    patient_consent: bool
    consent_date: datetime | None
    items: list[TreatmentPlanItemOut]
    created_at: datetime
    updated_at: datetime
