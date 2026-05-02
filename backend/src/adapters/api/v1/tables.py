from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from src.adapters.persistence.database import get_db
from src.adapters.persistence.models.models import TableModel
from .schemas import TableResponse, TableBase

router = APIRouter(prefix="/tables", tags=["Tables"])

@router.get("", response_model=List[TableResponse])
async def get_tables(restaurant_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(TableModel).order_by(TableModel.name)
    if restaurant_id:
        stmt = stmt.where(TableModel.restaurant_id == restaurant_id)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.patch("/{table_id}/status")
async def update_table_status(table_id: str, status: str, db: AsyncSession = Depends(get_db)):
    stmt = select(TableModel).where(TableModel.id == table_id)
    result = await db.execute(stmt)
    table = result.scalars().first()
    
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
        
    table.status = status
    await db.commit()
    return {"message": "Status updated successfully", "status": status}

@router.post("", response_model=TableResponse)
async def create_table(table: TableBase, restaurant_id: str, db: AsyncSession = Depends(get_db)):
    db_table = TableModel(**table.model_dump(), restaurant_id=restaurant_id)
    db.add(db_table)
    await db.commit()
    await db.refresh(db_table)
    return db_table

@router.put("/{table_id}", response_model=TableResponse)
async def update_table(table_id: str, table_data: TableBase, db: AsyncSession = Depends(get_db)):
    stmt = select(TableModel).where(TableModel.id == table_id)
    result = await db.execute(stmt)
    db_table = result.scalars().first()
    if not db_table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    for key, value in table_data.model_dump().items():
        setattr(db_table, key, value)
        
    await db.commit()
    await db.refresh(db_table)
    return db_table

@router.delete("/{table_id}")
async def delete_table(table_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(TableModel).where(TableModel.id == table_id)
    result = await db.execute(stmt)
    db_table = result.scalars().first()
    if not db_table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    await db.delete(db_table)
    await db.commit()
    return {"message": "Table deleted successfully"}
