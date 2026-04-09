import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.utils.security import verify_pin


async def authenticate(db: AsyncSession, mobile: str, pin: str) -> User | None:
    """Return User if mobile + PIN are valid and account is active, else None."""
    result = await db.execute(select(User).where(User.mobile == mobile, User.is_active == True))
    user = result.scalar_one_or_none()
    if user is None:
        return None
    if not verify_pin(pin, user.pin_hash):
        return None
    return user
