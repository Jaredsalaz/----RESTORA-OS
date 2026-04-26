from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from src.adapters.persistence.database import get_db
from src.adapters.persistence.models.models import CompanyModel, RestaurantModel
from .schemas import CompanyCreate, CompanyResponse, RestaurantCreate, RestaurantResponse

router = APIRouter(tags=["Super Admin & Restaurants"])

@router.get("/companies", response_model=List[CompanyResponse])
async def get_companies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CompanyModel))
    return result.scalars().all()

@router.post("/companies", response_model=CompanyResponse)
async def create_company(company: CompanyCreate, db: AsyncSession = Depends(get_db)):
    db_company = CompanyModel(**company.model_dump())
    db.add(db_company)
    await db.commit()
    await db.refresh(db_company)
    return db_company

@router.put("/companies/{id}", response_model=CompanyResponse)
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

@router.delete("/companies/{id}")
async def delete_company(id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(CompanyModel).where(CompanyModel.id == id))
    db_company = res.scalars().first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")
    db_company.status = "deleted"
    await db.commit()
    return {"message": "Company deleted (status changed to deleted)"}

@router.get("/subscriptions")
async def get_subscriptions():
    return [{"plan": "starter", "price": 0}, {"plan": "enterprise", "price": 99}]

@router.post("/subscriptions/{id}/renew")
async def renew_subscription(id: str):
    return {"message": f"Subscription {id} renewed successfully"}

@router.get("/restaurants", response_model=List[RestaurantResponse])
async def get_restaurants(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RestaurantModel))
    return result.scalars().all()

@router.post("/restaurants", response_model=RestaurantResponse)
async def create_restaurant(rest: RestaurantCreate, db: AsyncSession = Depends(get_db)):
    db_rest = RestaurantModel(**rest.model_dump())
    db.add(db_rest)
    await db.commit()
    await db.refresh(db_rest)
    return db_rest

@router.put("/restaurants/{id}", response_model=RestaurantResponse)
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
async def restaurant_stats(id: str):
    return {"restaurant_id": id, "active_tables": 5, "orders_today": 124, "online_staff": 8}
