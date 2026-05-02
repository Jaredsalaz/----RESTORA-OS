from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List

router = APIRouter(tags=["WebSockets"])

class ConnectionManager:
    def __init__(self):
        # { "restaurant_id": [ws1, ws2, ...] }
        self.kitchen_connections: Dict[str, List[WebSocket]] = {}
        self.waiter_connections: Dict[str, List[WebSocket]] = {}
        self.table_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, restaurant_id: str, channel: str = "kitchen"):
        await websocket.accept()
        pool = self._get_pool(channel)
        if restaurant_id not in pool:
            pool[restaurant_id] = []
        pool[restaurant_id].append(websocket)

    def disconnect(self, websocket: WebSocket, restaurant_id: str, channel: str = "kitchen"):
        pool = self._get_pool(channel)
        if restaurant_id in pool:
            if websocket in pool[restaurant_id]:
                pool[restaurant_id].remove(websocket)
            if len(pool[restaurant_id]) == 0:
                del pool[restaurant_id]

    async def broadcast(self, message: str, restaurant_id: str, channel: str = "kitchen"):
        pool = self._get_pool(channel)
        if restaurant_id in pool:
            dead = []
            for conn in pool[restaurant_id]:
                try:
                    await conn.send_text(message)
                except Exception:
                    dead.append(conn)
            for d in dead:
                pool[restaurant_id].remove(d)

    def _get_pool(self, channel: str) -> Dict[str, List[WebSocket]]:
        if channel == "kitchen":
            return self.kitchen_connections
        elif channel == "waiter":
            return self.waiter_connections
        elif channel == "tables":
            return self.table_connections
        return self.kitchen_connections

manager = ConnectionManager()

# ─── WebSocket para COCINA (KDS) ─────────────
@router.websocket("/ws/kitchen/{restaurant_id}")
async def kitchen_websocket_endpoint(websocket: WebSocket, restaurant_id: str):
    await manager.connect(websocket, restaurant_id, "kitchen")
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(f"Kitchen Update: {data}", restaurant_id, "kitchen")
    except WebSocketDisconnect:
        manager.disconnect(websocket, restaurant_id, "kitchen")

# ─── WebSocket para MESEROS (notificaciones) ──
@router.websocket("/ws/waiter/{restaurant_id}")
async def waiter_websocket_endpoint(websocket: WebSocket, restaurant_id: str):
    await manager.connect(websocket, restaurant_id, "waiter")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, restaurant_id, "waiter")

# ─── WebSocket para MESAS (mapa en tiempo real) ──
@router.websocket("/ws/tables/{restaurant_id}")
async def tables_websocket_endpoint(websocket: WebSocket, restaurant_id: str):
    await manager.connect(websocket, restaurant_id, "tables")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, restaurant_id, "tables")

@router.websocket("/ws/orders/{restaurant_id}")
async def orders_websocket_endpoint(websocket: WebSocket, restaurant_id: str):
    await manager.connect(websocket, restaurant_id, "kitchen")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, restaurant_id, "kitchen")

# ─── Funciones auxiliares para llamar desde otros módulos ──

async def notify_kitchen_new_order(restaurant_id: str, order_data: str):
    """Notifica a la cocina de una nueva comanda"""
    await manager.broadcast(order_data, restaurant_id, "kitchen")

async def notify_waiter_order_ready(restaurant_id: str, message: str):
    """Notifica al mesero que su comanda esta lista"""
    await manager.broadcast(message, restaurant_id, "waiter")

async def notify_table_freed(restaurant_id: str, message: str):
    """Notifica que una mesa fue liberada (actualizar mapa)"""
    await manager.broadcast(message, restaurant_id, "tables")
