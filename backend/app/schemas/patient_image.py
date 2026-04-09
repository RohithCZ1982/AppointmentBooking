import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

ImageFileType = Literal["jpeg", "png", "dicom", "pdf"]
ImageCategory = Literal["pre_treatment", "during_treatment", "post_treatment", "follow_up", "other"]
ImageType = Literal["periapical", "bitewing", "panoramic", "cbct", "intraoral_photo", "document", "other"]


class PatientImageUpload(BaseModel):
    """Metadata sent alongside the multipart file upload."""
    treatment_record_id: uuid.UUID | None = None
    image_category: ImageCategory = "other"
    image_type: ImageType = "other"
    tooth_numbers: list[int] = []
    description: str | None = None


class PatientImageUpdate(BaseModel):
    image_category: ImageCategory | None = None
    image_type: ImageType | None = None
    tooth_numbers: list[int] | None = None
    description: str | None = None
    treatment_record_id: uuid.UUID | None = None


class PatientImageSoftDelete(BaseModel):
    reason: str


class PatientImageOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    patient_id: uuid.UUID
    treatment_record_id: uuid.UUID | None
    file_name: str
    file_type: ImageFileType
    file_size_bytes: int | None
    image_category: ImageCategory
    image_type: ImageType
    tooth_numbers: list
    description: str | None
    image_metadata: dict
    uploaded_by: uuid.UUID
    created_at: datetime


class SignedUrlResponse(BaseModel):
    url: str
    expires_in: int  # seconds
