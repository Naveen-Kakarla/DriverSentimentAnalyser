import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { DriverHistory } from '../types'
import ScoreChart from './ScoreChart'
import FeedbackList from './FeedbackList'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http:

function DriverDetail() {
  const { driverId } = useParams<{ driverId: string }>()
  const [history, setHistory] = useState<DriverHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { token, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (driverId) {
      fetchDriverHistory()
    }
  }, [driverId])

  const fetchDriverHistory = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/driver/${driverId}/history`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (response.status === 401) {
        logout()
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch driver history')
      }

      const data: DriverHistory = await response.json()
      setHistory(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading driver history...</div>
  }

  if (error) {
    return (
      <div className="container">
        <div className="error" style={{ textAlign: 'center', marginTop: '40px' }}>
          {error}
          <button 
            className="btn btn-primary" 
            onClick={fetchDriverHistory}
            style={{ marginLeft: '10px' }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!history) {
    return <div className="loading">No data available</div>
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Driver {history.driver_id} - History</h1>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '20px' }}>Score Timeline</h2>
        <ScoreChart data={history.score_timeline} />
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '20px' }}>Feedback History</h2>
        <FeedbackList records={history.feedback_records} />
      </div>
    </div>
  )
}

export default DriverDetail
