from typing import Optional, List
from uuid import UUID, uuid4
from pydantic import BaseModel, Field

class Category(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    restaurant_id: UUID
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True

class Product(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    restaurant_id: UUID
    category_id: UUID
    name: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    sku: Optional[str] = None
    is_available: bool = True
    prep_time_min: int = 10
    tags: List[str] = Field(default_factory=list)
    modifiers: list = Field(default_factory=list)
    sort_order: int = 0
