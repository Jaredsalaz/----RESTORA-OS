from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings

app = FastAPI(
    title="Restora OS API",
    description="API for Restora OS SaaS Restaurant Management System",
    version="0.1.0",
)

from fastapi.staticfiles import StaticFiles

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

from starlette.middleware.base import BaseHTTPMiddleware
# from src.shared.security.rate_limiter import rate_limit_middleware

# app.add_middleware(BaseHTTPMiddleware, dispatch=rate_limit_middleware)

from .adapters.api.v1 import orders, menu, tables, payments, reports, auth, admin
from .adapters.api.v1.websockets import kitchen_ws

app.include_router(admin.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(orders.router, prefix="/api/v1")
app.include_router(menu.router, prefix="/api/v1")
app.include_router(tables.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(kitchen_ws.router) # WebSockets no llevan prefijo /api/v1 usualmente

@app.get("/health")
async def health_check():
    return {"status": "ok", "environment": settings.ENVIRONMENT}
