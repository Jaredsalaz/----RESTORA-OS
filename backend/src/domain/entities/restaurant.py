from typing import Optional
from uuid import UUID, uuid4
from pydantic import BaseModel, Field

class Restaurant(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    company_id: UUID
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    timezone: str = "America/Mexico_City"
    currency: str = "MXN"
    logo_url: Optional[str] = None
    tax_rate: float = 16.00
    settings: dict = Field(default_factory=dict)
