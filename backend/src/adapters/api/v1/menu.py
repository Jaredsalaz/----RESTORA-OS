from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
import shutil
import os
import uuid
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

@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(product_id: str, prod_data: ProductBase, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ProductModel).where(ProductModel.id == product_id))
    db_prod = res.scalars().first()
    if not db_prod:
        raise HTTPException(status_code=404, detail="Product not found")
    
    for key, value in prod_data.model_dump().items():
        setattr(db_prod, key, value)
        
    await db.commit()
    await db.refresh(db_prod)
    return db_prod

@router.delete("/products/{product_id}")
async def delete_product(product_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ProductModel).where(ProductModel.id == product_id))
    db_prod = res.scalars().first()
    if not db_prod:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.delete(db_prod)
    await db.commit()
    return {"message": "Product deleted"}

@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: str, cat_data: CategoryBase, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(CategoryModel).where(CategoryModel.id == category_id))
    db_cat = res.scalars().first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    for key, value in cat_data.model_dump().items():
        setattr(db_cat, key, value)
        
    await db.commit()
    await db.refresh(db_cat)
    return db_cat

@router.delete("/categories/{category_id}")
async def delete_category(category_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(CategoryModel).where(CategoryModel.id == category_id))
    db_cat = res.scalars().first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")
    await db.delete(db_cat)
    await db.commit()
    return {"message": "Category deleted"}

@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    # Crear directorio si no existe
    upload_dir = "static/uploads"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
        
    # Nombre único para el archivo
    file_ext = os.path.splitext(file.filename)[1]
    file_name = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(upload_dir, file_name)
    
    # Guardar archivo
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Retornar URL pública (asumiendo localhost:8081)
    return {"image_url": f"http://localhost:8081/static/uploads/{file_name}"}
