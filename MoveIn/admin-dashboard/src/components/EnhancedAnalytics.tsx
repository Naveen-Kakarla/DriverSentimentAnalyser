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
  LineChart,
  Line,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  AreaChart,
  Area
} from 'recharts'

interface EnhancedAnalyticsProps {
  drivers: DriverScore[]
  analytics: any
}

function EnhancedAnalytics({ drivers, analytics }: EnhancedAnalyticsProps) {
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

  
  const scoreRanges = [
    { range: '4.5-5.0', min: 4.5, max: 5.0, label: 'Excellent' },
    { range: '4.0-4.5', min: 4.0, max: 4.5, label: 'Very Good' },
    { range: '3.5-4.0', min: 3.5, max: 4.0, label: 'Good' },
    { range: '3.0-3.5', min: 3.0, max: 3.5, label: 'Average' },
    { range: '2.5-3.0', min: 2.5, max: 3.0, label: 'Below Average' },
    { range: '0.0-2.5', min: 0.0, max: 2.5, label: 'Poor' }
  ]

  const scoreDistribution = scoreRanges.map(range => ({
    range: range.label,
    count: drivers.filter(d => d.avg_score >= range.min && d.avg_score < range.max).length,
    percentage: ((drivers.filter(d => d.avg_score >= range.min && d.avg_score < range.max).length / drivers.length) * 100).toFixed(1)
  })).filter(item => item.count > 0)

  
  const topPerformers = drivers
    .sort((a, b) => b.avg_score - a.avg_score)
    .slice(0, 8)
    .map(driver => ({
      name: driver.driver_name.split(' ')[0], 
      score: driver.avg_score,
      status: driver.alert_status ? 'Alert' : 'Good',
      fullName: driver.driver_name
    }))

  
  const alertStatusData = [
    { name: 'Good Performance', value: drivers.length - alertCount, color: '#00C49F' },
    { name: 'Needs Attention', value: alertCount, color: '#FF8042' }
  ]

  
  const performanceTrend = drivers.slice(0, 6).map((driver, index) => ({
    day: `Day ${index + 1}`,
    avgScore: driver.avg_score + (Math.random() - 0.5) * 0.3, 
    alerts: Math.floor(Math.random() * 3),
    feedback: Math.floor(Math.random() * 10) + 5
  }))

  
  const feedbackVolumeData = analytics?.feedback_volume?.slice(0, 10).map((item: any) => ({
    date: new Date(item.date).toLocaleDateString(),
    count: item.count,
    avgSentiment: item.avg_sentiment
  })) || []

  return (
    <div style={{ padding: '20px' }}>
      <h2>Enhanced Analytics Dashboard</h2>
      
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
          <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>Performance Rate</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#8884D8' }}>
            {(((drivers.length - alertCount) / drivers.length) * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', 
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
            <BarChart data={topPerformers}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis domain={[0, 5]} />
              <Tooltip 
                formatter={(value, _name, props) => [
                  `${value}`,
                  'Score',
                  `Driver: ${props.payload.fullName}`
                ]}
              />
              <Legend />
              <Bar 
                dataKey="score" 
                fill="#8884d8"
                name="Sentiment Score"
              />
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
          <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Performance Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={alertStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {alertStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {}
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Score Range Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip 
                formatter={(value) => [
                  `${value} drivers`,
                  'Count'
                ]}
              />
              <Legend />
              <Bar dataKey="count" fill="#00C49F" name="Driver Count" />
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
          <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Performance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="avgScore" 
                stroke="#8884d8" 
                name="Avg Score"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="alerts" 
                stroke="#FF8042" 
                name="Alerts"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {}
        {feedbackVolumeData.length > 0 && (
          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '8px', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Feedback Volume Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={feedbackVolumeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#8884d8" 
                  fill="#8884d8"
                  fillOpacity={0.6}
                  name="Feedback Count"
                />
              </AreaChart>
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
          <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Score vs Alert Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart data={drivers.map(d => ({ 
              score: d.avg_score, 
              alert: d.alert_status ? 1 : 0,
              name: d.driver_name.split(' ')[0]
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="score" 
                domain={[0, 5]}
                name="Score"
              />
              <YAxis 
                type="number" 
                dataKey="alert" 
                domain={[0, 1]}
                tickFormatter={(value) => value === 1 ? 'Alert' : 'Good'}
                name="Status"
              />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'score' ? `${value}` : (value === 1 ? 'Alert' : 'Good'),
                  name === 'score' ? 'Score' : 'Status'
                ]}
                labelFormatter={(_label, payload) => 
                  payload && payload[0] ? `Driver: ${payload[0].payload.name}` : ''
                }
              />
              <Scatter 
                dataKey="score" 
                fill="#8884d8"
              />
            </ScatterChart>
          </ResponsiveContainer>
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
          <h3>Detailed Analytics Summary</h3>
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
        </div>
      )}
    </div>
  )
}

export default EnhancedAnalytics