import asyncio
import asyncpg
import bcrypt

async def seed_manager():
    try:
        conn = await asyncpg.connect('postgresql://postgres:Neymar18*@localhost/restora_db')
        
        # Obtener un restaurante
        restaurant = await conn.fetchrow("SELECT id FROM restaurants LIMIT 1")
        if not restaurant:
            print("Error: No hay restaurantes en la base de datos.")
            await conn.close()
            return
            
        restaurant_id = restaurant['id']
        email = "gerente@restora.com"
        password = "admin"
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        full_name = "Gerente de Prueba"
        role = "admin" # En el backend, el rol admin tiene acceso al dashboard
        
        # Verificar si ya existe
        existing = await conn.fetchrow("SELECT id FROM users WHERE email = $1", email)
        if existing:
            print(f"El usuario {email} ya existe. Actualizando contraseña...")
            await conn.execute("UPDATE users SET password_hash = $1, role = $2 WHERE email = $3", hashed_password, role, email)
        else:
            await conn.execute("""
                INSERT INTO users (restaurant_id, email, password_hash, full_name, role, is_active)
                VALUES ($1, $2, $3, $4, $5, $6)
            """, restaurant_id, email, hashed_password, full_name, role, True)
            print(f"Usuario {email} creado exitosamente.")
            
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(seed_manager())
