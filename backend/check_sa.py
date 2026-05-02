import asyncio, asyncpg

async def check():
    conn = await asyncpg.connect('postgresql://postgres:Neymar18*@localhost/restora_db')
    row = await conn.fetchrow("SELECT email, role, full_name FROM users WHERE id = 'c3333333-3333-3333-3333-333333333333'")
    if row:
        print(f"Email: {row['email']}")
        print(f"Role: {row['role']}")
        print(f"Name: {row['full_name']}")
    else:
        print("User not found")
    await conn.close()

asyncio.run(check())
