from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import ChangePinRequest, LoginRequest, TokenResponse
from app.schemas.user import UserOut
from app.services import auth_service
from app.services import audit_service
from app.utils.security import create_access_token, hash_pin, verify_pin

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    user = await auth_service.authenticate(db, body.mobile, body.pin)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid mobile or PIN")

    token, expires_in = create_access_token(str(user.id), user.role)

    await audit_service.log(
        db,
        user_id=user.id,
        action="login",
        entity_type="user",
        entity_id=user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return TokenResponse(access_token=token, expires_in=expires_in)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/change-pin", response_model=dict)
async def change_pin(
    body: ChangePinRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_pin(body.old_pin, current_user.pin_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Old PIN is incorrect")
    current_user.pin_hash = hash_pin(body.new_pin)
    db.add(current_user)
    return {"success": True, "message": "PIN changed successfully"}
