import { DriverScore } from '../types'

interface SimpleAnalyticsProps {
  drivers: DriverScore[]
  analytics: any
}

function SimpleAnalytics({ drivers, analytics }: SimpleAnalyticsProps) {
  if (!drivers || drivers.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h3>No Analytics Data Available</h3>
        <p>Please check if the system is running and data is available.</p>
      </div>
    )
  }

  const alertCount = drivers.filter(d => d.alert_status).length
  const avgScore = drivers.reduce((sum, d) => sum + d.avg_score, 0) / drivers.length

  return (
    <div style={{ padding: '20px' }}>
      <h2>Analytics Dashboard</h2>
      
      {}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px', 
        marginBottom: '30px' 
      }}>
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#666' }}>Total Drivers</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>
            {drivers.length}
          </div>
        </div>
        
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#666' }}>Active Alerts</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#FF8042' }}>
            {alertCount}
          </div>
        </div>
        
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#666' }}>Average Score</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#00C49F' }}>
            {avgScore.toFixed(2)}
          </div>
        </div>
      </div>

      {}
      <div style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h3>Driver Performance</h3>
        <div>
          {drivers
            .sort((a, b) => b.avg_score - a.avg_score)
            .map((driver, index) => (
              <div key={driver.driver_id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '10px 0',
                borderBottom: index < drivers.length - 1 ? '1px solid #eee' : 'none'
              }}>
                <div style={{ flex: 1, fontWeight: '500' }}>
                  {driver.driver_name}
                </div>
                <div style={{ width: '200px', margin: '0 15px' }}>
                  <div style={{ 
                    width: '100%', 
                    height: '20px', 
                    background: '#f0f0f0', 
                    borderRadius: '10px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: `${(driver.avg_score / 5) * 100}%`, 
                      height: '100%', 
                      background: driver.alert_status ? '#FF8042' : '#00C49F',
                      borderRadius: '10px'
                    }}></div>
                  </div>
                </div>
                <div style={{ 
                  minWidth: '60px', 
                  textAlign: 'right',
                  fontWeight: 'bold'
                }}>
                  {driver.avg_score.toFixed(2)}
                </div>
                <div style={{ 
                  minWidth: '80px', 
                  textAlign: 'center',
                  marginLeft: '10px'
                }}>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '12px',
                    fontSize: '12px',
                    background: driver.alert_status ? '#FFE5E5' : '#E5F5E5',
                    color: driver.alert_status ? '#CC0000' : '#006600'
                  }}>
                    {driver.alert_status ? 'Alert' : 'Good'}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {}
      {analytics && (
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3>Analytics Data Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
              <strong>Feedback Volume:</strong> {analytics.feedback_volume?.length || 0} entries
            </div>
            <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
              <strong>Sentiment Categories:</strong> {analytics.sentiment_distribution?.length || 0} types
            </div>
            <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
              <strong>Performance Data:</strong> {analytics.driver_performance?.length || 0} drivers
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SimpleAnalytics