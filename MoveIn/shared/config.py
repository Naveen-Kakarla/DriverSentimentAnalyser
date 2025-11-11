
import os
from typing import Optional
from pydantic import BaseModel, Field, validator

class Config(BaseModel):
    
    database_url: str = Field(..., description="PostgreSQL connection URL")
    
    redis_host: str = Field(default="localhost", description="Redis host")
    redis_port: int = Field(default=6379, description="Redis port")
    redis_db: int = Field(default=0, description="Redis database number")
    redis_password: Optional[str] = Field(default=None, description="Redis password")
    
    rabbitmq_host: str = Field(default="localhost", description="RabbitMQ host")
    rabbitmq_port: int = Field(default=5672, description="RabbitMQ port")
    rabbitmq_user: str = Field(default="guest", description="RabbitMQ username")
    rabbitmq_password: str = Field(default="guest", description="RabbitMQ password")
    
    jwt_secret: str = Field(..., description="Secret key for JWT token signing")
    jwt_algorithm: str = Field(default="HS256", description="JWT signing algorithm")
    jwt_expiration_minutes: int = Field(default=15, description="JWT token expiration in minutes")
    
    ema_alpha: float = Field(default=0.1, description="EMA smoothing factor (0-1)")
    alert_threshold: float = Field(default=2.5, description="Score threshold for alerts")
    alert_cooldown_hours: int = Field(default=24, description="Hours between repeated alerts")
    
    rate_limit_per_minute: int = Field(default=60, description="Max requests per minute per user")
    rate_limit_burst: int = Field(default=10, description="Burst allowance for rate limiting")
    
    sentiment_positive_threshold: float = Field(default=0.5, description="Threshold for positive sentiment")
    sentiment_negative_threshold: float = Field(default=-0.5, description="Threshold for negative sentiment")
    sentiment_neutral_ratio: float = Field(default=0.4, description="Neutral word ratio threshold")
    
    log_level: str = Field(default="INFO", description="Logging level")
    
    @validator("ema_alpha")
    def validate_ema_alpha(cls, v):
        if not 0 < v <= 1:
            raise ValueError("ema_alpha must be between 0 and 1")
        return v
    
    @validator("alert_threshold")
    def validate_alert_threshold(cls, v):
        if not -5 <= v <= 5:
            raise ValueError("alert_threshold must be between -5 and 5")
        return v
    
    @validator("log_level")
    def validate_log_level(cls, v):
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in valid_levels:
            raise ValueError(f"log_level must be one of {valid_levels}")
        return v.upper()
    
    class Config:
        env_file = ".env"
        case_sensitive = False

def get_config() -> Config:
    return Config(
        database_url=os.getenv("DATABASE_URL", ""),
        redis_host=os.getenv("REDIS_HOST", "localhost"),
        redis_port=int(os.getenv("REDIS_PORT", "6379")),
        redis_db=int(os.getenv("REDIS_DB", "0")),
        redis_password=os.getenv("REDIS_PASSWORD"),
        rabbitmq_host=os.getenv("RABBITMQ_HOST", "localhost"),
        rabbitmq_port=int(os.getenv("RABBITMQ_PORT", "5672")),
        rabbitmq_user=os.getenv("RABBITMQ_USER", "guest"),
        rabbitmq_password=os.getenv("RABBITMQ_PASSWORD", "guest"),
        jwt_secret=os.getenv("JWT_SECRET", ""),
        jwt_algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
        jwt_expiration_minutes=int(os.getenv("JWT_EXPIRATION_MINUTES", "15")),
        ema_alpha=float(os.getenv("EMA_ALPHA", "0.1")),
        alert_threshold=float(os.getenv("ALERT_THRESHOLD", "2.5")),
        log_level=os.getenv("LOG_LEVEL", "INFO"),
    )
