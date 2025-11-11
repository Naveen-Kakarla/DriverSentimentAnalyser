import { DriverScore } from '../types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts'

interface WorkingAnalyticsProps {
  drivers: DriverScore[]
  analytics: any
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

function WorkingAnalytics({ drivers, analytics }: WorkingAnalyticsProps) {
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

  
  const topPerformers = drivers
    .sort((a, b) => b.avg_score - a.avg_score)
    .slice(0, 8)
    .map(driver => ({
      name: driver.driver_name.split(' ')[0], 
      score: Number(driver.avg_score.toFixed(2))
    }))

  
  const alertStatusData = [
    { name: 'Good Performance', value: drivers.length - alertCount },
    { name: 'Needs Attention', value: alertCount }
  ]

  
  const sentimentData = analytics?.sentiment_distribution?.map((item: any) => ({
    name: item.category.charAt(0).toUpperCase() + item.category.slice(1),
    value: item.count,
    percentage: item.percentage || 0
  })) || []

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
          <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>Total Drivers</h3>
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
          <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>Active Alerts</h3>
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
          <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>Average Score</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#00C49F' }}>
            {avgScore.toFixed(2)}
          </div>
        </div>

        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>Sentiment Categories</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#8884D8' }}>
            {sentimentData.length}
          </div>
        </div>
      </div>

      {}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '30px' 
      }}>
        
        {}
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Top Driver Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topPerformers} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="score" fill="#8884d8" name="Sentiment Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {}
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Performance Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={alertStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {alertStatusData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {}
        {sentimentData.length > 0 && (
          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '8px', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>3-Category Sentiment Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percentage }) => `${name}: ${value} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sentimentData.map((_entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {}
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>All Drivers Performance</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {drivers
              .sort((a, b) => b.avg_score - a.avg_score)
              .map((driver, index) => (
                <div key={driver.driver_id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '8px 0',
                  borderBottom: index < drivers.length - 1 ? '1px solid #eee' : 'none'
                }}>
                  <div style={{ flex: 1, fontWeight: '500' }}>
                    {driver.driver_name}
                  </div>
                  <div style={{ width: '100px', margin: '0 10px' }}>
                    <div style={{ 
                      width: '100%', 
                      height: '16px', 
                      background: '#f0f0f0', 
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        width: `${(driver.avg_score / 5) * 100}%`, 
                        height: '100%', 
                        background: driver.alert_status ? '#FF8042' : '#00C49F',
                        borderRadius: '8px'
                      }}></div>
                    </div>
                  </div>
                  <div style={{ 
                    minWidth: '50px', 
                    textAlign: 'right',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}>
                    {driver.avg_score.toFixed(2)}
                  </div>
                  <div style={{ 
                    minWidth: '60px', 
                    textAlign: 'center',
                    marginLeft: '10px'
                  }}>
                    <span style={{ 
                      padding: '2px 6px', 
                      borderRadius: '10px',
                      fontSize: '11px',
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
      </div>

      {}
      {analytics && (
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginTop: '30px'
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
            <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
              <strong>Entity Trends:</strong> {analytics.entity_trends?.length || 0} categories
            </div>
          </div>
          
          {}
          {sentimentData.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h4>Sentiment Breakdown:</h4>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {sentimentData.map((item: any, index: number) => (
                  <div key={index} style={{ 
                    padding: '10px 15px', 
                    background: COLORS[index % COLORS.length], 
                    color: 'white',
                    borderRadius: '8px',
                    fontWeight: 'bold'
                  }}>
                    {item.name}: {item.value} ({item.percentage}%)
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default WorkingAnalytics