import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    mobile: Mapped[str] = mapped_column(String(15), unique=True, nullable=False)
    pin_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        Enum("admin", "doctor", "receptionist", name="user_role"), nullable=False, default="receptionist"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    appointments_as_doctor = relationship("Appointment", foreign_keys="Appointment.doctor_id", back_populates="doctor")
    treatment_records = relationship("TreatmentRecord", foreign_keys="TreatmentRecord.doctor_id", back_populates="doctor")
    treatment_plans = relationship("TreatmentPlan", foreign_keys="TreatmentPlan.doctor_id", back_populates="doctor")
    uploaded_images = relationship("PatientImage", foreign_keys="PatientImage.uploaded_by", back_populates="uploader")
    audit_logs = relationship("AuditLog", foreign_keys="AuditLog.user_id", back_populates="user")
