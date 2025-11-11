
import json
import logging
from typing import Optional
import aio_pika
from aio_pika import connect_robust, Message, DeliveryMode, ExchangeType

from shared.models import FeedbackMessage

logger = logging.getLogger(__name__)

class RabbitMQPublisher:
    
    def __init__(
        self,
        host: str = "localhost",
        port: int = 5672,
        user: str = "guest",
        password: str = "guest",
        queue_name: str = "feedback_queue"
    ):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.queue_name = queue_name
        self.connection: Optional[aio_pika.RobustConnection] = None
        self.channel: Optional[aio_pika.Channel] = None
        self.queue: Optional[aio_pika.Queue] = None
    
    async def connect(self) -> None:
        try:
            connection_url = f"amqp://{self.user}:{self.password}@{self.host}:{self.port}/"
            
            self.connection = await connect_robust(connection_url)
            
            self.channel = await self.connection.channel()
            
            self.queue = await self.channel.declare_queue(
                self.queue_name,
                durable=True,
                arguments={
                    "x-dead-letter-exchange": "",
                    "x-dead-letter-routing-key": "feedback_dlq"
                }
            )
            
            await self.channel.declare_queue(
                "feedback_dlq",
                durable=True
            )
            
            logger.info(
                "RabbitMQ publisher connected",
                extra={
                    "extra_fields": {
                        "host": self.host,
                        "port": self.port,
                        "queue": self.queue_name
                    }
                }
            )
            
        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            raise
    
    async def disconnect(self) -> None:
        try:
            if self.channel and not self.channel.is_closed:
                await self.channel.close()
                logger.info("RabbitMQ channel closed")
            
            if self.connection and not self.connection.is_closed:
                await self.connection.close()
                logger.info("RabbitMQ connection closed")
                
        except Exception as e:
            logger.error(f"Error closing RabbitMQ connection: {e}")
    
    async def publish_feedback(self, feedback: FeedbackMessage) -> None:
        if not self.channel or self.channel.is_closed:
            raise RuntimeError("RabbitMQ channel not initialized or closed. Call connect() first.")
        
        try:
            message_body = feedback.model_dump_json()
            
            message = Message(
                body=message_body.encode(),
                delivery_mode=DeliveryMode.PERSISTENT,
                content_type="application/json"
            )
            
            await self.channel.default_exchange.publish(
                message,
                routing_key=self.queue_name
            )
            
            logger.info(
                f"Feedback message published: {feedback.feedback_id}",
                extra={
                    "extra_fields": {
                        "feedback_id": feedback.feedback_id,
                        "driver_id": feedback.driver_id,
                        "queue": self.queue_name
                    }
                }
            )
            
        except Exception as e:
            logger.error(
                f"Failed to publish feedback message: {e}",
                extra={
                    "extra_fields": {
                        "feedback_id": feedback.feedback_id,
                        "error": str(e)
                    }
                }
            )
            raise
