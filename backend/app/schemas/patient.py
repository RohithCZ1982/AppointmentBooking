import uuid
from datetime import date, datetime

from pydantic import BaseModel, EmailStr


class PatientCreate(BaseModel):
    name: str
    mobile: str
    email: EmailStr | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    address: str | None = None
    blood_group: str | None = None
    allergies: str | None = None
    current_medications: str | None = None
    medical_history: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_mobile: str | None = None


class PatientUpdate(PatientCreate):
    name: str | None = None
    mobile: str | None = None


class PatientOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    patient_number: str | None
    name: str
    mobile: str
    email: str | None
    date_of_birth: date | None
    gender: str | None
    address: str | None
    blood_group: str | None
    allergies: str | None
    current_medications: str | None
    medical_history: str | None
    emergency_contact_name: str | None
    emergency_contact_mobile: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class PatientSummary(BaseModel):
    """Lightweight representation for lists/search results."""
    model_config = {"from_attributes": True}

    id: uuid.UUID
    patient_number: str | None
    name: str
    mobile: str
    date_of_birth: date | None
    gender: str | None
