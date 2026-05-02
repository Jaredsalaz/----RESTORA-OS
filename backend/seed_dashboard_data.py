import asyncio
import asyncpg
from datetime import datetime, timedelta
import random

async def seed_real_data():
    try:
        conn = await asyncpg.connect('postgresql://postgres:Neymar18*@localhost/restora_db')
        
        # 1. Obtener restaurante y usuario (mesero o admin para las órdenes)
        restaurant = await conn.fetchrow("SELECT id FROM restaurants LIMIT 1")
        if not restaurant:
            print("Error: No hay restaurante.")
            await conn.close()
            return
        
        res_id = restaurant['id']
        
        user = await conn.fetchrow("SELECT id FROM users WHERE restaurant_id = $1 LIMIT 1", res_id)
        if not user:
            print("Error: No hay usuario para asignar órdenes.")
            await conn.close()
            return
            
        user_id = user['id']
        
        # 2. Obtener productos para crear items de comanda
        products = await conn.fetch("SELECT id, name, price FROM products WHERE restaurant_id = $1 LIMIT 10", res_id)
        if not products:
            print("Error: No hay productos. Crea algunos primero.")
            await conn.close()
            return
            
        # 3. Crear órdenes para los últimos 7 días
        print("Generando datos de ventas para los últimos 7 días...")
        
        for i in range(7):
            day = datetime.now() - timedelta(days=i)
            # Entre 3 y 8 órdenes por día
            num_orders = random.randint(3, 8)
            
            for _ in range(num_orders):
                # Crear la orden
                guests = random.randint(1, 6)
                order_id = await conn.fetchval("""
                    INSERT INTO orders (restaurant_id, waiter_id, status, guests, subtotal, tax, total, created_at)
                    VALUES ($1, $2, 'paid', $3, 0, 0, 0, $4)
                    RETURNING id
                """, res_id, user_id, guests, day)
                
                # Crear entre 1 y 4 items por orden
                total_order = 0
                for _ in range(random.randint(1, 4)):
                    prod = random.choice(products)
                    qty = random.randint(1, 3)
                    item_total = float(prod['price']) * qty
                    total_order += item_total
                    
                    await conn.execute("""
                        INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, status)
                        VALUES ($1, $2, $3, $4, $5, 'served')
                    """, order_id, prod['id'], prod['name'], prod['price'], qty)
                
                # Actualizar totales de la orden
                await conn.execute("""
                    UPDATE orders SET subtotal = $1, total = $1, tax = 0 WHERE id = $2
                """, total_order, order_id)
        
        print("¡Éxito! Datos reales generados.")
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(seed_real_data())
