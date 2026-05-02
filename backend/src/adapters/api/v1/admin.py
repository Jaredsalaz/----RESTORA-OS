from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from src.adapters.persistence.database import get_db
from src.adapters.persistence.models.models import CompanyModel, RestaurantModel, UserModel
from .schemas import (
    CompanyCreate, CompanyResponse, 
    RestaurantCreate, RestaurantResponse,
    UserCreate, UserResponse
)
from src.shared.security.dependencies import get_current_user, RoleChecker
import bcrypt

router = APIRouter(tags=["Admin & Management"])

# ═══════════════════════════════════════════════════════
#  USERS CRUD (Jerarquía: SuperAdmin > AdminEmpresa > Gerente)
# ═══════════════════════════════════════════════════════

ROLE_HIERARCHY = {
    'superadmin': ['admin_empresa', 'gerente', 'cajero', 'mesero', 'cocina'],
    'admin_empresa': ['gerente', 'cajero', 'mesero', 'cocina'],
    'gerente': ['cajero', 'mesero', 'cocina'],
}

@router.get("/users", response_model=List[UserResponse])
async def get_users(
    restaurant_id: Optional[str] = None, 
    company_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    stmt = select(UserModel)
    role = current_user.get("role")
    
    # SuperAdmin ve todo, otros solo su scope
    if role == "superadmin":
        if company_id:
            stmt = stmt.where(UserModel.company_id == company_id)
        if restaurant_id:
            stmt = stmt.where(UserModel.restaurant_id == restaurant_id)
    elif role == "admin_empresa":
        user_company = current_user.get("company_id")
        if user_company:
            stmt = stmt.where(UserModel.company_id == user_company)
        if restaurant_id:
            stmt = stmt.where(UserModel.restaurant_id == restaurant_id)
    else:
        # Gerente solo ve usuarios de su restaurante
        user_rest = current_user.get("restaurant_id")
        if user_rest:
            stmt = stmt.where(UserModel.restaurant_id == user_rest)
    
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/users", response_model=UserResponse)
async def create_user(
    user: UserCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    creator_role = current_user.get("role")
    allowed = ROLE_HIERARCHY.get(creator_role, [])
    
    if user.role not in allowed:
        raise HTTPException(status_code=403, detail=f"Tu rol '{creator_role}' no puede crear usuarios con rol '{user.role}'")
    
    # Hash password
    hashed_pass = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Hash PIN if provided
    hashed_pin = None
    if user.pin_code:
        hashed_pin = bcrypt.hashpw(user.pin_code.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Determinar company_id
    company_id = user.company_id
    if not company_id and creator_role != 'superadmin':
        company_id = current_user.get("company_id")
    
    db_user = UserModel(
        email=user.email,
        password_hash=hashed_pass,
        full_name=user.full_name,
        role=user.role,
        company_id=company_id,
        restaurant_id=user.restaurant_id,
        pin_code=hashed_pin,
        is_active=user.is_active
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

@router.put("/users/{id}", response_model=UserResponse)
async def update_user(
    id: str, 
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    res = await db.execute(select(UserModel).where(UserModel.id == id))
    db_user = res.scalars().first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if "full_name" in data:
        db_user.full_name = data["full_name"]
    if "email" in data:
        db_user.email = data["email"]
    if "role" in data:
        db_user.role = data["role"]
    if "is_active" in data:
        db_user.is_active = data["is_active"]
    if "password" in data and data["password"]:
        db_user.password_hash = bcrypt.hashpw(data["password"].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    if "pin_code" in data and data["pin_code"]:
        db_user.pin_code = bcrypt.hashpw(data["pin_code"].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    await db.commit()
    await db.refresh(db_user)
    return db_user

@router.patch("/users/{id}/toggle")
async def toggle_user(
    id: str, 
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    res = await db.execute(select(UserModel).where(UserModel.id == id))
    db_user = res.scalars().first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    db_user.is_active = not db_user.is_active
    await db.commit()
    return {"is_active": db_user.is_active, "message": f"Usuario {'activado' if db_user.is_active else 'desactivado'}"}

@router.delete("/users/{id}")
async def delete_user(
    id: str, 
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    res = await db.execute(select(UserModel).where(UserModel.id == id))
    db_user = res.scalars().first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(db_user)
    await db.commit()
    return {"message": "User deleted successfully"}

# ═══════════════════════════════════════════════════════
#  COMPANIES (Solo SuperAdmin)
# ═══════════════════════════════════════════════════════

@router.get("/companies", response_model=List[CompanyResponse],
            dependencies=[Depends(RoleChecker(["superadmin"]))])
async def get_companies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CompanyModel).where(CompanyModel.status != 'deleted'))
    return result.scalars().all()

@router.post("/companies", response_model=CompanyResponse,
             dependencies=[Depends(RoleChecker(["superadmin"]))])
async def create_company(company: CompanyCreate, db: AsyncSession = Depends(get_db)):
    db_company = CompanyModel(**company.model_dump())
    db.add(db_company)
    await db.commit()
    await db.refresh(db_company)
    return db_company

@router.put("/companies/{id}", response_model=CompanyResponse,
            dependencies=[Depends(RoleChecker(["superadmin"]))])
async def update_company(id: str, company: CompanyCreate, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(CompanyModel).where(CompanyModel.id == id))
    db_company = res.scalars().first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")
    db_company.name = company.name
    db_company.rfc = company.rfc
    db_company.plan = company.plan
    await db.commit()
    return db_company

@router.delete("/companies/{id}",
               dependencies=[Depends(RoleChecker(["superadmin"]))])
async def delete_company(id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(CompanyModel).where(CompanyModel.id == id))
    db_company = res.scalars().first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")
    db_company.status = "deleted"
    await db.commit()
    return {"message": "Company soft-deleted"}

# ═══════════════════════════════════════════════════════
#  RESTAURANTS (SuperAdmin y AdminEmpresa)
# ═══════════════════════════════════════════════════════

@router.get("/restaurants", response_model=List[RestaurantResponse])
async def get_restaurants(
    company_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    stmt = select(RestaurantModel)
    role = current_user.get("role")
    
    if role == "superadmin":
        if company_id:
            stmt = stmt.where(RestaurantModel.company_id == company_id)
    elif role == "admin_empresa":
        user_company = current_user.get("company_id")
        stmt = stmt.where(RestaurantModel.company_id == user_company)
    else:
        user_rest = current_user.get("restaurant_id")
        stmt = stmt.where(RestaurantModel.id == user_rest)
    
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/restaurants", response_model=RestaurantResponse,
             dependencies=[Depends(RoleChecker(["superadmin", "admin_empresa"]))])
async def create_restaurant(rest: RestaurantCreate, db: AsyncSession = Depends(get_db)):
    db_rest = RestaurantModel(**rest.model_dump())
    db.add(db_rest)
    await db.commit()
    await db.refresh(db_rest)
    return db_rest

@router.put("/restaurants/{id}", response_model=RestaurantResponse,
            dependencies=[Depends(RoleChecker(["superadmin", "admin_empresa"]))])
async def update_restaurant(id: str, rest: RestaurantCreate, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(RestaurantModel).where(RestaurantModel.id == id))
    db_rest = res.scalars().first()
    if not db_rest:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    db_rest.name = rest.name
    db_rest.address = rest.address
    db_rest.phone = rest.phone
    await db.commit()
    return db_rest

@router.get("/restaurants/{id}/stats")
async def restaurant_stats(id: str, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import func
    users_count = await db.execute(select(func.count(UserModel.id)).where(UserModel.restaurant_id == id))
    return {"restaurant_id": id, "staff_count": users_count.scalar() or 0}

# ═══════════════════════════════════════════════════════
#  GLOBAL STATS (SuperAdmin Dashboard)
# ═══════════════════════════════════════════════════════

@router.get("/global-stats", dependencies=[Depends(RoleChecker(["superadmin"]))])
async def global_stats(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import func
    from src.adapters.persistence.models.models import PaymentModel, InvoiceModel
    
    companies = await db.execute(select(func.count(CompanyModel.id)).where(CompanyModel.status == 'active'))
    restaurants = await db.execute(select(func.count(RestaurantModel.id)))
    users = await db.execute(select(func.count(UserModel.id)).where(UserModel.is_active == True))
    
    # Total revenue de la plataforma
    revenue = await db.execute(
        select(func.sum(PaymentModel.amount)).where(PaymentModel.status == 'completed')
    )
    
    return {
        "total_companies": companies.scalar() or 0,
        "total_restaurants": restaurants.scalar() or 0,
        "total_users": users.scalar() or 0,
        "total_revenue": float(revenue.scalar() or 0),
    }

@router.get("/subscriptions")
async def get_subscriptions():
    return [
        {"plan": "starter", "price": 0, "features": ["1 sucursal", "5 usuarios", "Reportes basicos"]},
        {"plan": "pro", "price": 29, "features": ["3 sucursales", "20 usuarios", "Reportes avanzados", "Soporte prioritario"]},
        {"plan": "enterprise", "price": 99, "features": ["Sucursales ilimitadas", "Usuarios ilimitados", "API access", "Soporte 24/7"]}
    ]
