import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_validator


UserRole = Literal["admin", "doctor", "receptionist"]


class UserCreate(BaseModel):
    name: str
    mobile: str
    pin: str
    role: UserRole = "receptionist"

    @field_validator("pin")
    @classmethod
    def pin_must_be_4_digits(cls, v: str) -> str:
        if not v.isdigit() or len(v) != 4:
            raise ValueError("PIN must be exactly 4 digits")
        return v

    @field_validator("mobile")
    @classmethod
    def mobile_digits_only(cls, v: str) -> str:
        if not v.replace("+", "").replace("-", "").isdigit():
            raise ValueError("Mobile must contain only digits")
        return v


class UserUpdate(BaseModel):
    name: str | None = None
    mobile: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None


class UserOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    mobile: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime
