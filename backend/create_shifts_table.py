import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:Neymar18*@localhost/restora_db"

async def main():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS shifts (
                id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id       UUID REFERENCES users(id),
                restaurant_id UUID REFERENCES restaurants(id),
                clock_in      TIMESTAMPTZ DEFAULT now(),
                clock_out     TIMESTAMPTZ,
                status        VARCHAR(20) DEFAULT 'active'
            );
        """))
    print("Table created successfully")

if __name__ == '__main__':
    asyncio.run(main())
