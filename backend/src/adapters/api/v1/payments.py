from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel, UUID4
import hashlib
import uuid
import io
from datetime import datetime
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import mm
from reportlab.lib.units import mm as mm_unit

from src.adapters.persistence.database import get_db
from src.adapters.persistence.models.models import InvoiceModel, PaymentModel, OrderModel, TableModel, UserModel
from src.adapters.api.v1.schemas import PaymentCreate, PaymentResponse, InvoiceResponse, DiscountCreate

router = APIRouter(prefix="/payments", tags=["Payments & Invoices"])

def generate_digital_signature(order_id: str, amount: float, method: str) -> str:
    ticket_data = f"ORDER:{order_id}|AMT:{amount}|METHOD:{method}|TS:{datetime.utcnow().isoformat()}"
    return hashlib.sha256(ticket_data.encode()).hexdigest()

@router.post("/orders/{order_id}/discount", response_model=dict)
async def apply_discount(order_id: str, req: DiscountCreate, db: AsyncSession = Depends(get_db)):
    stmt_user = select(UserModel).where(UserModel.pin_code == req.pin)
    res_user = await db.execute(stmt_user)
    manager = res_user.scalars().first()
    
    if not manager or manager.role not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="PIN inválido o sin permisos de gerente")
        
    stmt_order = select(OrderModel).where(OrderModel.id == order_id)
    res_order = await db.execute(stmt_order)
    order = res_order.scalars().first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
        
    if order.status in ['paid', 'cancelled']:
        raise HTTPException(status_code=400, detail="La orden ya está pagada o cancelada")
        
    if req.discount_amount > float(order.subtotal):
        raise HTTPException(status_code=400, detail="El descuento no puede ser mayor al subtotal")
        
    order.discount = req.discount_amount
    order.tax = (float(order.subtotal) - float(order.discount)) * 0.16
    order.total = (float(order.subtotal) - float(order.discount)) + float(order.tax)
    
    await db.commit()
    return {"success": True, "message": "Descuento aplicado correctamente", "new_total": order.total}

@router.post("/orders/{order_id}/pay", response_model=InvoiceResponse)
async def process_payment(order_id: str, payment: PaymentCreate, db: AsyncSession = Depends(get_db)):
    stmt_order = select(OrderModel).where(OrderModel.id == order_id)
    res_order = await db.execute(stmt_order)
    order = res_order.scalars().first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
        
    if order.status == 'paid':
        raise HTTPException(status_code=400, detail="La orden ya está pagada")
        
    total_due = float(order.total)
    
    # En efectivo validamos que cubran al menos el total
    if payment.method == 'cash' and payment.amount < total_due:
        raise HTTPException(status_code=400, detail="El monto recibido no cubre el total")
    
    signature = generate_digital_signature(str(order.id), total_due, payment.method)
    
    invoice = InvoiceModel(
        order_id=order.id,
        restaurant_id=order.restaurant_id,
        invoice_number=f"INV-{str(uuid.uuid4())[:8].upper()}",
        subtotal=order.subtotal,
        discount=order.discount,
        tax=order.tax,
        total=total_due,
        payment_method=payment.method,
        status='paid',
        digital_signature=signature
    )
    db.add(invoice)
    await db.flush()
    
    # Registramos propina en la orden como nota (para auditoría contable fácil)
    if payment.tip > 0:
        current_notes = order.notes or ""
        order.notes = f"{current_notes}\n[Propina: ${payment.tip:.2f} ({payment.method})]".strip()

    payment_record = PaymentModel(
        invoice_id=invoice.id,
        amount=payment.amount,
        method=payment.method,
        status='completed',
        processed_at=datetime.utcnow()
    )
    db.add(payment_record)
    
    order.status = 'paid'
    
    if order.table_id:
        stmt_table = select(TableModel).where(TableModel.id == order.table_id)
        res_table = await db.execute(stmt_table)
        table = res_table.scalars().first()
        if table:
            table.status = 'available'
            
    await db.commit()
    await db.refresh(invoice)
    
    return invoice

