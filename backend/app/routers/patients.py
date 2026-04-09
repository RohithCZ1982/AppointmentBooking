import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_admin_or_doctor
from app.models.patient import Patient
from app.models.user import User
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.schemas.patient import PatientCreate, PatientOut, PatientSummary, PatientUpdate
from app.utils.pagination import paginate

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.get("", response_model=PaginatedResponse[PatientSummary])
async def list_patients(
    q: str | None = Query(None, description="Search by name or mobile"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Patient).where(Patient.is_active == True)
    if q:
        query = query.where(or_(Patient.name.ilike(f"%{q}%"), Patient.mobile.ilike(f"%{q}%")))
    query = query.order_by(Patient.name)
    items, meta = await paginate(db, query, page, per_page)
    return PaginatedResponse(data=items, pagination=meta)


@router.post("", response_model=SuccessResponse[PatientOut], status_code=status.HTTP_201_CREATED)
async def create_patient(
    body: PatientCreate,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Patient).where(Patient.mobile == body.mobile))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Mobile already registered")

    # Auto-generate patient number
    count_result = await db.execute(select(Patient))
    count = len(count_result.scalars().all())
    patient_number = f"PT-{(count + 1):05d}"

    patient = Patient(**body.model_dump(), patient_number=patient_number)
    db.add(patient)
    await db.flush()
    await db.refresh(patient)
    return SuccessResponse(data=patient, message="Patient created")


@router.get("/{patient_id}", response_model=SuccessResponse[PatientOut])
async def get_patient(
    patient_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    patient = await db.get(Patient, patient_id)
    if not patient or not patient.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return SuccessResponse(data=patient)


@router.put("/{patient_id}", response_model=SuccessResponse[PatientOut])
async def update_patient(
    patient_id: uuid.UUID,
    body: PatientUpdate,
    _: User = Depends(require_admin_or_doctor),
    db: AsyncSession = Depends(get_db),
):
    patient = await db.get(Patient, patient_id)
    if not patient or not patient.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(patient, field, value)
    return SuccessResponse(data=patient)
