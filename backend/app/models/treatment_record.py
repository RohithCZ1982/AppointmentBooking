import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TreatmentRecord(Base):
    __tablename__ = "treatment_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    appointment_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("appointments.id"))
    doctor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    treatment_type_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("treatment_types.id"))
    # Tooth targeting
    tooth_numbers: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    quadrant: Mapped[str | None] = mapped_column(String(10))
    # Clinical content
    notes: Mapped[str | None] = mapped_column(Text)  # rich text HTML
    diagnosis: Mapped[str | None] = mapped_column(Text)
    procedure_performed: Mapped[str | None] = mapped_column(Text)
    medications_prescribed: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    next_followup_recommendation: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        Enum("planned", "in_progress", "completed", "cancelled", name="treatment_record_status"),
        nullable=False,
        default="completed",
    )
    doctor_initials: Mapped[str | None] = mapped_column(String(10))
    # Soft delete
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_reason: Mapped[str | None] = mapped_column(Text)
    deleted_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    patient = relationship("Patient", back_populates="treatment_records")
    appointment = relationship("Appointment", back_populates="treatment_records")
    doctor = relationship("User", foreign_keys=[doctor_id], back_populates="treatment_records")
    treatment_type = relationship("TreatmentType", back_populates="treatment_records")
    images = relationship("PatientImage", back_populates="treatment_record")
