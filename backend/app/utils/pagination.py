import math
from typing import TypeVar

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.common import PaginationMeta

T = TypeVar("T")

DEFAULT_PAGE = 1
DEFAULT_PER_PAGE = 20
MAX_PER_PAGE = 100


def clamp_pagination(page: int, per_page: int) -> tuple[int, int]:
    page = max(1, page)
    per_page = max(1, min(per_page, MAX_PER_PAGE))
    return page, per_page


def get_offset(page: int, per_page: int) -> int:
    return (page - 1) * per_page


async def paginate(
    db: AsyncSession,
    query: Select,
    page: int,
    per_page: int,
) -> tuple[list, PaginationMeta]:
    page, per_page = clamp_pagination(page, per_page)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Fetch page
    result = await db.execute(query.offset(get_offset(page, per_page)).limit(per_page))
    items = result.scalars().all()

    meta = PaginationMeta(
        page=page,
        per_page=per_page,
        total=total,
        pages=math.ceil(total / per_page) if total else 0,
    )
    return list(items), meta
