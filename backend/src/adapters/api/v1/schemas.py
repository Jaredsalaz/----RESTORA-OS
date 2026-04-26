from pydantic import BaseModel
from typing import List, Optional, Any
from uuid import UUID
from datetime import datetime

# --- SCHEMAS FOR MENU ---
class CategoryBase(BaseModel):
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None

class CategoryResponse(CategoryBase):
    id: UUID
    restaurant_id: UUID
    sort_order: int
    is_active: bool
    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    category_id: UUID
    prep_time_min: int = 10

class ProductResponse(ProductBase):
    id: UUID
    restaurant_id: UUID
    is_available: bool
    tags: Optional[List[str]] = []
    class Config:
        from_attributes = True

# --- SCHEMAS FOR TABLES ---
class TableBase(BaseModel):
    name: str
    section: Optional[str] = None
    capacity: int = 4

class TableResponse(TableBase):
    id: UUID
    restaurant_id: UUID
    status: str
    position_x: Optional[int] = None
    position_y: Optional[int] = None
    class Config:
        from_attributes = True

# --- SCHEMAS FOR ORDERS ---
class OrderItemCreate(BaseModel):
    product_id: UUID
    product_name: str
    unit_price: float
    quantity: int = 1
    modifiers: Optional[List[Any]] = []
    notes: Optional[str] = None

class OrderCreate(BaseModel):
    restaurant_id: UUID
    table_id: UUID
    waiter_id: UUID
    guests: int = 1
    notes: Optional[str] = None
    items: List[OrderItemCreate] = []

class OrderItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    product_name: str
    unit_price: float
    quantity: int
    modifiers: Optional[List[Any]] = []
    notes: Optional[str] = None
    status: str
    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: UUID
    restaurant_id: UUID
    table_id: UUID
    waiter_id: UUID
    order_number: Optional[int] = None
    status: str
    notes: Optional[str] = None
    guests: int
    subtotal: float
    discount: float
    tax: float
    total: float
    created_at: Optional[datetime] = None
    items: List[OrderItemResponse] = []
    class Config:
        from_attributes = True

# --- SCHEMAS FOR ADMIN ---
class CompanyCreate(BaseModel):
    name: str
    rfc: Optional[str] = None
    plan: str = "starter"

class CompanyResponse(CompanyCreate):
    id: UUID
    status: str
    class Config:
        from_attributes = True

class RestaurantCreate(BaseModel):
    company_id: UUID
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None

class RestaurantResponse(RestaurantCreate):
    id: UUID
    class Config:
        from_attributes = True

# --- SCHEMAS FOR PAYMENTS & INVOICES ---
class PaymentCreate(BaseModel):
    method: str  # cash, card, transfer
    amount: float
    tip: float = 0.0

class PaymentResponse(BaseModel):
    id: UUID
    invoice_id: UUID
    amount: float
    method: str
    status: str
    class Config:
        from_attributes = True

class InvoiceResponse(BaseModel):
    id: UUID
    order_id: UUID
    restaurant_id: UUID
    invoice_number: str
    subtotal: float
    discount: float
    tax: float
    total: float
    payment_method: str
    status: str
    digital_signature: Optional[str] = None
    cfdi_uuid: Optional[str] = None
    issued_at: datetime
    class Config:
        from_attributes = True

class DiscountCreate(BaseModel):
    pin: str
    discount_amount: float
