from pydantic import BaseModel
import bcrypt
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from src.adapters.persistence.database import get_db
from src.adapters.persistence.models.models import UserModel, ShiftModel
from src.shared.security.jwt_handler import create_access_token, create_refresh_token, verify_token
from src.shared.security.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

class PinLoginRequest(BaseModel):
    pin: str
    restaurant_id: str

@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(UserModel).where(UserModel.email == req.email)
    res = await db.execute(stmt)
    user = res.scalars().first()
    
    # pgcrypto crypt('password', gen_salt('bf')) genera hashes bcrypt
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    is_valid = bcrypt.checkpw(req.password.encode('utf-8'), user.password_hash.encode('utf-8'))
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    token_data = {"sub": str(user.id), "role": user.role, "restaurant_id": str(user.restaurant_id) if user.restaurant_id else None}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    return {
        "access_token": access_token, 
        "refresh_token": refresh_token,
        "token_type": "bearer", 
        "role": user.role
    }

@router.post("/login-pin")
async def login_pin(req: PinLoginRequest, db: AsyncSession = Depends(get_db)):
    # Buscar meseros/cocina del restaurante
    stmt = select(UserModel).where(UserModel.restaurant_id == req.restaurant_id, UserModel.role.in_(['waiter', 'kitchen']))
    res = await db.execute(stmt)
    users = res.scalars().all()
    
    for user in users:
        if user.pin_code:
            is_valid_pin = bcrypt.checkpw(req.pin.encode('utf-8'), user.pin_code.encode('utf-8'))
            if is_valid_pin:
                token_data = {"sub": str(user.id), "role": user.role, "restaurant_id": str(user.restaurant_id)}
                access_token = create_access_token(token_data)
                refresh_token = create_refresh_token(token_data)
                
                # Auto clock-in on PIN login
                shift = ShiftModel(user_id=user.id, restaurant_id=user.restaurant_id, status='active')
                db.add(shift)
                await db.commit()
                
                return {
                    "access_token": access_token, 
                    "refresh_token": refresh_token,
                    "token_type": "bearer", 
                    "role": user.role, 
                    "full_name": user.full_name
                }
            
    raise HTTPException(status_code=401, detail="Invalid PIN")

class RefreshRequest(BaseModel):
    refresh_token: str

@router.post("/refresh")
async def refresh_access_token(req: RefreshRequest):
    payload = verify_token(req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    # Remove exp and type to issue new access token
    new_data = {k: v for k, v in payload.items() if k not in ["exp", "type"]}
    access_token = create_access_token(new_data)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/clock-out")
async def clock_out(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Find active shift and close it
    stmt = select(ShiftModel).where(ShiftModel.user_id == user["sub"], ShiftModel.status == 'active')
    res = await db.execute(stmt)
    shift = res.scalars().first()
    
    if shift:
        shift.clock_out = datetime.utcnow()
        shift.status = 'closed'
        await db.commit()
        return {"message": "Clocked out successfully"}
    return {"message": "No active shift found"}

