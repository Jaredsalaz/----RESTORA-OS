import asyncio
import asyncpg

async def fix_data():
    try:
        conn = await asyncpg.connect('postgresql://postgres:Neymar18*@localhost/restora_db')
        
        # 1. Obtener la primera mesa disponible
        table_id = await conn.fetchval("SELECT id FROM tables LIMIT 1")
        
        if table_id:
            # 2. Actualizar órdenes sin mesa
            res = await conn.execute("UPDATE orders SET table_id = $1 WHERE table_id IS NULL", table_id)
            print(f"Resultado: {res}. Órdenes actualizadas con la mesa {table_id}")
        else:
            print("No se encontró ninguna mesa en la DB para asignar.")
            
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(fix_data())
