from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    """
    Manages active WebSocket connections mapped to channels.
    Allows real-time messaging by broadcasting messages to all connected clients in a channel.
    """
    def __init__(self) -> None:
        # Key: channel_id (int), Value: list of active WebSockets
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel_id: int) -> None:
        """
        Accepts the connection and registers it to the specific channel list.
        """
        await websocket.accept()
        if channel_id not in self.active_connections:
            self.active_connections[channel_id] = []
        self.active_connections[channel_id].append(websocket)

    def disconnect(self, websocket: WebSocket, channel_id: int) -> None:
        """
        Removes a disconnected websocket from the channel connection list.
        """
        if channel_id in self.active_connections:
            if websocket in self.active_connections[channel_id]:
                self.active_connections[channel_id].remove(websocket)
            # Cleanup channel dictionary key if no users are connected
            if not self.active_connections[channel_id]:
                del self.active_connections[channel_id]

    async def broadcast_to_channel(self, message: dict, channel_id: int) -> None:
        """
        Sends a JSON payload asynchronously to all connections active in the channel.
        """
        if channel_id in self.active_connections:
            for connection in self.active_connections[channel_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    # Safe handling for socket failures on dead connections
                    pass

# Global instance of Connection Manager
manager = ConnectionManager()
