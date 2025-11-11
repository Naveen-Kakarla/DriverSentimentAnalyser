
import json
import redis.asyncio as redis
from typing import Optional, Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class RedisManager:
    
    def __init__(
        self,
        host: str = "localhost",
        port: int = 6379,
        db: int = 0,
        password: Optional[str] = None,
        max_connections: int = 50
    ):
        self.host = host
        self.port = port
        self.db = db
        self.password = password
        self.max_connections = max_connections
        self.pool: Optional[redis.ConnectionPool] = None
        self.client: Optional[redis.Redis] = None
    
    async def connect(self) -> None:
        try:
            self.pool = redis.ConnectionPool(
                host=self.host,
                port=self.port,
                db=self.db,
                password=self.password,
                max_connections=self.max_connections,
                decode_responses=True
            )
            self.client = redis.Redis(connection_pool=self.pool)
            
            await self.client.ping()
            
            logger.info(
                "Redis connection pool created",
                extra={
                    "extra_fields": {
                        "host": self.host,
                        "port": self.port,
                        "db": self.db,
                        "max_connections": self.max_connections
                    }
                }
            )
        except Exception as e:
            logger.error(f"Failed to create Redis connection pool: {e}")
            raise
    
    async def disconnect(self) -> None:
        if self.client:
            await self.client.close()
            logger.info("Redis connection closed")
            self.client = None
        
        if self.pool:
            await self.pool.disconnect()
            self.pool = None
    
    async def get_driver_score(self, driver_id: int) -> Optional[Dict[str, Any]]:
        if not self.client:
            raise RuntimeError("Redis client not initialized. Call connect() first.")
        
        score_data = await self.client.hget("driver_scores", str(driver_id))
        
        if score_data:
            return json.loads(score_data)
        return None
    
    async def set_driver_score(
        self,
        driver_id: int,
        avg_score: float,
        last_updated: Optional[datetime] = None
    ) -> None:
        if not self.client:
            raise RuntimeError("Redis client not initialized. Call connect() first.")
        
        if last_updated is None:
            last_updated = datetime.utcnow()
        
        score_data = {
            "avg_score": avg_score,
            "last_updated": last_updated.replace(tzinfo=None).isoformat() + "Z"
        }
        
        await self.client.hset(
            "driver_scores",
            str(driver_id),
            json.dumps(score_data)
        )
        
        logger.info(
            f"Driver score updated: {driver_id}",
            extra={
                "extra_fields": {
                    "driver_id": driver_id,
                    "avg_score": avg_score
                }
            }
        )
    
    async def get_all_driver_scores(self) -> Dict[int, Dict[str, Any]]:
        if not self.client:
            raise RuntimeError("Redis client not initialized. Call connect() first.")
        
        all_scores = await self.client.hgetall("driver_scores")
        
        result = {}
        for driver_id_str, score_data_str in all_scores.items():
            driver_id = int(driver_id_str)
            score_data = json.loads(score_data_str)
            result[driver_id] = score_data
        
        return result
    
    async def check_alert_lock(self, driver_id: int) -> bool:
        if not self.client:
            raise RuntimeError("Redis client not initialized. Call connect() first.")
        
        alert_key = f"driver_alert_sent:{driver_id}"
        exists = await self.client.exists(alert_key)
        return bool(exists)
    
    async def set_alert_lock(self, driver_id: int, ttl_seconds: int = 86400) -> None:
        if not self.client:
            raise RuntimeError("Redis client not initialized. Call connect() first.")
        
        alert_key = f"driver_alert_sent:{driver_id}"
        await self.client.setex(alert_key, ttl_seconds, "1")
        
        logger.info(
            f"Alert lock set for driver: {driver_id}",
            extra={
                "extra_fields": {
                    "driver_id": driver_id,
                    "ttl_seconds": ttl_seconds
                }
            }
        )
    
    async def set(self, key: str, value: str, ex: Optional[int] = None) -> None:
        if not self.client:
            raise RuntimeError("Redis client not initialized. Call connect() first.")
        
        await self.client.set(key, value, ex=ex)
    
    async def get(self, key: str) -> Optional[str]:
        if not self.client:
            raise RuntimeError("Redis client not initialized. Call connect() first.")
        
        return await self.client.get(key)
    
    async def exists(self, key: str) -> bool:
        if not self.client:
            raise RuntimeError("Redis client not initialized. Call connect() first.")
        
        return bool(await self.client.exists(key))
