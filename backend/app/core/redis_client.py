from typing import Optional
import redis
from app.core.config import settings

class RedisManager:
    """
    Manages Redis connection pooling and exposes basic caching and rate limiting API.
    """
    def __init__(self) -> None:
        self.pool: Optional[redis.ConnectionPool] = None
        self.client: Optional[redis.Redis] = None

    def connect(self) -> None:
        """
        Initializes Redis connection pool.
        """
        try:
            self.pool = redis.ConnectionPool.from_url(
                settings.REDIS_URL, 
                decode_responses=True
            )
            self.client = redis.Redis(connection_pool=self.pool)
            # Test connectivity
            self.client.ping()
            print("Successfully connected to Redis cache!")
        except Exception as e:
            print(f"Failed to connect to Redis at {settings.REDIS_URL}: {e}")
            self.client = None

    def disconnect(self) -> None:
        """
        Closes connection pool.
        """
        if self.pool:
            self.pool.disconnect()
            print("Closed Redis connections.")

    def get(self, key: str) -> Optional[str]:
        """
        Get value from Redis.
        """
        if not self.client:
            return None
        try:
            return self.client.get(key)
        except Exception as e:
            print(f"Redis GET error: {e}")
            return None

    def set(self, key: str, value: str, expire_seconds: Optional[int] = None) -> bool:
        """
        Set value in Redis with optional expiration time.
        """
        if not self.client:
            return False
        try:
            return bool(self.client.set(key, value, ex=expire_seconds))
        except Exception as e:
            print(f"Redis SET error: {e}")
            return False

    def delete(self, key: str) -> bool:
        """
        Delete key from Redis.
        """
        if not self.client:
            return False
        try:
            return bool(self.client.delete(key))
        except Exception as e:
            print(f"Redis DELETE error: {e}")
            return False

# Global instance of redis client manager
redis_manager = RedisManager()
