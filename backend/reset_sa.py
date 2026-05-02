import asyncio
import asyncpg
import bcrypt

async def reset_superadmin():
    conn = await asyncpg.connect('postgresql://postgres:Neymar18*@localhost/restora_db')
    email = "superadmin@restora.com"
    password = "RestoraMaster2026!"
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    await conn.execute("UPDATE users SET password_hash = $1 WHERE email = $2", hashed, email)
    print("Password updated successfully.")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(reset_superadmin())
