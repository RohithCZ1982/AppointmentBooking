import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user, require_admin, require_admin_or_doctor
from app.models.patient_image import PatientImage
from app.models.user import User
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.schemas.patient_image import (
    ImageCategory,
    ImageType,
    PatientImageOut,
    PatientImageSoftDelete,
    PatientImageUpdate,
    SignedUrlResponse,
)
from app.services import audit_service, storage_service
from app.utils.pagination import paginate

router = APIRouter(prefix="/patients/{patient_id}/images", tags=["Patient Images"])

settings = get_settings()

MIME_TO_FILE_TYPE = {
    "image/jpeg": "jpeg",
    "image/jpg": "jpeg",
    "image/png": "png",
    "application/pdf": "pdf",
    "application/dicom": "dicom",
}


@router.get("", response_model=PaginatedResponse[PatientImageOut])
async def list_images(
    patient_id: uuid.UUID,
    page: int = 1,
    per_page: int = 20,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(PatientImage)
        .where(PatientImage.patient_id == patient_id, PatientImage.is_deleted == False)
        .order_by(PatientImage.created_at.desc())
    )
    items, meta = await paginate(db, query, page, per_page)
    return PaginatedResponse(data=items, pagination=meta)


@router.post("", response_model=SuccessResponse[PatientImageOut], status_code=status.HTTP_201_CREATED)
async def upload_image(
    patient_id: uuid.UUID,
    file: UploadFile = File(...),
    treatment_record_id: uuid.UUID | None = Form(None),
    image_category: ImageCategory = Form("other"),
    image_type: ImageType = Form("other"),
    tooth_numbers: str = Form("[]"),  # JSON array string
    description: str | None = Form(None),
    request: Request = None,
    current_user: User = Depends(require_admin_or_doctor),
    db: AsyncSession = Depends(get_db),
):
    import json

    # Validate file size
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    contents = await file.read()
    if len(contents) > max_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large")

    file_type = MIME_TO_FILE_TYPE.get(file.content_type)
    if not file_type:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type")

    object_key = storage_service.build_object_key(patient_id, file.filename)
    storage_service.upload_file(contents, object_key, file.content_type)

    parsed_teeth = json.loads(tooth_numbers) if tooth_numbers else []

    image = PatientImage(
        patient_id=patient_id,
        treatment_record_id=treatment_record_id,
        file_url=object_key,
        file_name=file.filename,
        file_type=file_type,
        file_size_bytes=len(contents),
        image_category=image_category,
        image_type=image_type,
        tooth_numbers=parsed_teeth,
        description=description,
        uploaded_by=current_user.id,
    )
    db.add(image)
    await db.flush()
    await db.refresh(image)

    await audit_service.log(
        db,
        user_id=current_user.id,
        action="upload",
        entity_type="patient_image",
        entity_id=image.id,
        patient_id=patient_id,
        ip_address=request.client.host if request and request.client else None,
    )
    return SuccessResponse(data=image, message="Image uploaded")


@router.get("/{image_id}", response_model=SuccessResponse[PatientImageOut])
async def get_image_metadata(
    patient_id: uuid.UUID,
    image_id: uuid.UUID,
    _: User = Depends(require_admin_or_doctor),
    db: AsyncSession = Depends(get_db),
):
    img = await db.get(PatientImage, image_id)
    if not img or img.patient_id != patient_id or img.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    return SuccessResponse(data=img)


@router.get("/{image_id}/url", response_model=SuccessResponse[SignedUrlResponse])
async def get_signed_url(
    patient_id: uuid.UUID,
    image_id: uuid.UUID,
    current_user: User = Depends(require_admin_or_doctor),
    db: AsyncSession = Depends(get_db),
):
    img = await db.get(PatientImage, image_id)
    if not img or img.patient_id != patient_id or img.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

    signed_url = storage_service.get_presigned_url(img.file_url, expires_in=900)

    await audit_service.log(
        db,
        user_id=current_user.id,
        action="download",
        entity_type="patient_image",
        entity_id=img.id,
        patient_id=patient_id,
    )
    return SuccessResponse(data=SignedUrlResponse(url=signed_url, expires_in=900))


@router.patch("/{image_id}", response_model=SuccessResponse[PatientImageOut])
async def update_image_metadata(
    patient_id: uuid.UUID,
    image_id: uuid.UUID,
    body: PatientImageUpdate,
    _: User = Depends(require_admin_or_doctor),
    db: AsyncSession = Depends(get_db),
):
    img = await db.get(PatientImage, image_id)
    if not img or img.patient_id != patient_id or img.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(img, field, value)
    return SuccessResponse(data=img)


@router.delete("/{image_id}", response_model=dict)
async def soft_delete_image(
    patient_id: uuid.UUID,
    image_id: uuid.UUID,
    body: PatientImageSoftDelete,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    img = await db.get(PatientImage, image_id)
    if not img or img.patient_id != patient_id or img.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    img.is_deleted = True
    img.deleted_reason = body.reason
    img.deleted_by = current_user.id
    img.deleted_at = datetime.now(timezone.utc)
    storage_service.soft_delete_object(img.file_url)
    return {"success": True}
