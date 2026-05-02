import asyncio
import asyncpg

async def update_menu_images():
    try:
        conn = await asyncpg.connect('postgresql://postgres:Neymar18*@localhost/restora_db')
        
        images = {
            'Agua Fresca de Jamaica': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=500',
            'Limonada Mineral': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=500',
            'Tacos al Pastor (Orden)': 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?q=80&w=500',
            'Hamburguesa Clásica': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=500',
            'Pastel de Chocolate': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=500'
        }
        
        for name, url in images.items():
            res = await conn.execute("UPDATE products SET image_url = $1 WHERE name = $2", url, name)
            print(f"Producto '{name}' actualizado: {res}")
            
        await conn.close()
        print("\n¡Proceso terminado! Refresca tu menú.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(update_menu_images())
