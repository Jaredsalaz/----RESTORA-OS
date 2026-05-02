from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, extract, desc
from typing import List, Optional, Any
from datetime import datetime, timedelta, date as date_type
from src.adapters.persistence.database import get_db
from src.adapters.persistence.models.models import OrderModel, OrderItemModel, UserModel, ProductModel, InvoiceModel, PaymentModel
from .schemas import DashboardStats, SalesSummary, WaiterPerformance, ProductSales

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(restaurant_id: str, db: AsyncSession = Depends(get_db)):
    """ Estadísticas basadas en pagos REALES para el gerente """
    today = datetime.now().date()
    yesterday = today - timedelta(days=1)

    # Ingresos de hoy desde la tabla PAYMENTS
    stmt_today = select(
        func.count(PaymentModel.id).label("count"),
        func.sum(PaymentModel.amount).label("revenue")
    ).join(InvoiceModel, PaymentModel.invoice_id == InvoiceModel.id).where(
        InvoiceModel.restaurant_id == restaurant_id,
        PaymentModel.status == 'completed',
        func.date(PaymentModel.processed_at) == today
    )
    
    # Clientes de hoy (ahora vinculado a pagos completados hoy)
    stmt_guests = select(func.sum(OrderModel.guests)).join(
        InvoiceModel, OrderModel.id == InvoiceModel.order_id
    ).join(
        PaymentModel, InvoiceModel.id == PaymentModel.invoice_id
    ).where(
        InvoiceModel.restaurant_id == restaurant_id,
        PaymentModel.status == 'completed',
        func.date(PaymentModel.processed_at) == today
    )

    # Ingresos de ayer para crecimiento
    stmt_yesterday = select(
        func.sum(PaymentModel.amount).label("revenue")
    ).join(InvoiceModel, PaymentModel.invoice_id == InvoiceModel.id).where(
        InvoiceModel.restaurant_id == restaurant_id,
        PaymentModel.status == 'completed',
        func.date(PaymentModel.processed_at) == yesterday
    )

    res_today = await db.execute(stmt_today)
    row_today = res_today.first()
    
    res_guests = await db.execute(stmt_guests)
    customers_today = res_guests.scalar() or 0
    
    res_yesterday = await db.execute(stmt_yesterday)
    val_yesterday = res_yesterday.scalar() or 0

    revenue_today = float(row_today.revenue or 0)
    orders_today = int(row_today.count or 0)
    avg_ticket = revenue_today / orders_today if orders_today > 0 else 0
    
    # Crecimiento
    growth = ((revenue_today - float(val_yesterday)) / float(val_yesterday) * 100) if val_yesterday > 0 else 100

    # Top 5 Productos (basado en órdenes que tienen pagos completados)
    stmt_top = select(
        OrderItemModel.product_name,
        func.sum(OrderItemModel.quantity).label("total_qty")
    ).join(OrderModel).join(
        InvoiceModel, OrderModel.id == InvoiceModel.order_id
    ).join(
        PaymentModel, InvoiceModel.id == PaymentModel.invoice_id
    ).where(
        InvoiceModel.restaurant_id == restaurant_id,
        PaymentModel.status == 'completed'
    ).group_by(OrderItemModel.product_name).order_by(desc("total_qty")).limit(5)

    res_top = await db.execute(stmt_top)
    top_products = [{"name": r.product_name, "quantity": int(r.total_qty)} for r in res_top.all()]

    # Ranking de Meseros (ahora basado en lo que realmente cobraron hoy)
    stmt_waiters = select(
        UserModel.full_name,
        func.sum(PaymentModel.amount).label("revenue")
    ).join(OrderModel, OrderModel.waiter_id == UserModel.id).join(
        InvoiceModel, OrderModel.id == InvoiceModel.order_id
    ).join(
        PaymentModel, InvoiceModel.id == PaymentModel.invoice_id
    ).where(
        InvoiceModel.restaurant_id == restaurant_id,
        PaymentModel.status == 'completed',
        func.date(PaymentModel.processed_at) == today
    ).group_by(UserModel.full_name).order_by(desc("revenue"))

    res_waiters = await db.execute(stmt_waiters)
    waiter_ranking = [{"name": r.full_name, "total": float(r.revenue)} for r in res_waiters.all()]

    return {
        "today_revenue": revenue_today,
        "today_orders": orders_today,
        "customers_today": int(customers_today),
        "avg_ticket": avg_ticket,
        "revenue_growth": round(growth, 2),
        "top_products": top_products,
        "waiter_ranking": waiter_ranking
    }

