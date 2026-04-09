import uuid
from datetime import date, datetime, time

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, Text, Time, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    doctor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    treatment_type_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("treatment_types.id"))
    appointment_date: Mapped[date] = mapped_column(Date, nullable=False)
    appointment_time: Mapped[time] = mapped_column(Time, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    status: Mapped[str] = mapped_column(
        Enum("scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show", name="appointment_status"),
        nullable=False,
        default="scheduled",
    )
    notes: Mapped[str | None] = mapped_column(Text)
    # WhatsApp
    whatsapp_confirmation_sent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    whatsapp_confirmation_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    whatsapp_reminder_sent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    whatsapp_reminder_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Audit
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deleted_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("User", foreign_keys=[doctor_id], back_populates="appointments_as_doctor")
    treatment_type = relationship("TreatmentType", back_populates="appointments")
    treatment_records = relationship("TreatmentRecord", back_populates="appointment")
