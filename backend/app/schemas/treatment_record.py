import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

TreatmentRecordStatus = Literal["planned", "in_progress", "completed", "cancelled"]


class MedicationItem(BaseModel):
    name: str
    dosage: str | None = None
    duration: str | None = None


class TreatmentRecordCreate(BaseModel):
    appointment_id: uuid.UUID | None = None
    treatment_type_id: uuid.UUID | None = None
    tooth_numbers: list[int] = []
    quadrant: str | None = None
    notes: str | None = None  # HTML from rich text editor
    diagnosis: str | None = None
    procedure_performed: str | None = None
    medications_prescribed: list[MedicationItem] = []
    next_followup_recommendation: str | None = None
    status: TreatmentRecordStatus = "completed"
    doctor_initials: str | None = None


class TreatmentRecordUpdate(TreatmentRecordCreate):
    pass


class TreatmentRecordSoftDelete(BaseModel):
    reason: str  # mandatory for compliance


class TreatmentRecordOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    patient_id: uuid.UUID
    appointment_id: uuid.UUID | None
    doctor_id: uuid.UUID
    treatment_type_id: uuid.UUID | None
    tooth_numbers: list
    quadrant: str | None
    notes: str | None
    diagnosis: str | None
    procedure_performed: str | None
    medications_prescribed: list
    next_followup_recommendation: str | None
    status: TreatmentRecordStatus
    doctor_initials: str | None
    created_at: datetime
    updated_at: datetime
