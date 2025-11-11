import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DriverScore } from '../types'

interface DataTableProps {
  drivers: DriverScore[]
}

type SortField = 'driver_id' | 'driver_name' | 'avg_score' | 'last_updated'
type SortDirection = 'asc' | 'desc'

function DataTable({ drivers }: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('driver_id')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const navigate = useNavigate()

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const filteredAndSortedDrivers = useMemo(() => {
    let filtered = drivers.filter(driver => 
      driver.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.driver_id.toString().includes(searchTerm)
    )

    filtered.sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = (bValue as string).toLowerCase()
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [drivers, searchTerm, sortField, sortDirection])

  const handleRowClick = (driverId: number) => {
    navigate(`/driver/${driverId}`)
  }

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return ' ↕'
    return sortDirection === 'asc' ? ' ↑' : ' ↓'
  }

  return (
    <div className="card">
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          className="input"
          placeholder="Search by driver name or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('driver_id')}>
                Driver ID{getSortIndicator('driver_id')}
              </th>
              <th onClick={() => handleSort('driver_name')}>
                Driver Name{getSortIndicator('driver_name')}
              </th>
              <th onClick={() => handleSort('avg_score')}>
                Average Score{getSortIndicator('avg_score')}
              </th>
              <th onClick={() => handleSort('last_updated')}>
                Last Updated{getSortIndicator('last_updated')}
              </th>
              <th>Alert Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedDrivers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>
                  No drivers found
                </td>
              </tr>
            ) : (
              filteredAndSortedDrivers.map((driver) => (
                <tr
                  key={driver.driver_id}
                  onClick={() => handleRowClick(driver.driver_id)}
                  className={driver.avg_score < 2.5 ? 'alert-row' : ''}
                >
                  <td>{driver.driver_id}</td>
                  <td>{driver.driver_name}</td>
                  <td>{driver.avg_score.toFixed(2)}</td>
                  <td>{new Date(driver.last_updated).toLocaleString()}</td>
                  <td>
                    {driver.alert_status ? (
                      <span style={{ color: '#dc3545', fontWeight: 'bold' }}>⚠ Alert</span>
                    ) : (
                      <span style={{ color: '#28a745' }}>✓ OK</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '10px', color: '#6c757d', fontSize: '14px' }}>
        Showing {filteredAndSortedDrivers.length} of {drivers.length} drivers
      </div>
    </div>
  )
}

export default DataTable
