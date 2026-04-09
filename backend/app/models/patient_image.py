import uuid
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PatientImage(Base):
    __tablename__ = "patient_images"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    treatment_record_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("treatment_records.id")
    )
    # Storage
    file_url: Mapped[str] = mapped_column(String(1000), nullable=False)  # S3 object key
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(
        Enum("jpeg", "png", "dicom", "pdf", name="image_file_type"), nullable=False
    )
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger)
    # Classification
    image_category: Mapped[str] = mapped_column(
        Enum("pre_treatment", "during_treatment", "post_treatment", "follow_up", "other", name="image_category"),
        nullable=False,
        default="other",
    )
    image_type: Mapped[str] = mapped_column(
        Enum("periapical", "bitewing", "panoramic", "cbct", "intraoral_photo", "document", "other", name="image_type"),
        nullable=False,
        default="other",
    )
    tooth_numbers: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    description: Mapped[str | None] = mapped_column(Text)
    image_metadata: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)
    # Audit
    uploaded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_reason: Mapped[str | None] = mapped_column(Text)
    deleted_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    patient = relationship("Patient", back_populates="images")
    treatment_record = relationship("TreatmentRecord", back_populates="images")
    uploader = relationship("User", foreign_keys=[uploaded_by], back_populates="uploaded_images")
