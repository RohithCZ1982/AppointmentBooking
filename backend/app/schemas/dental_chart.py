import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator

# Valid FDI tooth numbers
VALID_TEETH = set(
    list(range(11, 19)) + list(range(21, 29)) +
    list(range(31, 39)) + list(range(41, 49))
)

ToothCondition = str  # "caries" | "filling" | "crown" | "extraction" | "root_canal" | "bridge" | "implant" | "missing" | "veneer" | "sealant"


class ToothUpdate(BaseModel):
    conditions: list[ToothCondition] = []
    surfaces: dict[str, str | None] = {}  # {mesial, distal, occlusal, buccal, lingual}
    notes: str | None = None

    @field_validator("surfaces")
    @classmethod
    def valid_surfaces(cls, v: dict) -> dict:
        allowed = {"mesial", "distal", "occlusal", "buccal", "lingual"}
        for key in v:
            if key not in allowed:
                raise ValueError(f"Invalid surface: {key}. Allowed: {allowed}")
        return v


class ToothOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    patient_id: uuid.UUID
    tooth_number: int
    conditions: list
    surfaces: dict
    notes: str | None
    recorded_by: uuid.UUID
    updated_at: datetime


class DentalChartOut(BaseModel):
    """Full chart: map of tooth_number → tooth state."""
    patient_id: uuid.UUID
    teeth: dict[int, ToothOut]  # tooth_number → state
