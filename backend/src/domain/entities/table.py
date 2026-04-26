from typing import Optional
from uuid import UUID, uuid4
from pydantic import BaseModel, Field

class Table(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    restaurant_id: UUID
    name: str
    section: Optional[str] = None
    capacity: int = 4
    status: str = "available"
    qr_code: Optional[str] = None
    position_x: Optional[int] = None
    position_y: Optional[int] = None
