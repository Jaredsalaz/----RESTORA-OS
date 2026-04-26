from fastapi import Request
from starlette.responses import JSONResponse
from src.adapters.cache.redis_pubsub import redis_client

async def rate_limit_middleware(request: Request, call_next):
    """
    Middleware de Rate Limiting por IP usando Redis.
    Limita a 150 peticiones por minuto por IP para mitigar ataques DDoS o fuerza bruta.
    """
    client_ip = request.client.host if request.client else "unknown"
    key = f"rate_limit:{client_ip}"
    
    try:
        current_count = await redis_client.incr(key)
        if current_count == 1:
            await redis_client.expire(key, 60) # Expira en 60 segundos
            
        if current_count > 150:
            return JSONResponse(status_code=429, content={"detail": "Too Many Requests. Rate limit exceeded."})
    except Exception:
        # Fallback silencioso si Redis falla temporalmente, no queremos tumbar la app
        pass
        
    response = await call_next(request)
    return response
