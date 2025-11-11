import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { DriverScore } from '../types'
import WorkingAnalytics from './WorkingAnalytics'
import SimpleSettings from './SimpleSettings'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http:

function ImprovedDashboard() {
  const [drivers, setDrivers] = useState<DriverScore[]>([])
  const [filteredDrivers, setFilteredDrivers] = useState<DriverScore[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'settings'>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'alert' | 'good'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'updated'>('score')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const { token, logout } = useAuth()

  useEffect(() => {
    fetchDashboardData()
    
    
    let interval: number | null = null
    if (autoRefresh) {
      interval = setInterval(fetchDashboardData, 30000) as unknown as number
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

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
      if (sortBy === 'name') {
        comparison = a.driver_name.localeCompare(b.driver_name)
      } else if (sortBy === 'score') {
        comparison = a.avg_score - b.avg_score
      } else if (sortBy === 'updated') {
        comparison = new Date(a.last_updated).getTime() - new Date(b.last_updated).getTime()
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    setFilteredDrivers(filtered)
  }, [drivers, searchTerm, filterStatus, sortBy, sortOrder])

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

  if (loading && drivers.length === 0) {
    return <div style={{ padding: '20px' }}>Loading dashboard...</div>
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>
        <button onClick={fetchDashboardData} style={{ padding: '10px 20px' }}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <h1 style={{ margin: 0 }}>Driver Sentiment Dashboard</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input 
              type="checkbox" 
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (30s)
          </label>
          <button 
            onClick={fetchDashboardData}
            style={{ 
              padding: '8px 16px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh
          </button>
          <button 
            onClick={logout}
            style={{ 
              padding: '8px 16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        borderBottom: '2px solid #dee2e6'
      }}>
        {(['overview', 'analytics', 'settings'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              background: activeTab === tab ? '#007bff' : 'transparent',
              color: activeTab === tab ? 'white' : '#007bff',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #007bff' : 'none',
              cursor: 'pointer',
              fontSize: '16px',
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {}
      {activeTab === 'overview' ? (
        <div>
          {}
          <div style={{ 
            background: 'white', 
            padding: '15px', 
            borderRadius: '8px',
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search drivers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  flex: '1',
                  minWidth: '200px'
                }}
              />
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value="all">All Drivers</option>
                <option value="alert">Alerts Only</option>
                <option value="good">Good Performance</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value="score">Sort by Score</option>
                <option value="name">Sort by Name</option>
                <option value="updated">Sort by Updated</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                style={{
                  padding: '8px 12px',
                  background: '#f8f9fa',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
              
              <div style={{ color: '#666' }}>
                Showing {filteredDrivers.length} of {drivers.length} drivers
              </div>
            </div>
          </div>

          {}
          <div style={{ 
            background: 'white', 
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Driver Name</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Score</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((driver) => (
                  <tr 
                    key={driver.driver_id}
                    style={{ 
                      borderBottom: '1px solid #dee2e6',
                      background: driver.alert_status ? '#fff3cd' : 'white'
                    }}
                  >
                    <td style={{ padding: '12px', fontWeight: '500' }}>
                      {driver.driver_name}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '4px 12px',
                        borderRadius: '12px',
                        background: driver.avg_score >= 4 ? '#d4edda' : 
                                   driver.avg_score >= 3 ? '#fff3cd' : '#f8d7da',
                        color: driver.avg_score >= 4 ? '#155724' : 
                               driver.avg_score >= 3 ? '#856404' : '#721c24',
                        fontWeight: 'bold'
                      }}>
                        {driver.avg_score.toFixed(2)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '4px 12px',
                        borderRadius: '12px',
                        background: driver.alert_status ? '#f8d7da' : '#d4edda',
                        color: driver.alert_status ? '#721c24' : '#155724',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {driver.alert_status ? '⚠️ Alert' : '✓ Good'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#666', fontSize: '14px' }}>
                      {new Date(driver.last_updated).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'analytics' ? (
        <WorkingAnalytics drivers={drivers} analytics={analytics} />
      ) : (
        <SimpleSettings />
      )}
    </div>
  )
}

export default ImprovedDashboard