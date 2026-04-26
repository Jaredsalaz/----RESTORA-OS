from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel
from src.adapters.persistence.database import get_db
from src.adapters.persistence.models.models import OrderModel, OrderItemModel, TableModel
from .schemas import OrderResponse, OrderCreate, OrderItemCreate

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.get("", response_model=List[OrderResponse])
async def get_orders(status: Optional[str] = "open", restaurant_id: Optional[str] = None, table_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(OrderModel).options(selectinload(OrderModel.items))
    if status:
        stmt = stmt.where(OrderModel.status == status)
    if restaurant_id:
        stmt = stmt.where(OrderModel.restaurant_id == restaurant_id)
    if table_id:
        stmt = stmt.where(OrderModel.table_id == table_id)
    
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("", response_model=OrderResponse)
async def create_order(order: OrderCreate, db: AsyncSession = Depends(get_db)):
    subtotal = sum(item.unit_price * item.quantity for item in order.items)
    tax = subtotal * 0.16
    total = subtotal + tax

    db_order = OrderModel(
        restaurant_id=order.restaurant_id,
        table_id=order.table_id,
        waiter_id=order.waiter_id,
        guests=order.guests,
        notes=order.notes,
        subtotal=subtotal,
        tax=tax,
        total=total,
        status='open'
    )
    
    for item in order.items:
        db_item = OrderItemModel(
            product_id=item.product_id,
            product_name=item.product_name,
            unit_price=item.unit_price,
            quantity=item.quantity,
            modifiers=item.modifiers,
            notes=item.notes,
            status='pending'
        )
        db_order.items.append(db_item)
    
    stmt_table = select(TableModel).where(TableModel.id == order.table_id)
    res_table = await db.execute(stmt_table)
    db_table = res_table.scalars().first()
    if db_table:
        db_table.status = 'occupied'

    db.add(db_order)
    await db.commit()
    await db.refresh(db_order)
    
    stmt_refresh = select(OrderModel).options(selectinload(OrderModel.items)).where(OrderModel.id == db_order.id)
    result = await db.execute(stmt_refresh)
    return result.scalars().first()

@router.patch("/{order_id}/items")
async def update_order_items(order_id: str, items: List[OrderItemCreate], db: AsyncSession = Depends(get_db)):
    stmt = select(OrderModel).options(selectinload(OrderModel.items)).where(OrderModel.id == order_id)
    result = await db.execute(stmt)
    db_order = result.scalars().first()
    
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    for item in items:
        db_item = OrderItemModel(
            order_id=db_order.id,
            product_id=item.product_id,
            product_name=item.product_name,
            unit_price=item.unit_price,
            quantity=item.quantity,
            modifiers=item.modifiers,
            notes=item.notes,
            status='pending'
        )
        db.add(db_item)
        
    db_order.subtotal = float(db_order.subtotal or 0) + sum(item.unit_price * item.quantity for item in items)
    db_order.tax = float(db_order.subtotal) * 0.16
    db_order.total = float(db_order.subtotal) + float(db_order.tax)
    
    # Si la orden estaba lista o entregada, la regresamos a cocina
    if db_order.status in ['ready', 'delivered']:
        db_order.status = 'in_progress'
        
    await db.commit()
    
    stmt_refresh = select(OrderModel).options(selectinload(OrderModel.items)).where(OrderModel.id == order_id)
    res = await db.execute(stmt_refresh)
    return res.scalars().first()

@router.post("/{order_id}/send-to-kitchen")
async def send_to_kitchen(order_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(OrderItemModel).where(OrderItemModel.order_id == order_id, OrderItemModel.status == 'pending')
    result = await db.execute(stmt)
    items = result.scalars().all()
    
    for item in items:
        item.status = 'preparing'
        
    stmt_order = select(OrderModel).where(OrderModel.id == order_id)
    result_order = await db.execute(stmt_order)
    order = result_order.scalars().first()
    if order and order.status == 'open':
        order.status = 'in_progress'
        
    await db.commit()
    
    # Notificar a la cocina vía WebSocket
    from .websockets.kitchen_ws import notify_kitchen_new_order
    import json
    try:
        order_data = json.dumps({
            "type": "new_order",
            "order_id": str(order_id),
            "table_name": order.notes if order else "",
            "items": [
                {
                    "id": str(item.id),
                    "product_name": item.product_name,
                    "quantity": item.quantity,
                    "modifiers": item.modifiers or [],
                    "notes": item.notes,
                    "status": item.status
                }
                for item in items
            ]
        })
        await notify_kitchen_new_order(str(order.restaurant_id) if order else "", order_data)
    except Exception:
        pass  # No romper si WS no está conectado

    return {"message": "Items sent to kitchen", "items_count": len(items)}

@router.post("/{order_id}/close")
async def close_order(order_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(OrderModel).where(OrderModel.id == order_id)
    result = await db.execute(stmt)
    order = result.scalars().first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order.status = 'delivered'
    await db.commit()
    return {"message": "Order closed successfully"}

@router.get("/{id}", response_model=OrderResponse)
async def get_order(id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(OrderModel).options(selectinload(OrderModel.items)).where(OrderModel.id == id))
    order = res.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

# ─── SPLIT BILL ────────────────────────────────────────
class SplitRequest(BaseModel):
    item_ids: List[str]

@router.post("/{id}/split")
async def split_order(id: str, req: SplitRequest, db: AsyncSession = Depends(get_db)):
    """Divide la cuenta moviendo items seleccionados a una nueva orden."""
    # Obtener la orden original
    stmt = select(OrderModel).options(selectinload(OrderModel.items)).where(OrderModel.id == id)
    res = await db.execute(stmt)
    original_order = res.scalars().first()
    
    if not original_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Identificar items a mover
    items_to_move = [item for item in original_order.items if str(item.id) in req.item_ids]
    
    if not items_to_move:
        raise HTTPException(status_code=400, detail="No valid items found to split")
    
    # Crear nueva orden con los items seleccionados
    new_subtotal = sum(float(item.unit_price) * item.quantity for item in items_to_move)
    new_tax = new_subtotal * 0.16
    new_total = new_subtotal + new_tax
    
    new_order = OrderModel(
        restaurant_id=original_order.restaurant_id,
        table_id=original_order.table_id,
        waiter_id=original_order.waiter_id,
        guests=1,
        notes=f"Split de comanda #{str(original_order.id)[:8]}",
        subtotal=new_subtotal,
        tax=new_tax,
        total=new_total,
        status=original_order.status,
    )
    db.add(new_order)
    await db.flush()
    
    # Mover items a la nueva orden
    for item in items_to_move:
        item.order_id = new_order.id
    
    # Recalcular la orden original
    remaining_items = [item for item in original_order.items if str(item.id) not in req.item_ids]
    orig_subtotal = sum(float(item.unit_price) * item.quantity for item in remaining_items)
    original_order.subtotal = orig_subtotal
    original_order.tax = orig_subtotal * 0.16
    original_order.total = orig_subtotal + (orig_subtotal * 0.16)
    
    await db.commit()
    
    return {
        "message": "Cuenta dividida exitosamente",
        "new_order_id": str(new_order.id),
        "items_moved": len(items_to_move),
        "original_new_total": float(original_order.total),
        "split_total": float(new_total),
    }

# ─── TRANSFER ──────────────────────────────────────────
class TransferRequest(BaseModel):
    new_table_id: Optional[str] = None
    new_waiter_id: Optional[str] = None

@router.patch("/{id}/transfer")
async def transfer_order(id: str, req: TransferRequest, db: AsyncSession = Depends(get_db)):
    """Transferir una comanda a otra mesa y/o a otro mesero."""
    stmt = select(OrderModel).where(OrderModel.id == id)
    res = await db.execute(stmt)
    order = res.scalars().first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    changes = []
    
    if req.new_table_id:
        # Liberar mesa anterior
        old_table_stmt = select(TableModel).where(TableModel.id == order.table_id)
        old_res = await db.execute(old_table_stmt)
        old_table = old_res.scalars().first()
        if old_table:
            old_table.status = 'available'
        
        # Ocupar nueva mesa
        new_table_stmt = select(TableModel).where(TableModel.id == req.new_table_id)
        new_res = await db.execute(new_table_stmt)
        new_table = new_res.scalars().first()
        if not new_table:
            raise HTTPException(status_code=404, detail="New table not found")
        new_table.status = 'occupied'
        
        order.table_id = new_table.id
        changes.append(f"Mesa cambiada a {new_table.name}")
    
    if req.new_waiter_id:
        order.waiter_id = req.new_waiter_id
        changes.append("Mesero transferido")
    
    await db.commit()
    
    return {
        "message": "Transferencia exitosa",
        "changes": changes,
    }

# ─── MARK ITEM AS READY (para KDS) ────────────────────
@router.patch("/{order_id}/items/{item_id}/ready")
async def mark_item_ready(order_id: str, item_id: str, db: AsyncSession = Depends(get_db)):
    """Cocina marca un item individual como 'listo'."""
    stmt = select(OrderItemModel).where(
        OrderItemModel.id == item_id,
        OrderItemModel.order_id == order_id
    )
    res = await db.execute(stmt)
    item = res.scalars().first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item.status = 'ready'
    
    # Verificar si todos los items de la orden están listos
    all_items_stmt = select(OrderItemModel).where(OrderItemModel.order_id == order_id)
    all_res = await db.execute(all_items_stmt)
    all_items = all_res.scalars().all()
    
    if all(i.status == 'ready' for i in all_items):
        order_stmt = select(OrderModel).where(OrderModel.id == order_id)
        order_res = await db.execute(order_stmt)
        order = order_res.scalars().first()
        if order:
            order.status = 'ready'
    
    await db.commit()
    
    # Notify KDS via WebSocket
    from .websockets.kitchen_ws import notify_kitchen_new_order
    import json
    try:
        stmt_o = select(OrderModel).where(OrderModel.id == order_id)
        res_o = await db.execute(stmt_o)
        order = res_o.scalars().first()
        msg = json.dumps({"type": "item_ready", "order_id": order_id, "item_id": item_id, "all_ready": all(i.status == 'ready' for i in all_items)})
        await notify_kitchen_new_order(str(order.restaurant_id) if order else "", msg)
    except Exception:
        pass
    
    return {"message": "Item marked as ready", "item_id": item_id, "all_ready": all(i.status == 'ready' for i in all_items)}

# ─── MARK ENTIRE ORDER AS READY ───────────────────────
@router.patch("/{order_id}/ready")
async def mark_order_ready(order_id: str, db: AsyncSession = Depends(get_db)):
    """Cocina marca TODA la comanda como lista."""
    stmt = select(OrderModel).options(selectinload(OrderModel.items)).where(OrderModel.id == order_id)
    res = await db.execute(stmt)
    order = res.scalars().first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    for item in order.items:
        if item.status == 'preparing':
            item.status = 'ready'
    
    order.status = 'ready'
    await db.commit()
    
    # Notify via WebSocket
    from .websockets.kitchen_ws import notify_kitchen_new_order
    import json
    try:
        msg = json.dumps({"type": "order_ready", "order_id": order_id})
        await notify_kitchen_new_order(str(order.restaurant_id), msg)
    except Exception:
        pass
    
    return {"message": "Order marked as ready"}
