import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { DriverScore } from '../types'
import WorkingAnalytics from './WorkingAnalytics'
import SimpleSettings from './SimpleSettings'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http:

function Dashboard() {
  const [drivers, setDrivers] = useState<DriverScore[]>([])
  const [filteredDrivers, setFilteredDrivers] = useState<DriverScore[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'settings'>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'alert' | 'good'>('all')
  const [sortField, setSortField] = useState<'name' | 'score' | 'updated'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const { token, logout } = useAuth()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    
    let filtered = [...drivers]
    
    if (searchTerm) {
      filtered = filtered.filter(d => 
        d.driver_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (filterStatus === 'alert') {
      filtered = filtered.filter(d => d.alert_status)
    } else if (filterStatus === 'good') {
      filtered = filtered.filter(d => !d.alert_status)
    }
    
    
    filtered.sort((a, b) => {
      let comparison = 0
      
      if (sortField === 'name') {
        comparison = a.driver_name.localeCompare(b.driver_name)
      } else if (sortField === 'score') {
        comparison = a.avg_score - b.avg_score
      } else if (sortField === 'updated') {
        comparison = new Date(a.last_updated).getTime() - new Date(b.last_updated).getTime()
      }
      
      return sortDirection === 'asc' ? comparison : -comparison
    })
    
    setFilteredDrivers(filtered)
  }, [drivers, searchTerm, filterStatus, sortField, sortDirection])

  const handleSort = (field: 'name' | 'score' | 'updated') => {
    if (sortField === field) {
      
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: 'name' | 'score' | 'updated') => {
    if (sortField !== field) return ' ↕️'
    return sortDirection === 'asc' ? ' ↑' : ' ↓'
  }

  const fetchDashboardData = async () => {
    setLoading(true)
    setError('')

    try {
      const dashboardResponse = await fetch(`${API_BASE_URL}/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (dashboardResponse.status === 401) {
        logout()
        return
      }

      if (!dashboardResponse.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const driversData: DriverScore[] = await dashboardResponse.json()
      setDrivers(driversData)

      try {
        const analyticsResponse = await fetch(`${API_BASE_URL}/admin/analytics`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (analyticsResponse.ok) {
          const analyticsData = await analyticsResponse.json()
          setAnalytics(analyticsData)
        }
      } catch (analyticsErr) {
        console.warn('Analytics data not available:', analyticsErr)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading dashboard...</div>
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>
        <button onClick={fetchDashboardData}>Retry</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1>Driver Sentiment Dashboard</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchDashboardData} style={{ padding: '8px 16px' }}>
            🔄 Refresh
          </button>
          <button onClick={logout} style={{ padding: '8px 16px' }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {(['overview', 'analytics', 'settings'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              background: activeTab === tab ? '#007bff' : '#f8f9fa',
              color: activeTab === tab ? 'white' : '#007bff',
              border: '1px solid #007bff',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <div>
          <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Search drivers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '8px', flex: 1, maxWidth: '300px' }}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              style={{ padding: '8px' }}
            >
              <option value="all">All Drivers</option>
              <option value="alert">Alerts Only</option>
              <option value="good">Good Performance</option>
            </select>
            <span style={{ padding: '8px', color: '#666' }}>
              Showing {filteredDrivers.length} of {drivers.length}
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th 
                  onClick={() => handleSort('name')}
                  style={{ 
                    padding: '12px', 
                    textAlign: 'left', 
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#e9ecef'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  Driver{getSortIcon('name')}
                </th>
                <th 
                  onClick={() => handleSort('score')}
                  style={{ 
                    padding: '12px', 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#e9ecef'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  Score{getSortIcon('score')}
                </th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                <th 
                  onClick={() => handleSort('updated')}
                  style={{ 
                    padding: '12px', 
                    textAlign: 'left', 
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#e9ecef'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  Updated{getSortIcon('updated')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map(driver => (
                <tr key={driver.driver_id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px' }}>{driver.driver_name}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                    {driver.avg_score.toFixed(2)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      background: driver.alert_status ? '#f8d7da' : '#d4edda',
                      color: driver.alert_status ? '#721c24' : '#155724',
                      fontSize: '12px'
                    }}>
                      {driver.alert_status ? '⚠️ Alert' : '✓ Good'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#666' }}>
                    {new Date(driver.last_updated).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'analytics' ? (
        <WorkingAnalytics drivers={drivers} analytics={analytics} />
      ) : (
        <SimpleSettings />
      )}
    </div>
  )
}

export default Dashboard