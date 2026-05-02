"""
Crear el usuario SuperAdmin (Dueño del software)
Este script se ejecuta UNA VEZ para crear al dios del sistema.
"""
import asyncio
import asyncpg
import bcrypt

async def create_superadmin():
    conn = await asyncpg.connect('postgresql://postgres:Neymar18*@localhost/restora_db')
    
    email = "superadmin@restora.com"
    password = "RestoraMaster2026!"
    full_name = "Super Administrador"
    role = "superadmin"
    
    # Verificar si ya existe
    existing = await conn.fetchrow("SELECT id FROM users WHERE email = $1", email)
    if existing:
        print(f"[OK] SuperAdmin ya existe con ID: {existing['id']}")
        await conn.close()
        return
    
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    await conn.execute("""
        INSERT INTO users (email, password_hash, full_name, role, is_active)
        VALUES ($1, $2, $3, $4, true)
    """, email, hashed, full_name, role)
    
    print("[OK] SuperAdmin creado exitosamente:")
    print(f"     Email: {email}")
    print(f"     Password: {password}")
    print(f"     Rol: {role}")
    print("")
    print("[!] Guarda estas credenciales en un lugar seguro.")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(create_superadmin())
