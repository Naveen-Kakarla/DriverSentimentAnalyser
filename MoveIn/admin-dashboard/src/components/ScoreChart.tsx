import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { ScorePoint } from '../types'

interface ScoreChartProps {
  data: ScorePoint[]
}

function ScoreChart({ data }: ScoreChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
        No score data available
      </div>
    )
  }

  const chartData = data.map(point => ({
    timestamp: new Date(point.timestamp).toLocaleString(),
    score: parseFloat(point.avg_score.toFixed(2))
  }))

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="timestamp" 
          angle={-45}
          textAnchor="end"
          height={100}
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          domain={[0, 5]} 
          label={{ value: 'Average Score', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip />
        <Legend />
        <ReferenceLine 
          y={2.5} 
          stroke="#dc3545" 
          strokeDasharray="3 3" 
          label="Alert Threshold"
        />
        <Line 
          type="monotone" 
          dataKey="score" 
          stroke="#007bff" 
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
          name="Average Score"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default ScoreChart
