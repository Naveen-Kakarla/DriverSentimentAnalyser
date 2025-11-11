
from datetime import datetime
from typing import List, Literal
from pydantic import BaseModel, Field

class FeedbackRequest(BaseModel):
    feedback_id: str = Field(..., description="UUID for feedback")
    driver_id: int = Field(..., description="Driver identifier")
    entity_type: Literal["driver", "trip", "app", "marshal"] = Field(
        ..., description="Type of entity being rated"
    )
    text: str = Field(..., description="Feedback text content")
    timestamp: datetime = Field(..., description="Timestamp of feedback submission")

class FeedbackMessage(BaseModel):
    feedback_id: str = Field(..., description="UUID for feedback")
    driver_id: int = Field(..., description="Driver identifier")
    entity_type: Literal["driver", "trip", "app", "marshal"] = Field(
        ..., description="Type of entity being rated"
    )
    text: str = Field(..., description="Feedback text content")
    timestamp: datetime = Field(..., description="Timestamp of feedback submission")

class ScorePoint(BaseModel):
    timestamp: datetime = Field(..., description="Timestamp of score calculation")
    avg_score: float = Field(..., description="Average sentiment score at this point")

class FeedbackRecord(BaseModel):
    feedback_id: str = Field(..., description="UUID for feedback")
    feedback_text: str = Field(..., description="Feedback text content")
    sentiment_score: float = Field(..., description="Calculated sentiment score")
    created_at: datetime = Field(..., description="Timestamp when feedback was created")

class DriverScore(BaseModel):
    driver_id: int = Field(..., description="Driver identifier")
    driver_name: str = Field(..., description="Driver name")
    avg_score: float = Field(..., description="Current average sentiment score")
    last_updated: datetime = Field(..., description="Timestamp of last score update")
    alert_status: bool = Field(..., description="Whether driver is in alert state")

class DriverHistory(BaseModel):
    driver_id: int = Field(..., description="Driver identifier")
    feedback_records: List[FeedbackRecord] = Field(
        ..., description="List of all feedback records for driver"
    )
    score_timeline: List[ScorePoint] = Field(
        ..., description="Timeline of average scores over time"
    )
