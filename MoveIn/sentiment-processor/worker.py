
import asyncio
import json
import logging
import sys
import traceback
from datetime import datetime
from typing import Optional

import pika
from pika.adapters.blocking_connection import BlockingChannel
from pydantic import ValidationError
import asyncpg

sys.path.append('..')

from shared.config import get_config
from shared.models import FeedbackMessage
from shared.db import DatabaseManager
from shared.redis_client import RedisManager
from shared.logging_config import setup_logging
from sentiment_analyzer import RuleBasedSentimentAnalyzer, ISentimentAnalyzer

logger = logging.getLogger(__name__)

class DatabaseError(Exception):
    pass

class AlertingService:
    
    def send_alert(self, driver_id: int, score: float) -> None:
        message = f"ALERT: Driver {driver_id} score dropped to {score:.2f}"
        logger.warning(
            message,
            extra={
                "extra_fields": {
                    "alert_type": "low_score",
                    "driver_id": driver_id,
                    "score": score
                }
            }
        )

class SentimentProcessorWorker:
    
    def __init__(
        self,
        db_manager: DatabaseManager,
        redis_manager: RedisManager,
        sentiment_analyzer: ISentimentAnalyzer,
        alerting_service: AlertingService,
        config
    ):
        self.db_manager = db_manager
        self.redis_manager = redis_manager
        self.sentiment_analyzer = sentiment_analyzer
        self.alerting_service = alerting_service
        self.config = config
        
        self.connection: Optional[pika.BlockingConnection] = None
        self.channel: Optional[BlockingChannel] = None
        self.event_loop: Optional[asyncio.AbstractEventLoop] = None
    
    def connect_rabbitmq(self) -> None:
        credentials = pika.PlainCredentials(
            self.config.rabbitmq_user,
            self.config.rabbitmq_password
        )
        
        parameters = pika.ConnectionParameters(
            host=self.config.rabbitmq_host,
            port=self.config.rabbitmq_port,
            credentials=credentials,
            heartbeat=600,
            blocked_connection_timeout=300
        )
        
        self.connection = pika.BlockingConnection(parameters)
        self.channel = self.connection.channel()
        
        self.channel.basic_qos(prefetch_count=10)
        
        self.channel.queue_declare(
            queue='feedback_dlq',
            durable=True
        )
        
        self.channel.queue_declare(
            queue='feedback_queue',
            durable=True,
            arguments={
                'x-dead-letter-exchange': '',
                'x-dead-letter-routing-key': 'feedback_dlq'
            }
        )
        
        logger.info(
            "Connected to RabbitMQ with DLQ configuration",
            extra={
                "extra_fields": {
                    "host": self.config.rabbitmq_host,
                    "port": self.config.rabbitmq_port,
                    "queue": "feedback_queue",
                    "dlq": "feedback_dlq",
                    "prefetch_count": 10
                }
            }
        )
    
    def send_to_dlq(
        self,
        body: bytes,
        error_type: str,
        error_message: str,
        traceback_str: str = None
    ) -> None:
        if not self.channel:
            logger.error("Cannot send to DLQ: channel not initialized")
            return
        
        try:
            headers = {
                'x-error-type': error_type,
                'x-error-message': error_message,
                'x-failed-at': datetime.utcnow().isoformat(),
                'x-original-queue': 'feedback_queue'
            }
            
            if traceback_str:
                headers['x-error-traceback'] = traceback_str[:1000]  # Limit size
            
            properties = pika.BasicProperties(
                headers=headers,
                delivery_mode=2
            )
            
            self.channel.basic_publish(
                exchange='',
                routing_key='feedback_dlq',
                body=body,
                properties=properties
            )
            
            logger.warning(
                f"Message sent to DLQ",
                extra={
                    "extra_fields": {
                        "error_type": error_type,
                        "error_message": error_message,
                        "dlq": "feedback_dlq"
                    }
                }
            )
            
        except Exception as e:
            logger.error(
                f"Failed to send message to DLQ: {e}",
                extra={"extra_fields": {"error": str(e)}}
            )
    
    def parse_message(self, body: bytes) -> FeedbackMessage:
        message_dict = json.loads(body.decode('utf-8'))
        feedback_message = FeedbackMessage.parse_obj(message_dict)
        return feedback_message
    
    async def check_idempotency(self, feedback_id: str) -> bool:
        exists = await self.db_manager.feedback_exists(feedback_id)
        
        if exists:
            logger.info(
                f"Duplicate feedback detected: {feedback_id}",
                extra={"extra_fields": {"feedback_id": feedback_id}}
            )
        
        return exists
    
    def analyze_sentiment(self, text: str) -> float:
        sentiment_score = self.sentiment_analyzer.analyze(text)
        
        logger.debug(
            f"Sentiment analyzed: {sentiment_score}",
            extra={"extra_fields": {"sentiment_score": sentiment_score}}
        )
        
        return sentiment_score
    
    async def fetch_current_score(self, driver_id: int) -> float:
        score_data = await self.redis_manager.get_driver_score(driver_id)
        
        if score_data:
            current_score = score_data.get("avg_score", 3.0)
            logger.debug(
                f"Fetched current score for driver {driver_id}: {current_score}",
                extra={
                    "extra_fields": {
                        "driver_id": driver_id,
                        "current_score": current_score
                    }
                }
            )
            return current_score
        else:
            logger.debug(
                f"No existing score for driver {driver_id}, using default 3.0",
                extra={"extra_fields": {"driver_id": driver_id}}
            )
            return 3.0
    
    def calculate_ema(self, old_avg: float, new_score: float) -> float:
        alpha = self.config.ema_alpha
        new_avg = (alpha * new_score) + ((1 - alpha) * old_avg)
        
        logger.debug(
            f"EMA calculated: {new_avg}",
            extra={
                "extra_fields": {
                    "old_avg": old_avg,
                    "new_score": new_score,
                    "new_avg": new_avg,
                    "alpha": alpha
                }
            }
        )
        
        return new_avg
    
    async def update_redis_score(
        self,
        driver_id: int,
        new_avg: float,
        timestamp: datetime
    ) -> None:
        await self.redis_manager.set_driver_score(
            driver_id=driver_id,
            avg_score=new_avg,
            last_updated=timestamp
        )
        
        logger.info(
            f"Redis score updated for driver {driver_id}: {new_avg}",
            extra={
                "extra_fields": {
                    "driver_id": driver_id,
                    "new_avg": new_avg
                }
            }
        )
    
    async def insert_feedback_record(
        self,
        feedback: FeedbackMessage,
        sentiment_score: float
    ) -> None:
        try:
            await self.db_manager.insert_feedback(
                feedback_id=feedback.feedback_id,
                driver_id=feedback.driver_id,
                entity_type=feedback.entity_type,
                feedback_text=feedback.text,
                sentiment_score=sentiment_score,
                created_at=feedback.timestamp
            )
            
            logger.info(
                f"Feedback record inserted: {feedback.feedback_id}",
                extra={
                    "extra_fields": {
                        "feedback_id": feedback.feedback_id,
                        "driver_id": feedback.driver_id
                    }
                }
            )
        except asyncpg.PostgresError as e:
            logger.error(
                f"Database error inserting feedback: {e}",
                extra={
                    "extra_fields": {
                        "feedback_id": feedback.feedback_id,
                        "error": str(e)
                    }
                }
            )
            raise DatabaseError(f"Failed to insert feedback: {e}") from e
        except Exception as e:
            logger.error(
                f"Unexpected error inserting feedback: {e}",
                extra={
                    "extra_fields": {
                        "feedback_id": feedback.feedback_id,
                        "error": str(e)
                    }
                }
            )
            raise DatabaseError(f"Failed to insert feedback: {e}") from e
    
    async def check_and_send_alert(self, driver_id: int, score: float) -> None:
        if score < self.config.alert_threshold:
            alert_lock_exists = await self.redis_manager.check_alert_lock(driver_id)
            
            if not alert_lock_exists:
                self.alerting_service.send_alert(driver_id, score)
                
                await self.redis_manager.set_alert_lock(driver_id, ttl_seconds=86400)
                
                logger.info(
                    f"Alert sent for driver {driver_id}",
                    extra={
                        "extra_fields": {
                            "driver_id": driver_id,
                            "score": score,
                            "threshold": self.config.alert_threshold
                        }
                    }
                )
            else:
                logger.debug(
                    f"Alert already sent for driver {driver_id}, skipping",
                    extra={"extra_fields": {"driver_id": driver_id}}
                )
    
    async def process_feedback(self, feedback: FeedbackMessage) -> None:
        if await self.check_idempotency(feedback.feedback_id):
            logger.info(f"Skipping duplicate feedback: {feedback.feedback_id}")
            return
        
        sentiment_score = self.analyze_sentiment(feedback.text)
        
        current_score = await self.fetch_current_score(feedback.driver_id)
        
        new_avg = self.calculate_ema(current_score, sentiment_score)
        
        await self.update_redis_score(
            driver_id=feedback.driver_id,
            new_avg=new_avg,
            timestamp=feedback.timestamp
        )
        
        await self.insert_feedback_record(feedback, sentiment_score)
        
        await self.check_and_send_alert(feedback.driver_id, new_avg)
        
        logger.info(
            f"Feedback processed successfully: {feedback.feedback_id}",
            extra={
                "extra_fields": {
                    "feedback_id": feedback.feedback_id,
                    "driver_id": feedback.driver_id,
                    "sentiment_score": sentiment_score,
                    "new_avg": new_avg
                }
            }
        )
    
    def callback(
        self,
        ch: BlockingChannel,
        method: pika.spec.Basic.Deliver,
        properties: pika.spec.BasicProperties,
        body: bytes
    ) -> None:
        feedback_id = None
        
        try:
            logger.info(
                f"Received message",
                extra={
                    "extra_fields": {
                        "delivery_tag": method.delivery_tag
                    }
                }
            )
            
            feedback = self.parse_message(body)
            feedback_id = feedback.feedback_id
            
            self.event_loop.run_until_complete(self.process_feedback(feedback))
            
            ch.basic_ack(delivery_tag=method.delivery_tag)
            
            logger.info(
                f"Message acknowledged",
                extra={
                    "extra_fields": {
                        "delivery_tag": method.delivery_tag,
                        "feedback_id": feedback_id
                    }
                }
            )
        
        except (ValidationError, json.JSONDecodeError) as e:
            error_type = "validation_error"
            error_message = f"Invalid message format: {str(e)}"
            tb_str = traceback.format_exc()
            
            logger.error(
                error_message,
                extra={
                    "extra_fields": {
                        "error_type": error_type,
                        "error": str(e),
                        "delivery_tag": method.delivery_tag,
                        "message_body": body.decode('utf-8', errors='replace')[:500],
                        "traceback": tb_str
                    }
                }
            )
            
            self.send_to_dlq(body, error_type, error_message, tb_str)
            
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        
        except DatabaseError as e:
            error_type = "database_error"
            error_message = f"Database operation failed: {str(e)}"
            tb_str = traceback.format_exc()
            
            logger.error(
                error_message,
                extra={
                    "extra_fields": {
                        "error_type": error_type,
                        "error": str(e),
                        "delivery_tag": method.delivery_tag,
                        "feedback_id": feedback_id,
                        "traceback": tb_str
                    }
                }
            )
            
            self.send_to_dlq(body, error_type, error_message, tb_str)
            
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        
        except Exception as e:
            error_type = "unknown_error"
            error_message = f"Unexpected error: {str(e)}"
            tb_str = traceback.format_exc()
            
            logger.error(
                error_message,
                extra={
                    "extra_fields": {
                        "error_type": error_type,
                        "error": str(e),
                        "delivery_tag": method.delivery_tag,
                        "feedback_id": feedback_id,
                        "traceback": tb_str
                    }
                }
            )
            
            self.send_to_dlq(body, error_type, error_message, tb_str)
            
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        
    
    def start_consuming(self) -> None:
        if not self.channel:
            raise RuntimeError("Channel not initialized. Call connect_rabbitmq() first.")
        
        logger.info("Starting to consume messages from feedback_queue")
        
        self.channel.basic_consume(
            queue='feedback_queue',
            on_message_callback=self.callback,
            auto_ack=False
        )
        
        try:
            self.channel.start_consuming()
        except KeyboardInterrupt:
            logger.info("Stopping consumer...")
            self.channel.stop_consuming()
    
    def close(self) -> None:
        if self.connection and not self.connection.is_closed:
            self.connection.close()
            logger.info("RabbitMQ connection closed")

