from typing import Optional, List
from uuid import UUID, uuid4
from pydantic import BaseModel, Field
from datetime import datetime

class OrderItem(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    order_id: UUID
    product_id: UUID
    product_name: str
    unit_price: float
    quantity: int = 1
    modifiers: list = Field(default_factory=list)
    notes: Optional[str] = None
    status: str = "pending"
    sent_to_kitchen_at: Optional[datetime] = None
    prepared_at: Optional[datetime] = None

class Order(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    restaurant_id: UUID
    table_id: Optional[UUID] = None
    waiter_id: Optional[UUID] = None
    order_number: Optional[int] = None
    status: str = "open"
    notes: Optional[str] = None
    guests: int = 1
    subtotal: float = 0.0
    discount: float = 0.0
    tax: float = 0.0
    total: float = 0.0
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    closed_at: Optional[datetime] = None
    items: List[OrderItem] = Field(default_factory=list)
