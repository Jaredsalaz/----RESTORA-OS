from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from src.adapters.persistence.database import get_db
from src.adapters.persistence.models.models import ProductModel, CategoryModel
from .schemas import ProductResponse, CategoryResponse, ProductBase, CategoryBase

router = APIRouter(prefix="/menu", tags=["Menu"])

@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(restaurant_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(CategoryModel).order_by(CategoryModel.sort_order)
    if restaurant_id:
        stmt = stmt.where(CategoryModel.restaurant_id == restaurant_id)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/products", response_model=List[ProductResponse])
async def get_products(restaurant_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(ProductModel).order_by(ProductModel.sort_order)
    if restaurant_id:
        stmt = stmt.where(ProductModel.restaurant_id == restaurant_id)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/categories", response_model=CategoryResponse)
async def create_category(cat: CategoryBase, restaurant_id: str, db: AsyncSession = Depends(get_db)):
    from .schemas import CategoryBase
    db_cat = CategoryModel(**cat.model_dump(), restaurant_id=restaurant_id)
    db.add(db_cat)
    await db.commit()
    await db.refresh(db_cat)
    return db_cat

@router.post("/products", response_model=ProductResponse)
async def create_product(prod: ProductBase, restaurant_id: str, db: AsyncSession = Depends(get_db)):
    from .schemas import ProductBase
    db_prod = ProductModel(**prod.model_dump(), restaurant_id=restaurant_id)
    db.add(db_prod)
    await db.commit()
    await db.refresh(db_prod)
    return db_prod

@router.patch("/products/{product_id}/toggle-availability")
async def toggle_product_availability(product_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ProductModel).where(ProductModel.id == product_id))
    prod = res.scalars().first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    prod.is_available = not prod.is_available
    await db.commit()
    return {"id": product_id, "is_available": prod.is_available}
