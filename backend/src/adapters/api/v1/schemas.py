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
    tags: Optional[List[str]] = []

class ProductResponse(ProductBase):
    id: UUID
    restaurant_id: UUID
    is_available: bool
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
    table_id: Optional[UUID] = None
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
    slug: Optional[str] = None
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

# --- SCHEMAS FOR REPORTS ---
class DashboardStats(BaseModel):
    today_revenue: float
    today_orders: int
    customers_today: int
    avg_ticket: float
    revenue_growth: float # Porcentaje vs ayer
    top_products: List[Any]
    waiter_ranking: List[Any]

class SalesSummary(BaseModel):
    date: str
    revenue: float
    orders: int

class WaiterPerformance(BaseModel):
    waiter_name: str
    total_sales: float
    orders_count: int

class ProductSales(BaseModel):
    product_name: str
    quantity: int
    total_revenue: float

# --- SCHEMAS FOR USERS ---
class UserBase(BaseModel):
    full_name: str
    email: str
    role: str # superadmin, admin_empresa, gerente, cajero, mesero, cocina
    is_active: bool = True

class UserCreate(UserBase):
    password: str
    pin_code: Optional[str] = None
    company_id: Optional[UUID] = None
    restaurant_id: Optional[UUID] = None

class UserResponse(UserBase):
    id: UUID
    company_id: Optional[UUID] = None
    restaurant_id: Optional[UUID] = None
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: str
    password: str

class PinLogin(BaseModel):
    pin: str
    restaurant_id: UUID
