
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List

from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from jose import JWTError

from shared.models import (
    FeedbackRequest,
    FeedbackMessage,
    DriverScore,
    DriverHistory,
    FeedbackRecord,
    ScorePoint
)
from shared.auth import (
    get_current_user,
    get_admin_user,
    create_access_token,
    verify_password,
    User
)
from shared.config import get_config
from shared.db import DatabaseManager
from shared.redis_client import RedisManager
from shared.logging_config import setup_logging

setup_logging()
logger = logging.getLogger(__name__)

config = get_config()

db_manager: DatabaseManager = None
redis_manager: RedisManager = None
rabbitmq_publisher = None

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_manager, redis_manager, rabbitmq_publisher
    
    logger.info("Starting API Gateway service")
    
    try:
        db_manager = DatabaseManager(config.database_url)
        await db_manager.connect()
        logger.info("Database connection established")
        
        redis_manager = RedisManager(
            host=config.redis_host,
            port=config.redis_port,
            db=config.redis_db,
            password=config.redis_password
        )
        await redis_manager.connect()
        logger.info("Redis connection established")
        
        from rabbitmq_publisher import RabbitMQPublisher
        rabbitmq_publisher = RabbitMQPublisher(
            host=config.rabbitmq_host,
            port=config.rabbitmq_port,
            user=config.rabbitmq_user,
            password=config.rabbitmq_password
        )
        await rabbitmq_publisher.connect()
        logger.info("RabbitMQ connection established")
        
        logger.info("API Gateway service started successfully")
        
    except Exception as e:
        logger.error(f"Failed to start API Gateway service: {e}")
        raise
    
    yield
    
    logger.info("Shutting down API Gateway service")
    
    if rabbitmq_publisher:
        await rabbitmq_publisher.disconnect()
        logger.info("RabbitMQ connection closed")
    
    if redis_manager:
        await redis_manager.disconnect()
        logger.info("Redis connection closed")
    
    if db_manager:
        await db_manager.disconnect()
        logger.info("Database connection closed")
    
    logger.info("API Gateway service shut down successfully")

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Driver Sentiment Engine API",
    description="API Gateway for feedback submission and admin dashboard",
    version="1.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(ValidationError)
async def validation_exception_handler(request, exc: ValidationError):
    logger.warning(
        f"Validation error: {exc}",
        extra={"extra_fields": {"path": request.url.path, "errors": exc.errors()}}
    )
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "Invalid request",
            "details": exc.errors()
        }
    )

@app.exception_handler(JWTError)
async def jwt_exception_handler(request, exc: JWTError):
    logger.warning(
        f"JWT error: {exc}",
        extra={"extra_fields": {"path": request.url.path}}
    )
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={
            "error": "Invalid or expired token",
            "details": str(exc)
        },
        headers={"WWW-Authenticate": "Bearer"}
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail
        },
        headers=exc.headers
    )

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "api-gateway"}

@app.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    logger.info(f"Login attempt for user: {request.username}")
    
    try:
        user_data = await db_manager.fetch_one(
            "SELECT id, username, password_hash, role FROM users WHERE username = $1",
            request.username
        )
        
        if not user_data:
            logger.warning(f"Login failed: user not found - {request.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        if not verify_password(request.password, user_data["password_hash"]):
            logger.warning(f"Login failed: invalid password - {request.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        access_token = create_access_token(
            user_id=user_data["id"],
            username=user_data["username"],
            role=user_data["role"]
        )
        
        logger.info(
            f"Login successful: {request.username}",
            extra={"extra_fields": {"user_id": user_data["id"], "role": user_data["role"]}}
        )
        
        return LoginResponse(access_token=access_token)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during login"
        )

@app.post("/feedback", status_code=status.HTTP_202_ACCEPTED)
async def submit_feedback(
    feedback: FeedbackRequest,
    current_user: User = Depends(get_current_user)
):
    logger.info(
        f"Feedback submission received",
        extra={
            "extra_fields": {
                "feedback_id": feedback.feedback_id,
                "driver_id": feedback.driver_id,
                "entity_type": feedback.entity_type,
                "user_id": current_user.id
            }
        }
    )
    
    try:
        message = FeedbackMessage(
            feedback_id=feedback.feedback_id,
            driver_id=feedback.driver_id,
            entity_type=feedback.entity_type,
            text=feedback.text,
            timestamp=feedback.timestamp
        )
        
        await rabbitmq_publisher.publish_feedback(message)
        
        logger.info(
            f"Feedback published to queue: {feedback.feedback_id}",
            extra={"extra_fields": {"feedback_id": feedback.feedback_id}}
        )
        
        return {
            "message": "Feedback accepted for processing",
            "feedback_id": feedback.feedback_id
        }
        
    except Exception as e:
        logger.error(
            f"Failed to publish feedback: {e}",
            extra={"extra_fields": {"feedback_id": feedback.feedback_id}}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process feedback"
        )

