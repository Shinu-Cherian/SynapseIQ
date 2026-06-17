import json
import asyncio
from typing import Dict, List
from fastapi import WebSocket
import redis.asyncio as redis
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

class ConnectionManager:
    """
    Manages active WebSocket connections mapped to workspaces using Redis Pub/Sub for horizontal scaling.
    Allows real-time messaging by broadcasting messages to all connected clients in a workspace,
    even across multiple server instances.
    """
    def __init__(self) -> None:
        # Key: workspace_id (str), Value: Dict of WebSocket -> user_id
        self.active_connections: Dict[str, Dict[WebSocket, int]] = {}
        # Upstash Redis requires ssl_cert_reqs="none" when using rediss://
        if REDIS_URL.startswith("rediss://"):
            self.redis = redis.from_url(REDIS_URL, ssl_cert_reqs="none")
        else:
            self.redis = redis.from_url(REDIS_URL)
        self.pubsub = self.redis.pubsub()
        self.listener_task = None

    async def start_listener(self):
        """Background task to listen to Redis channels and forward to WebSockets."""
        await self.pubsub.psubscribe("workspace_*")
        async for message in self.pubsub.listen():
            if message["type"] == "pmessage":
                channel = message["channel"].decode("utf-8")
                workspace_id = channel.replace("workspace_", "")
                if workspace_id in self.active_connections:
                    data = json.loads(message["data"])
                    # Send to all local connections in this workspace
                    for connection in list(self.active_connections[workspace_id].keys()):
                        try:
                            await connection.send_json(data)
                        except Exception:
                            pass

    async def connect(self, websocket: WebSocket, workspace_id: str, user_id: int) -> None:
        """
        Accepts the connection and registers it to the specific workspace list along with the user_id.
        Globally tracks presence using Redis.
        """
        await websocket.accept()
        if workspace_id not in self.active_connections:
            self.active_connections[workspace_id] = {}
            
        self.active_connections[workspace_id][websocket] = user_id
        
        if self.listener_task is None:
            self.listener_task = asyncio.create_task(self.start_listener())
            
        # Track global connection count in Redis
        conn_count = await self.redis.hincrby(f"user_connections_{workspace_id}", str(user_id), 1)
        
        # If this is their first connection globally, broadcast USER_ONLINE
        if conn_count == 1:
            await self.broadcast_to_workspace({
                "type": "USER_ONLINE",
                "user_id": user_id
            }, workspace_id)

    async def disconnect(self, websocket: WebSocket, workspace_id: str) -> None:
        """
        Removes a disconnected websocket from the workspace connection list.
        Decrements global presence count and broadcasts offline status if count reaches 0.
        """
        if workspace_id in self.active_connections:
            if websocket in self.active_connections[workspace_id]:
                user_id = self.active_connections[workspace_id][websocket]
                del self.active_connections[workspace_id][websocket]
                
                # Decrement global connection count in Redis
                conn_count = await self.redis.hincrby(f"user_connections_{workspace_id}", str(user_id), -1)
                
                # Broadcast offline only if all their global connections are closed
                if conn_count <= 0:
                    await self.redis.hdel(f"user_connections_{workspace_id}", str(user_id))
                    await self.broadcast_to_workspace({
                        "type": "USER_OFFLINE",
                        "user_id": user_id
                    }, workspace_id)
                    
            # Cleanup local workspace dictionary key if no users are connected to this worker
            if not self.active_connections[workspace_id]:
                del self.active_connections[workspace_id]

    async def broadcast_to_workspace(self, message: dict, workspace_id: str) -> None:
        """
        Publishes a JSON payload to Redis so all workers can broadcast it to active connections.
        """
        await self.redis.publish(f"workspace_{workspace_id}", json.dumps(message))

    async def get_online_users(self, workspace_id: str) -> List[int]:
        """
        Returns a list of unique user IDs currently connected to the workspace globally.
        """
        active_users_map = await self.redis.hgetall(f"user_connections_{workspace_id}")
        return [int(uid) for uid, count in active_users_map.items() if int(count) > 0]

# Global instance of Connection Manager
manager = ConnectionManager()
