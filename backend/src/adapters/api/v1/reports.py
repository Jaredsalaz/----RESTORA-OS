from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from src.adapters.persistence.database import get_db
from src.adapters.persistence.models.models import OrderModel
from sqlalchemy import func

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/sales")
async def get_sales_report(restaurant_id: str, from_date: Optional[str] = None, to_date: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    # Basic MVP sales report by summarizing paid orders
    stmt = select(
        func.count(OrderModel.id).label("total_orders"),
        func.sum(OrderModel.total).label("total_revenue")
    ).where(OrderModel.restaurant_id == restaurant_id, OrderModel.status == 'paid')
    
    # Normally we would filter by date here as well
    result = await db.execute(stmt)
    row = result.first()
    
    return {
        "restaurant_id": restaurant_id,
        "total_orders": row.total_orders or 0,
        "total_revenue": float(row.total_revenue or 0)
    }

@router.get("/daily-summary/{date}")
async def daily_summary(date: str):
    return {"date": date, "total_revenue": 15430.50, "orders": 142}

@router.get("/top-products")
async def top_products():
    return [{"name": "Tacos al Pastor", "quantity": 45}, {"name": "Cerveza Artesanal", "quantity": 30}]

@router.get("/by-waiter")
async def by_waiter():
    return [{"waiter": "Carlos R.", "total": 8500}, {"waiter": "Maria G.", "total": 6930}]
