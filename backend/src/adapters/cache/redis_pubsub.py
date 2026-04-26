import json
import redis.asyncio as redis
from src.config import settings

# Conexión asíncrona a Redis para Pub/Sub
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

async def publish_event(restaurant_id: str, event_type: str, data: dict):
    """
    Publica un evento en un canal específico del restaurante.
    Ej: channel = "restaurant:b2222222-2222-2222-2222-222222222222"
    """
    channel = f"restaurant:{restaurant_id}"
    message = json.dumps({
        "event_type": event_type,
        "data": data
    })
    await redis_client.publish(channel, message)

async def subscribe_to_restaurant(restaurant_id: str):
    """
    Se suscribe a los eventos del restaurante.
    Retorna el objeto pubsub de redis.
    """
    pubsub = redis_client.pubsub()
    channel = f"restaurant:{restaurant_id}"
    await pubsub.subscribe(channel)
    return pubsub
