export interface DriverScore {
  driver_id: number
  driver_name: string
  avg_score: number
  last_updated: string
  alert_status: boolean
}

export interface FeedbackRecord {
  feedback_id: string
  feedback_text: string
  sentiment_score: number
  created_at: string
}

export interface ScorePoint {
  timestamp: string
  avg_score: number
}

export interface DriverHistory {
  driver_id: number
  feedback_records: FeedbackRecord[]
  score_timeline: ScorePoint[]
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
}
