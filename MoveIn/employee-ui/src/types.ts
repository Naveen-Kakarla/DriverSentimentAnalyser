export interface FeedbackTarget {
  enabled: boolean;
  label: string;
}

export interface Config {
  feedback_targets: {
    [key: string]: FeedbackTarget;
  };
}

export interface FeedbackRequest {
  feedback_id: string;
  driver_id: number;
  entity_type: string;
  text: string;
  timestamp: string;
}