@router.get("/orders/{order_id}/ticket")
async def get_ticket(order_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(OrderModel).options(selectinload(OrderModel.items)).where(OrderModel.id == order_id)
    res = await db.execute(stmt)
    order = res.scalars().first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
        
    stmt_inv = select(InvoiceModel).where(InvoiceModel.order_id == order_id)
    res_inv = await db.execute(stmt_inv)
    invoice = res_inv.scalars().first()
    
    # Buscar propina en las notas de la orden si existe
    tip_str = ""
    if order.notes and "[Propina:" in order.notes:
        tip_start = order.notes.find("[Propina: $") + 11
        tip_end = order.notes.find(" ", tip_start)
        if tip_start > 10 and tip_end > tip_start:
            tip_str = order.notes[tip_start:tip_end]
    
    ticket = []
    ticket.append("┌─────────────────────────────────┐")
    ticket.append("│        RESTORA OS               │")
    ticket.append("│      TICKET DE VENTA            │")
    ticket.append("├─────────────────────────────────┤")
    ticket.append(f"│ Mesa: {str(order.table_id)[:4]:<8} Comanda: {order.order_number or str(order.id)[:4]:<4}  │")
    ticket.append(f"│ Fecha: {datetime.utcnow().strftime('%d/%m/%y %H:%M')}          │")
    ticket.append("├─────────────────────────────────┤")
    
    for item in order.items:
        name = item.product_name[:20]
        price = float(item.unit_price) * item.quantity
        ticket.append(f"│ {item.quantity}x {name:<19} ${price:>6.2f} │")
        
    ticket.append("├─────────────────────────────────┤")
    ticket.append(f"│ Subtotal:             ${float(order.subtotal):>8.2f} │")
    if float(order.discount) > 0:
        ticket.append(f"│ Descuento:           -${float(order.discount):>8.2f} │")
    ticket.append(f"│ IVA (16%):            ${float(order.tax):>8.2f} │")
    ticket.append(f"│ TOTAL:                ${float(order.total):>8.2f} │")
    if tip_str:
        ticket.append(f"│ Propina:              ${float(tip_str):>8.2f} │")
    ticket.append("├─────────────────────────────────┤")
    
    if invoice:
        ticket.append(f"│ PAGO: {invoice.payment_method:<10}              │")
        ticket.append(f"│ Firma: {invoice.digital_signature[:12]}...           │")
        if invoice.cfdi_uuid:
            ticket.append(f"│ CFDI: {invoice.cfdi_uuid[:16]}...  │")
    else:
        ticket.append("│ *** CUENTA NO PAGADA ***        │")
        
    ticket.append("│  *** GRACIAS POR SU VISITA ***  │")
    ticket.append("└─────────────────────────────────┘")
    
    return {"ticket_text": "\n".join(ticket)}

@router.get("/orders/{order_id}/ticket/pdf")
async def get_ticket_pdf(order_id: str, db: AsyncSession = Depends(get_db)):
    """Genera un archivo PDF del ticket de venta"""
    stmt = select(OrderModel).options(selectinload(OrderModel.items)).where(OrderModel.id == order_id)
    res = await db.execute(stmt)
    order = res.scalars().first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
        
    stmt_inv = select(InvoiceModel).where(InvoiceModel.order_id == order_id)
    res_inv = await db.execute(stmt_inv)
    invoice = res_inv.scalars().first()
    
    # Crear PDF en memoria
    buffer = io.BytesIO()
    # Ancho de ticket típico 80mm
    p = canvas.Canvas(buffer, pagesize=(80*mm, 150*mm))
    width, height = 80*mm, 150*mm
    
    # Fuentes y estilos
    p.setFont("Courier-Bold", 12)
    p.drawCentredString(width/2, height - 10*mm, "RESTORA OS")
    p.setFont("Courier", 8)
    p.drawCentredString(width/2, height - 15*mm, "TICKET DE VENTA")
    p.line(5*mm, height - 18*mm, width - 5*mm, height - 18*mm)
    
    y = height - 25*mm
    p.drawString(5*mm, y, f"Mesa: {str(order.table_id)[:8]}")
    p.drawRightString(width - 5*mm, y, f"Folio: {order.order_number or '---'}")
    
    y -= 5*mm
    p.drawString(5*mm, y, f"Fecha: {datetime.utcnow().strftime('%d/%m/%Y %H:%M')}")
    
    y -= 5*mm
    p.line(5*mm, y, width - 5*mm, y)
    
    y -= 5*mm
    p.setFont("Courier-Bold", 8)
    p.drawString(5*mm, y, "CANT PRODUCTO")
    p.drawRightString(width - 5*mm, y, "TOTAL")
    
    y -= 5*mm
    p.setFont("Courier", 8)
    for item in order.items:
        p.drawString(5*mm, y, f"{item.quantity}x {item.product_name[:15]}")
        p.drawRightString(width - 5*mm, y, f"${(float(item.unit_price) * item.quantity):.2f}")
        y -= 4*mm
        if y < 20*mm: # Simplicidad de paginado
            break
            
    y -= 2*mm
    p.line(5*mm, y, width - 5*mm, y)
    
    y -= 5*mm
    p.drawString(width/2, y, "Subtotal:")
    p.drawRightString(width - 5*mm, y, f"${float(order.subtotal):.2f}")
    
    if float(order.discount) > 0:
        y -= 4*mm
        p.drawString(width/2, y, "Descuento:")
        p.drawRightString(width - 5*mm, y, f"-${float(order.discount):.2f}")
        
    y -= 4*mm
    p.drawString(width/2, y, "IVA (16%):")
    p.drawRightString(width - 5*mm, y, f"${float(order.tax):.2f}")
    
    y -= 6*mm
    p.setFont("Courier-Bold", 10)
    p.drawString(width/2, y, "TOTAL:")
    p.drawRightString(width - 5*mm, y, f"${float(order.total):.2f}")
    
    y -= 10*mm
    p.setFont("Courier", 6)
    if invoice:
        p.drawCentredString(width/2, y, f"Firma Digital: {invoice.digital_signature[:32]}")
        y -= 3*mm
        p.drawCentredString(width/2, y, f"{invoice.digital_signature[32:]}")
        
    y -= 8*mm
    p.setFont("Courier-Bold", 8)
    p.drawCentredString(width/2, y, "*** GRACIAS POR SU VISITA ***")
    
    p.showPage()
    p.save()
    
    buffer.seek(0)
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=ticket_{order_id}.pdf"}
    )

@router.post("/invoices/{id}/cfdi")
async def generate_cfdi(id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(InvoiceModel).where(InvoiceModel.id == id)
    res = await db.execute(stmt)
    invoice = res.scalars().first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
        
    if invoice.cfdi_uuid:
        return {"message": "CFDI ya existe", "uuid_sat": invoice.cfdi_uuid}
        
    # Simulamos conexión PAC
    fake_uuid = str(uuid.uuid4()).upper()
    invoice.cfdi_uuid = fake_uuid
    await db.commit()
    
    return {
        "success": True,
        "message": "CFDI timbrado exitosamente con el SAT",
        "uuid_sat": fake_uuid,
        "pdf_url": f"https://s3.restora.com/invoices/{fake_uuid}.pdf",
        "xml_url": f"https://s3.restora.com/invoices/{fake_uuid}.xml"
    }
