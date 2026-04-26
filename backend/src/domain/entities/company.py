from typing import Optional
from uuid import UUID, uuid4
from pydantic import BaseModel, Field
from datetime import datetime

class Company(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    rfc: Optional[str] = None
    plan: str = "starter"
    status: str = "active"
    logo_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None
    settings: dict = Field(default_factory=dict)
