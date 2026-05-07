"""Redis cache service for storing AI adaptations and other cached data."""

import json
import hashlib
from typing import Optional, Any, Dict
from datetime import datetime, timedelta


class CacheService:
    """Service for caching data with Redis or in-memory fallback."""

    DEFAULT_TTL = 604800  # 7 days in seconds

    def __init__(self, redis_client: Optional[Any] = None):
        """Initialize cache service.

        Args:
            redis_client: Redis client instance (optional). If None, uses in-memory cache.
        """
        self.redis_client = redis_client
        self.memory_cache: Dict[str, tuple[Any, float]] = {}  # value, expiration_time

    async def get_cached(self, key: str) -> Optional[Any]:
        """Retrieve cached value.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found/expired
        """
        if self.redis_client:
            try:
                cached = await self.redis_client.get(key)
                if cached:
                    return json.loads(cached)
            except Exception as e:
                print(f"Redis get error for key {key}: {str(e)}")
                return None
        else:
            # In-memory cache fallback
            if key in self.memory_cache:
                value, expiration = self.memory_cache[key]
                if datetime.utcnow().timestamp() < expiration:
                    return value
                else:
                    del self.memory_cache[key]

        return None

    async def set_cached(
        self,
        key: str,
        value: Any,
        ttl: int = DEFAULT_TTL
    ) -> bool:
        """Store value in cache.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds (default: 7 days)

        Returns:
            True if successful, False otherwise
        """
        try:
            serialized = json.dumps(value) if not isinstance(value, str) else value
        except (TypeError, ValueError):
            return False

        if self.redis_client:
            try:
                await self.redis_client.setex(key, ttl, serialized)
                return True
            except Exception as e:
                print(f"Redis set error for key {key}: {str(e)}")
                return False
        else:
            # In-memory cache fallback
            expiration = (datetime.utcnow() + timedelta(seconds=ttl)).timestamp()
            self.memory_cache[key] = (value, expiration)
            return True

    async def clear_cache(self) -> bool:
        """Clear all cached data.

        Returns:
            True if successful
        """
        if self.redis_client:
            try:
                await self.redis_client.flushdb()
                return True
            except Exception as e:
                print(f"Redis flush error: {str(e)}")
                return False
        else:
            self.memory_cache.clear()
            return True

    @staticmethod
    def generate_key(content: str, profile: str, content_type: str) -> str:
        """Generate cache key from content hash.

        Args:
            content: Content text
            profile: Profile name
            content_type: Type of content

        Returns:
            Cache key
        """
        content_str = f"{content}:{profile}:{content_type}"
        hash_str = hashlib.sha256(content_str.encode()).hexdigest()
        return f"adapt:{hash_str}"

    async def delete_key(self, key: str) -> bool:
        """Delete specific cache key.

        Args:
            key: Cache key to delete

        Returns:
            True if successful
        """
        if self.redis_client:
            try:
                await self.redis_client.delete(key)
                return True
            except Exception as e:
                print(f"Redis delete error for key {key}: {str(e)}")
                return False
        else:
            if key in self.memory_cache:
                del self.memory_cache[key]
            return True
