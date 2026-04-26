from typing import Optional
from uuid import UUID, uuid4
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class User(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    company_id: UUID
    restaurant_id: Optional[UUID] = None
    email: EmailStr
    password_hash: str
    full_name: str
    role: str
    pin_code: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
