import { FeedbackRecord } from '../types'

interface FeedbackListProps {
  records: FeedbackRecord[]
}

function FeedbackList({ records }: FeedbackListProps) {
  if (!records || records.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
        No feedback records available
      </div>
    )
  }

  const getSentimentColor = (score: number) => {
    if (score >= 2) return '#28a745'
    if (score >= 0) return '#ffc107'
    return '#dc3545'
  }

  const getSentimentLabel = (score: number) => {
    if (score >= 2) return 'Positive'
    if (score >= 0) return 'Neutral'
    return 'Negative'
  }

  return (
    <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
      {records.map((record) => (
        <div
          key={record.feedback_id}
          style={{
            padding: '15px',
            marginBottom: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: '#fafafa'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: 'white',
                  backgroundColor: getSentimentColor(record.sentiment_score)
                }}
              >
                {getSentimentLabel(record.sentiment_score)} ({record.sentiment_score.toFixed(1)})
              </span>
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>
              {new Date(record.created_at).toLocaleString()}
            </div>
          </div>
          <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
            {record.feedback_text}
          </div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
            ID: {record.feedback_id}
          </div>
        </div>
      ))}
    </div>
  )
}

export default FeedbackList
