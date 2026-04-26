from sqlalchemy import Column, String, Integer, Numeric, Boolean, ForeignKey, DateTime, Text, JSON, text
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.adapters.persistence.database import Base

class CategoryModel(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    restaurant_id = Column(UUID(as_uuid=True), ForeignKey("restaurants.id"), nullable=False)
    name = Column(String(100), nullable=False)
    icon = Column(String(50))
    color = Column(String(7))
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    products = relationship("ProductModel", back_populates="category")

class ProductModel(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    restaurant_id = Column(UUID(as_uuid=True), ForeignKey("restaurants.id"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    price = Column(Numeric(10, 2), nullable=False)
    image_url = Column(Text)
    sku = Column(String(100))
    is_available = Column(Boolean, default=True)
    prep_time_min = Column(Integer, default=10)
    tags = Column(ARRAY(String))
    modifiers = Column(JSON, default=list)
    sort_order = Column(Integer, default=0)

    category = relationship("CategoryModel", back_populates="products")

class TableModel(Base):
    __tablename__ = "tables"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    restaurant_id = Column(UUID(as_uuid=True), ForeignKey("restaurants.id"), nullable=False)
    name = Column(String(50), nullable=False)
    section = Column(String(100))
    capacity = Column(Integer, default=4)
    status = Column(String(20), default='available')
    qr_code = Column(Text)
    position_x = Column(Integer)
    position_y = Column(Integer)

class CompanyModel(Base):
    __tablename__ = "companies"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    name = Column(String(200), nullable=False)
    rfc = Column(String(20))
    plan = Column(String(50), default='starter')
    status = Column(String(20), default='active')

class RestaurantModel(Base):
    __tablename__ = "restaurants"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"))
    name = Column(String(200), nullable=False)
    address = Column(Text)
    phone = Column(String(20))

class UserModel(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    restaurant_id = Column(UUID(as_uuid=True), ForeignKey("restaurants.id"))
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    full_name = Column(String(200), nullable=False)
    role = Column(String(30), nullable=False)
    pin_code = Column(Text)
    is_active = Column(Boolean, default=True)

class OrderModel(Base):
    __tablename__ = "orders"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    restaurant_id = Column(UUID(as_uuid=True), ForeignKey("restaurants.id"), nullable=False)
    table_id = Column(UUID(as_uuid=True), ForeignKey("tables.id"))
    waiter_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    order_number = Column(Integer, server_default=text("nextval('orders_order_number_seq')"))
    status = Column(String(30), default='open')
    notes = Column(Text)
    guests = Column(Integer, default=1)
    subtotal = Column(Numeric(10, 2))
    discount = Column(Numeric(10, 2), default=0)
    tax = Column(Numeric(10, 2))
    total = Column(Numeric(10, 2))
    created_at = Column(DateTime, server_default=func.now())
    
    items = relationship("OrderItemModel", back_populates="order", cascade="all, delete-orphan")

class OrderItemModel(Base):
    __tablename__ = "order_items"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))
    product_name = Column(String(200))
    unit_price = Column(Numeric(10, 2))
    quantity = Column(Integer, default=1)
    modifiers = Column(JSON, default=list)
    notes = Column(Text)
    status = Column(String(20), default='pending')

    order = relationship("OrderModel", back_populates="items")

class InvoiceModel(Base):
    __tablename__ = "invoices"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"))
    restaurant_id = Column(UUID(as_uuid=True), ForeignKey("restaurants.id"))
    invoice_number = Column(String(50), unique=True)
    subtotal = Column(Numeric(10, 2))
    discount = Column(Numeric(10, 2), default=0)
    tax = Column(Numeric(10, 2))
    total = Column(Numeric(10, 2))
    payment_method = Column(String(30))
    status = Column(String(20), default='issued')
    digital_signature = Column(Text)
    cfdi_uuid = Column(String(100))
    issued_at = Column(DateTime, server_default=func.now())
    pdf_url = Column(Text)

class PaymentModel(Base):
    __tablename__ = "payments"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id"))
    amount = Column(Numeric(10, 2), nullable=False)
    method = Column(String(30))
    reference = Column(String(200))
    gateway = Column(String(50))
    status = Column(String(20))
    processed_at = Column(DateTime)

class DailySummaryModel(Base):
    __tablename__ = "daily_summaries"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    restaurant_id = Column(UUID(as_uuid=True), ForeignKey("restaurants.id"))
    date = Column(DateTime, nullable=False) # Should be Date, but DateTime works
    total_orders = Column(Integer, default=0)
    total_revenue = Column(Numeric(12, 2), default=0)
    total_tax = Column(Numeric(12, 2), default=0)
    total_discount = Column(Numeric(12, 2), default=0)
    cash_total = Column(Numeric(12, 2), default=0)
    card_total = Column(Numeric(12, 2), default=0)
    avg_ticket = Column(Numeric(10, 2), default=0)
    top_products = Column(JSON, default=list)

class AuditLogModel(Base):
    __tablename__ = "audit_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    action = Column(String(100))
    entity = Column(String(50))
    entity_id = Column(UUID(as_uuid=True))
    details = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())

class ShiftModel(Base):
    __tablename__ = "shifts"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    restaurant_id = Column(UUID(as_uuid=True), ForeignKey("restaurants.id"))
    clock_in = Column(DateTime, server_default=func.now())
    clock_out = Column(DateTime)
    status = Column(String(20), default='active')
