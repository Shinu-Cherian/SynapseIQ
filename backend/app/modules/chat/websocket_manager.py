from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    """
    Manages active WebSocket connections mapped to workspaces.
    Allows real-time messaging by broadcasting messages to all connected clients in a workspace.
    """
    def __init__(self) -> None:
        # Key: workspace_id (str), Value: Dict of WebSocket -> user_id
        self.active_connections: Dict[str, Dict[WebSocket, int]] = {}

    async def connect(self, websocket: WebSocket, workspace_id: str, user_id: int) -> None:
        """
        Accepts the connection and registers it to the specific workspace list along with the user_id.
        """
        await websocket.accept()
        if workspace_id not in self.active_connections:
            self.active_connections[workspace_id] = {}
        self.active_connections[workspace_id][websocket] = user_id
        
        # Broadcast that user is online
        await self.broadcast_to_workspace({
            "type": "USER_ONLINE",
            "user_id": user_id
        }, workspace_id)

    async def disconnect(self, websocket: WebSocket, workspace_id: str) -> None:
        """
        Removes a disconnected websocket from the workspace connection list and broadcasts offline status.
        """
        if workspace_id in self.active_connections:
            if websocket in self.active_connections[workspace_id]:
                user_id = self.active_connections[workspace_id][websocket]
                del self.active_connections[workspace_id][websocket]
                
                # Check if user has other active connections (e.g., multiple tabs)
                user_still_active = any(uid == user_id for uid in self.active_connections[workspace_id].values())
                
                # Broadcast offline only if all their connections are closed
                if not user_still_active:
                    await self.broadcast_to_workspace({
                        "type": "USER_OFFLINE",
                        "user_id": user_id
                    }, workspace_id)
            # Cleanup workspace dictionary key if no users are connected
            if not self.active_connections[workspace_id]:
                del self.active_connections[workspace_id]

    async def broadcast_to_workspace(self, message: dict, workspace_id: str) -> None:
        """
        Sends a JSON payload asynchronously to all connections active in the workspace.
        """
        if workspace_id in self.active_connections:
            for connection in list(self.active_connections[workspace_id].keys()):
                try:
                    await connection.send_json(message)
                except Exception:
                    # Safe handling for socket failures on dead connections
                    pass

    def get_online_users(self, workspace_id: str) -> List[int]:
        """
        Returns a list of unique user IDs currently connected to the workspace.
        """
        if workspace_id in self.active_connections:
            return list(set(self.active_connections[workspace_id].values()))
        return []

# Global instance of Connection Manager
manager = ConnectionManager()
