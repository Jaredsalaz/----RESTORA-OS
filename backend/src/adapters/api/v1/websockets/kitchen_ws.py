from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List

router = APIRouter(tags=["WebSockets"])

class ConnectionManager:
    def __init__(self):
        # { "restaurant_id": [ws1, ws2, ...] }
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, restaurant_id: str):
        await websocket.accept()
        if restaurant_id not in self.active_connections:
            self.active_connections[restaurant_id] = []
        self.active_connections[restaurant_id].append(websocket)

    def disconnect(self, websocket: WebSocket, restaurant_id: str):
        if restaurant_id in self.active_connections:
            self.active_connections[restaurant_id].remove(websocket)
            if len(self.active_connections[restaurant_id]) == 0:
                del self.active_connections[restaurant_id]

    async def broadcast_to_restaurant(self, message: str, restaurant_id: str):
        if restaurant_id in self.active_connections:
            for connection in self.active_connections[restaurant_id]:
                await connection.send_text(message)

manager = ConnectionManager()

@router.websocket("/ws/kitchen/{restaurant_id}")
async def kitchen_websocket_endpoint(websocket: WebSocket, restaurant_id: str):
    await manager.connect(websocket, restaurant_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Si la cocina envía un mensaje (ej: "Item 1 listo"), se puede transmitir a todos
            await manager.broadcast_to_restaurant(f"Kitchen Update: {data}", restaurant_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, restaurant_id)

@router.websocket("/ws/tables/{restaurant_id}")
async def tables_websocket_endpoint(websocket: WebSocket, restaurant_id: str):
    await manager.connect(websocket, restaurant_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, restaurant_id)

@router.websocket("/ws/orders/{restaurant_id}")
async def orders_websocket_endpoint(websocket: WebSocket, restaurant_id: str):
    await manager.connect(websocket, restaurant_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, restaurant_id)

async def notify_kitchen_new_order(restaurant_id: str, order_data: str):
    """ Función auxiliar para ser llamada desde orders.py cuando hay nueva comanda """
    await manager.broadcast_to_restaurant(order_data, restaurant_id)