@app.get("/admin/dashboard", response_model=List[DriverScore])
async def get_dashboard(admin_user: User = Depends(get_admin_user)):
    logger.info(
        "Dashboard data requested",
        extra={"extra_fields": {"admin_user_id": admin_user.id}}
    )
    
    try:
        all_scores = await redis_manager.get_all_driver_scores()
        
        drivers_data = await db_manager.fetch_all(
            "SELECT id, name FROM drivers"
        )
        driver_names = {d["id"]: d["name"] for d in drivers_data}
        
        result = []
        for driver_id, score_data in all_scores.items():
            driver_name = driver_names.get(driver_id, f"Driver {driver_id}")
            avg_score = score_data["avg_score"]
            last_updated_str = score_data["last_updated"]
            if "+00:00Z" in last_updated_str:
                last_updated_str = last_updated_str.replace("+00:00Z", "Z")
            if last_updated_str.endswith("Z"):
                last_updated_str = last_updated_str[:-1] + "+00:00"
            if last_updated_str.count("+00:00") > 1:
                last_updated_str = last_updated_str.replace("+00:00+00:00", "+00:00")
            last_updated = datetime.fromisoformat(last_updated_str)
            
            alert_status = avg_score < config.alert_threshold
            
            result.append(DriverScore(
                driver_id=driver_id,
                driver_name=driver_name,
                avg_score=avg_score,
                last_updated=last_updated,
                alert_status=alert_status
            ))
        
        logger.info(
            f"Dashboard data returned: {len(result)} drivers",
            extra={"extra_fields": {"driver_count": len(result)}}
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to fetch dashboard data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard data"
        )

@app.get("/admin/analytics")
async def get_analytics(admin_user: User = Depends(get_admin_user)):
    logger.info(
        "Analytics data requested",
        extra={"extra_fields": {"admin_user_id": admin_user.id}}
    )
    
    try:
        feedback_volume_data = await db_manager.fetch_all("""
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count,
                AVG(sentiment_score) as avg_sentiment
            FROM feedback_log 
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
            LIMIT 30
        """)
        
        sentiment_distribution = await db_manager.fetch_all("""
            SELECT 
                CASE 
                    WHEN sentiment_score > 0.5 THEN 'positive'
                    WHEN sentiment_score < -0.5 THEN 'negative'
                    ELSE 'neutral'
                END as sentiment_category,
                COUNT(*) as count,
                AVG(sentiment_score) as avg_score,
                MIN(sentiment_score) as min_score,
                MAX(sentiment_score) as max_score
            FROM feedback_log
            GROUP BY sentiment_category
            ORDER BY sentiment_category
        """)
        
        driver_performance = await db_manager.fetch_all("""
            SELECT 
                d.name as driver_name,
                COUNT(f.id) as feedback_count,
                AVG(f.sentiment_score) as avg_score,
                MIN(f.created_at) as first_feedback,
                MAX(f.created_at) as last_feedback
            FROM drivers d
            LEFT JOIN feedback_log f ON d.id = f.driver_id
            WHERE f.id IS NOT NULL
            GROUP BY d.id, d.name
            HAVING COUNT(f.id) >= 3
            ORDER BY avg_score DESC
        """)
        
        entity_trends = await db_manager.fetch_all("""
            SELECT 
                entity_type,
                COUNT(*) as count,
                AVG(sentiment_score) as avg_sentiment
            FROM feedback_log
            GROUP BY entity_type
        """)
        
        analytics_data = {
            "feedback_volume": [
                {
                    "date": row["date"].isoformat() if row["date"] else None,
                    "count": row["count"],
                    "avg_sentiment": float(row["avg_sentiment"]) if row["avg_sentiment"] else 0
                }
                for row in feedback_volume_data
            ],
            "sentiment_distribution": [
                {
                    "category": row["sentiment_category"],
                    "count": row["count"],
                    "avg_score": float(row["avg_score"]) if row["avg_score"] else 0,
                    "min_score": float(row["min_score"]) if row["min_score"] else 0,
                    "max_score": float(row["max_score"]) if row["max_score"] else 0,
                    "percentage": round((row["count"] / sum(r["count"] for r in sentiment_distribution)) * 100, 1) if sentiment_distribution else 0
                }
                for row in sentiment_distribution
            ],
            "driver_performance": [
                {
                    "driver_name": row["driver_name"],
                    "feedback_count": row["feedback_count"],
                    "avg_score": float(row["avg_score"]) if row["avg_score"] else 0,
                    "first_feedback": row["first_feedback"].isoformat() if row["first_feedback"] else None,
                    "last_feedback": row["last_feedback"].isoformat() if row["last_feedback"] else None
                }
                for row in driver_performance
            ],
            "entity_trends": [
                {
                    "entity_type": row["entity_type"],
                    "count": row["count"],
                    "avg_sentiment": float(row["avg_sentiment"]) if row["avg_sentiment"] else 0
                }
                for row in entity_trends
            ]
        }
        
        logger.info("Analytics data returned successfully")
        return analytics_data
        
    except Exception as e:
        logger.error(f"Failed to fetch analytics data: {e}")
        return {
            "feedback_volume": [],
            "sentiment_distribution": [],
            "driver_performance": [],
            "entity_trends": []
        }

