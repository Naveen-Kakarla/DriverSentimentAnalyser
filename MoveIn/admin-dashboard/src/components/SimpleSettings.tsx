import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http:

interface SystemSettings {
  alert_threshold: number
  ema_alpha: number
  alert_cooldown_hours: number
}

function SimpleSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    alert_threshold: 2.5,
    ema_alpha: 0.1,
    alert_cooldown_hours: 24
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { token, logout } = useAuth()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/admin/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        logout()
        return
      }

      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (err) {
      console.warn('Could not fetch settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (response.status === 401) {
        logout()
        return
      }

      if (response.ok) {
        setSuccess('Settings saved successfully!')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save settings')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading settings...</div>
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h2>System Settings</h2>
      
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ marginBottom: '20px' }}>
          <label>Alert Threshold: </label>
          <input
            type="number"
            min="1.0"
            max="5.0"
            step="0.1"
            value={settings.alert_threshold}
            onChange={(e) => setSettings({...settings, alert_threshold: parseFloat(e.target.value)})}
            style={{ marginLeft: '10px', padding: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>EMA Alpha: </label>
          <input
            type="number"
            min="0.01"
            max="1.0"
            step="0.01"
            value={settings.ema_alpha}
            onChange={(e) => setSettings({...settings, ema_alpha: parseFloat(e.target.value)})}
            style={{ marginLeft: '10px', padding: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>Alert Cooldown (Hours): </label>
          <input
            type="number"
            min="1"
            max="168"
            value={settings.alert_cooldown_hours}
            onChange={(e) => setSettings({...settings, alert_cooldown_hours: parseInt(e.target.value)})}
            style={{ marginLeft: '10px', padding: '5px' }}
          />
        </div>

        {error && <div style={{ color: 'red', margin: '10px 0' }}>{error}</div>}
        {success && <div style={{ color: 'green', margin: '10px 0' }}>{success}</div>}

        <button 
          onClick={saveSettings}
          disabled={saving}
          style={{ 
            padding: '10px 20px', 
            background: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: saving ? 'not-allowed' : 'pointer'
          }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}

export default SimpleSettings