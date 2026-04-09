import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_admin, require_admin_or_doctor
from app.models.dental_chart import DentalChart
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.schemas.dental_chart import VALID_TEETH, DentalChartOut, ToothOut, ToothUpdate

router = APIRouter(prefix="/patients/{patient_id}/dental-chart", tags=["Dental Chart"])


@router.get("", response_model=SuccessResponse[DentalChartOut])
async def get_chart(
    patient_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DentalChart).where(DentalChart.patient_id == patient_id, DentalChart.is_deleted == False)
    )
    teeth = result.scalars().all()
    chart = DentalChartOut(
        patient_id=patient_id,
        teeth={t.tooth_number: ToothOut.model_validate(t) for t in teeth},
    )
    return SuccessResponse(data=chart)


@router.put("/{tooth_number}", response_model=SuccessResponse[ToothOut])
async def update_tooth(
    patient_id: uuid.UUID,
    tooth_number: int,
    body: ToothUpdate,
    current_user: User = Depends(require_admin_or_doctor),
    db: AsyncSession = Depends(get_db),
):
    if tooth_number not in VALID_TEETH:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid FDI tooth number: {tooth_number}")

    result = await db.execute(
        select(DentalChart).where(
            DentalChart.patient_id == patient_id,
            DentalChart.tooth_number == tooth_number,
            DentalChart.is_deleted == False,
        )
    )
    tooth = result.scalar_one_or_none()

    if tooth:
        tooth.conditions = body.conditions
        tooth.surfaces = body.surfaces
        tooth.notes = body.notes
        tooth.recorded_by = current_user.id
    else:
        tooth = DentalChart(
            patient_id=patient_id,
            tooth_number=tooth_number,
            conditions=body.conditions,
            surfaces=body.surfaces,
            notes=body.notes,
            recorded_by=current_user.id,
        )
        db.add(tooth)
        await db.flush()
        await db.refresh(tooth)

    return SuccessResponse(data=ToothOut.model_validate(tooth))


@router.delete("/{tooth_number}", response_model=dict)
async def reset_tooth(
    patient_id: uuid.UUID,
    tooth_number: int,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DentalChart).where(
            DentalChart.patient_id == patient_id, DentalChart.tooth_number == tooth_number
        )
    )
    tooth = result.scalar_one_or_none()
    if tooth:
        tooth.is_deleted = True
    return {"success": True}
