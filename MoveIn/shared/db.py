
import asyncpg
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
import logging

logger = logging.getLogger(__name__)

class DatabaseManager:
    
    def __init__(self, database_url: str, min_size: int = 5, max_size: int = 20):
        self.database_url = database_url
        self.min_size = min_size
        self.max_size = max_size
        self.pool: Optional[asyncpg.Pool] = None
    
    async def connect(self) -> None:
        try:
            self.pool = await asyncpg.create_pool(
                self.database_url,
                min_size=self.min_size,
                max_size=self.max_size,
                command_timeout=60
            )
            logger.info(
                "Database connection pool created",
                extra={"extra_fields": {"min_size": self.min_size, "max_size": self.max_size}}
            )
        except Exception as e:
            logger.error(f"Failed to create database connection pool: {e}")
            raise
    
    async def disconnect(self) -> None:
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed")
            self.pool = None
    
    @asynccontextmanager
    async def acquire(self):
        if not self.pool:
            raise RuntimeError("Database pool not initialized. Call connect() first.")
        
        async with self.pool.acquire() as connection:
            yield connection
    
    async def fetch_one(self, query: str, *args) -> Optional[Dict[str, Any]]:
        async with self.acquire() as conn:
            row = await conn.fetchrow(query, *args)
            return dict(row) if row else None
    
    async def fetch_all(self, query: str, *args) -> List[Dict[str, Any]]:
        async with self.acquire() as conn:
            rows = await conn.fetch(query, *args)
            return [dict(row) for row in rows]
    
    async def execute(self, query: str, *args) -> str:
        async with self.acquire() as conn:
            return await conn.execute(query, *args)
    
    async def feedback_exists(self, feedback_id: str) -> bool:
        query = "SELECT EXISTS(SELECT 1 FROM feedback_log WHERE feedback_id = $1)"
        async with self.acquire() as conn:
            result = await conn.fetchval(query, feedback_id)
            return result
    
    async def insert_feedback(
        self,
        feedback_id: str,
        driver_id: int,
        entity_type: str,
        feedback_text: str,
        sentiment_score: float,
        created_at
    ) -> None:
        query = """
            INSERT INTO feedback_log 
            (feedback_id, driver_id, entity_type, feedback_text, sentiment_score, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
        """
        await self.execute(
            query,
            feedback_id,
            driver_id,
            entity_type,
            feedback_text,
            sentiment_score,
            created_at
        )
        logger.info(
            f"Feedback inserted: {feedback_id}",
            extra={"extra_fields": {"feedback_id": feedback_id, "driver_id": driver_id}}
        )
    
    async def get_driver_feedback_history(self, driver_id: int) -> List[Dict[str, Any]]:
        query = """
            SELECT feedback_id, feedback_text, sentiment_score, created_at
            FROM feedback_log
            WHERE driver_id = $1
            ORDER BY created_at DESC
        """
        return await self.fetch_all(query, driver_id)