@router.get("/sales/history", response_model=List[SalesSummary])
async def get_sales_history(
    restaurant_id: str, 
    days: int = Query(7, ge=1, le=30),
    db: AsyncSession = Depends(get_db)
):
    """ Historial basado en tabla PAYMENTS """
    start_date = datetime.now().date() - timedelta(days=days-1)
    
    stmt = select(
        func.date(PaymentModel.processed_at).label("date"),
        func.sum(PaymentModel.amount).label("revenue"),
        func.count(PaymentModel.id).label("orders")
    ).join(InvoiceModel, PaymentModel.invoice_id == InvoiceModel.id).where(
        InvoiceModel.restaurant_id == restaurant_id,
        PaymentModel.status == 'completed',
        func.date(PaymentModel.processed_at) >= start_date
    ).group_by(func.date(PaymentModel.processed_at)).order_by(func.date(PaymentModel.processed_at))

    res = await db.execute(stmt)
    return [{"date": str(r.date), "revenue": float(r.revenue), "orders": int(r.orders)} for r in res.all()]

@router.get("/waiters", response_model=List[WaiterPerformance])
async def get_waiter_performance(
    restaurant_id: str,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """ Reporte de desempeño por mesero basado en PAGOS REALES """
    stmt = select(
        UserModel.full_name,
        func.sum(PaymentModel.amount).label("revenue"),
        func.count(PaymentModel.id).label("orders")
    ).join(OrderModel, OrderModel.waiter_id == UserModel.id).join(
        InvoiceModel, OrderModel.id == InvoiceModel.order_id
    ).join(
        PaymentModel, InvoiceModel.id == PaymentModel.invoice_id
    ).where(
        InvoiceModel.restaurant_id == restaurant_id,
        PaymentModel.status == 'completed'
    )
    
    if from_date:
        stmt = stmt.where(func.date(PaymentModel.processed_at) >= from_date)
    if to_date:
        stmt = stmt.where(func.date(PaymentModel.processed_at) <= to_date)
        
    stmt = stmt.group_by(UserModel.full_name).order_by(desc("revenue"))
    
    res = await db.execute(stmt)
    return [
        {"waiter_name": r.full_name, "total_sales": float(r.revenue), "orders_count": int(r.orders)} 
        for r in res.all()
    ]

@router.get("/products", response_model=List[ProductSales])
async def get_product_sales(
    restaurant_id: str,
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """ Reporte de productos más vendidos """
    stmt = select(
        OrderItemModel.product_name,
        func.sum(OrderItemModel.quantity).label("qty"),
        func.sum(OrderItemModel.unit_price * OrderItemModel.quantity).label("revenue")
    ).join(OrderModel).where(
        OrderModel.restaurant_id == restaurant_id,
        OrderModel.status == 'paid'
    ).group_by(OrderItemModel.product_name).order_by(desc("qty")).limit(limit)

    res = await db.execute(stmt)
    return [
        {"product_name": r.product_name, "quantity": int(r.qty), "total_revenue": float(r.revenue)}
        for r in res.all()
    ]

@router.get("/hourly", response_model=List[Any])
async def get_hourly_sales(restaurant_id: str, db: AsyncSession = Depends(get_db)):
    """ Distribución de ventas por hora (Horas Pico) """
    # Extract hour from created_at
    stmt = select(
        extract('hour', OrderModel.created_at).label("hour"),
        func.count(OrderModel.id).label("orders"),
        func.sum(OrderModel.total).label("revenue")
    ).where(
        OrderModel.restaurant_id == restaurant_id,
        OrderModel.status == 'paid'
    ).group_by("hour").order_by("hour")

    res = await db.execute(stmt)
    # Rellenar horas faltantes con 0 para que la gráfica se vea bien
    hours_data = {int(r.hour): {"hour": f"{int(r.hour)}:00", "orders": int(r.orders), "revenue": float(r.revenue)} for r in res.all()}
    
    full_report = []
    for h in range(0, 24):
        full_report.append(hours_data.get(h, {"hour": f"{h}:00", "orders": 0, "revenue": 0.0}))
        
    return full_report