async def initialize_services(config):
    db_manager = DatabaseManager(config.database_url)
    await db_manager.connect()
    
    redis_manager = RedisManager(
        host=config.redis_host,
        port=config.redis_port,
        db=config.redis_db,
        password=config.redis_password
    )
    await redis_manager.connect()
    
    sentiment_analyzer = RuleBasedSentimentAnalyzer()
    
    alerting_service = AlertingService()
    
    return db_manager, redis_manager, sentiment_analyzer, alerting_service

async def cleanup_services(db_manager, redis_manager):
    await db_manager.disconnect()
    await redis_manager.disconnect()

def main():
    config = get_config()
    
    setup_logging(config.log_level)
    
    logger.info("Starting Sentiment Processor Worker")
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        db_manager, redis_manager, sentiment_analyzer, alerting_service = \
            loop.run_until_complete(initialize_services(config))
        
        worker = SentimentProcessorWorker(
            db_manager=db_manager,
            redis_manager=redis_manager,
            sentiment_analyzer=sentiment_analyzer,
            alerting_service=alerting_service,
            config=config
        )
        
        worker.event_loop = loop
        
        worker.connect_rabbitmq()
        
        worker.start_consuming()
        
    except KeyboardInterrupt:
        logger.info("Received shutdown signal")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
    finally:
        logger.info("Cleaning up services...")
        loop.run_until_complete(cleanup_services(db_manager, redis_manager))
        loop.close()
        logger.info("Sentiment Processor Worker stopped")

if __name__ == "__main__":
    main()
