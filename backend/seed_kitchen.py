import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect('postgresql://postgres:Neymar18*@localhost/restora_db')
    row = await conn.fetchrow("SELECT id, full_name, role, pin_code FROM users WHERE email = 'cocina@lapaloma.com'")
    if row:
        print(f"Found: {row['full_name']} | role={row['role']} | has_pin={bool(row['pin_code'])}")
    else:
        print("Not found")
    await conn.close()

asyncio.run(main())
#Usuario cocina	cocina@lapaloma.com / PIN: 0000 / role: kitchen