@app.get("/admin/settings")
async def get_settings(admin_user: User = Depends(get_admin_user)):
    logger.info(
        "Settings requested",
        extra={"extra_fields": {"admin_user_id": admin_user.id}}
    )
    
    return {
        "alert_threshold": config.alert_threshold,
        "ema_alpha": config.ema_alpha,
        "alert_cooldown_hours": 24  # Default cooldown
    }

@app.put("/admin/settings")
async def update_settings(
    settings_data: dict,
    admin_user: User = Depends(get_admin_user)
):
    logger.info(
        "Settings update requested",
        extra={"extra_fields": {"admin_user_id": admin_user.id, "settings": settings_data}}
    )
    
    try:
        alert_threshold = float(settings_data.get("alert_threshold", 2.5))
        ema_alpha = float(settings_data.get("ema_alpha", 0.1))
        alert_cooldown_hours = int(settings_data.get("alert_cooldown_hours", 24))
        
        if not (1.0 <= alert_threshold <= 5.0):
            raise ValueError("Alert threshold must be between 1.0 and 5.0")
        if not (0.01 <= ema_alpha <= 1.0):
            raise ValueError("EMA alpha must be between 0.01 and 1.0")
        if not (1 <= alert_cooldown_hours <= 168):
            raise ValueError("Alert cooldown must be between 1 and 168 hours")
        
        
        logger.info(
            "Settings updated successfully",
            extra={"extra_fields": {
                "alert_threshold": alert_threshold,
                "ema_alpha": ema_alpha,
                "alert_cooldown_hours": alert_cooldown_hours
            }}
        )
        
        return {
            "message": "Settings updated successfully",
            "settings": {
                "alert_threshold": alert_threshold,
                "ema_alpha": ema_alpha,
                "alert_cooldown_hours": alert_cooldown_hours
            }
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to update settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update settings"
        )

@app.get("/admin/driver/{driver_id}/history", response_model=DriverHistory)
async def get_driver_history(
    driver_id: int,
    admin_user: User = Depends(get_admin_user)
):
    logger.info(
        f"Driver history requested: {driver_id}",
        extra={"extra_fields": {"driver_id": driver_id, "admin_user_id": admin_user.id}}
    )
    
    try:
        feedback_records_data = await db_manager.get_driver_feedback_history(driver_id)
        
        if not feedback_records_data:
            logger.info(f"No feedback found for driver: {driver_id}")
            return DriverHistory(
                driver_id=driver_id,
                feedback_records=[],
                score_timeline=[]
            )
        
        feedback_records = [
            FeedbackRecord(
                feedback_id=record["feedback_id"],
                feedback_text=record["feedback_text"],
                sentiment_score=record["sentiment_score"],
                created_at=record["created_at"]
            )
            for record in feedback_records_data
        ]
        
        score_timeline = []
        current_avg = 3.0
        alpha = config.ema_alpha
        
        for record in reversed(feedback_records_data):
            current_avg = (alpha * record["sentiment_score"]) + ((1 - alpha) * current_avg)
            
            score_timeline.append(ScorePoint(
                timestamp=record["created_at"],
                avg_score=current_avg
            ))
        
        score_timeline.reverse()
        
        logger.info(
            f"Driver history returned: {driver_id}",
            extra={
                "extra_fields": {
                    "driver_id": driver_id,
                    "feedback_count": len(feedback_records)
                }
            }
        )
        
        return DriverHistory(
            driver_id=driver_id,
            feedback_records=feedback_records,
            score_timeline=score_timeline
        )
        
    except Exception as e:
        logger.error(f"Failed to fetch driver history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch driver history"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
