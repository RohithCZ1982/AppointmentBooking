import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import UniqueConstraint

from app.database import Base


class DentalChart(Base):
    __tablename__ = "dental_chart"
    __table_args__ = (UniqueConstraint("patient_id", "tooth_number", name="uq_dental_chart_patient_tooth"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    tooth_number: Mapped[int] = mapped_column(Integer, nullable=False)  # FDI: 11-18, 21-28, 31-38, 41-48
    # conditions: ["caries","filling","crown","extraction","root_canal","bridge","implant","missing","veneer","sealant"]
    conditions: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    # surfaces: {mesial, distal, occlusal, buccal, lingual} → condition string or null
    surfaces: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    notes: Mapped[str | None] = mapped_column(Text)
    recorded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    patient = relationship("Patient", back_populates="dental_chart")
    recorded_by_user = relationship("User", foreign_keys=[recorded_by])
