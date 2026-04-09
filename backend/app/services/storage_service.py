"""AWS S3 storage service for patient images / X-rays."""
import uuid
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

from app.config import get_settings

settings = get_settings()

_s3 = None


def _get_s3():
    global _s3
    if _s3 is None:
        _s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region,
        )
    return _s3


def build_object_key(patient_id: uuid.UUID, filename: str) -> str:
    """Generate deterministic S3 key: patients/{patient_id}/{uuid}_{filename}"""
    safe_name = Path(filename).name  # strip any path components
    return f"patients/{patient_id}/{uuid.uuid4()}_{safe_name}"


def upload_file(file_bytes: bytes, object_key: str, content_type: str) -> str:
    """Upload bytes to S3. Returns the object key."""
    _get_s3().put_object(
        Bucket=settings.aws_bucket_name,
        Key=object_key,
        Body=file_bytes,
        ContentType=content_type,
        ServerSideEncryption="AES256",
    )
    return object_key


def get_presigned_url(object_key: str, expires_in: int = 900) -> str:
    """Generate a temporary signed GET URL (default 15 minutes)."""
    return _get_s3().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.aws_bucket_name, "Key": object_key},
        ExpiresIn=expires_in,
    )


def soft_delete_object(object_key: str) -> None:
    """Tag the S3 object as deleted (does not remove the file)."""
    _get_s3().put_object_tagging(
        Bucket=settings.aws_bucket_name,
        Key=object_key,
        Tagging={"TagSet": [{"Key": "deleted", "Value": "true"}]},
    )
