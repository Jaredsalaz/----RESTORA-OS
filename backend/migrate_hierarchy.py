import asyncio
import asyncpg

async def migrate():
    conn = await asyncpg.connect('postgresql://postgres:Neymar18*@localhost/restora_db')
    
    # 1. Verificar company_id en users
    cols = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='company_id'")
    if cols:
        print("[OK] company_id ya existe en users")
    else:
        await conn.execute("ALTER TABLE users ADD COLUMN company_id UUID REFERENCES companies(id)")
        print("[OK] company_id agregado a users")
    
    # 2. Verificar created_at en companies
    cols2 = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name='companies' AND column_name='created_at'")
    if cols2:
        print("[OK] created_at ya existe en companies")
    else:
        await conn.execute("ALTER TABLE companies ADD COLUMN created_at TIMESTAMP DEFAULT NOW()")
        print("[OK] created_at agregado a companies")
    
    # 3. Vincular users existentes con su company
    updated = await conn.execute("""
        UPDATE users u SET company_id = r.company_id
        FROM restaurants r WHERE u.restaurant_id = r.id AND u.company_id IS NULL
    """)
    print(f"[OK] Usuarios actualizados: {updated}")
    
    await conn.close()
    print("[DONE] Migracion completada.")

if __name__ == "__main__":
    asyncio.run(migrate())
