import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Smartphone, Monitor, ArrowRight } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_KEY = import.meta.env.VITE_API_KEY || 'dev-key-change-in-production'

const fetchWithAuth = (url, options = {}) => {
  return fetch(url, {
    ...options,
    headers: {
      'X-Api-Key': API_KEY,
      ...options.headers,
    },
  })
}

function PathAnalysisTable({ targetEvent, startDate, endDate }) {
  const [pathData, setPathData] = useState([])
  const [deviceType, setDeviceType] = useState('')
  const [loading, setLoading] = useState(false)
  const [totalOccurrences, setTotalOccurrences] = useState(0)

  useEffect(() => {
    if (!targetEvent || !startDate || !endDate) return

    setLoading(true)
    const params = new URLSearchParams()
    params.append('target_event', targetEvent)
    if (deviceType) params.append('device_type', deviceType)
    params.append('start_date', startDate)
    params.append('end_date', endDate)
    params.append('limit', '5')

    fetchWithAuth(`${API_URL}/api/paths?${params}`)
      .then(res => res.json())
      .then(data => {
        setPathData(data.data || [])
        setTotalOccurrences(data.total_occurrences || 0)
      })
      .catch(err => console.error('Error fetching paths:', err))
      .finally(() => setLoading(false))
  }, [targetEvent, deviceType, startDate, endDate])

  const getRankColor = (idx) => {
    if (idx === 0) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
    if (idx === 1) return 'bg-gray-400/10 text-gray-600 border-gray-400/20'
    if (idx === 2) return 'bg-orange-700/10 text-orange-700 border-orange-700/20'
    return 'bg-muted text-muted-foreground'
  }

  const getDeviceIcon = (type) => {
    return type === 'Mobile' ? (
      <Smartphone className="h-4 w-4 mr-1" />
    ) : (
      <Monitor className="h-4 w-4 mr-1" />
    )
  }

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (pathData.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-muted-foreground">
        No paths found for "{targetEvent}"
      </div>
    )
  }

  const maxCount = Math.max(...pathData.map(p => p.count))

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{totalOccurrences.toLocaleString()}</span> total occurrences
        </div>
        <Select value={deviceType || "all"} onValueChange={(val) => setDeviceType(val === "all" ? "" : val)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Devices" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Devices</SelectItem>
            <SelectItem value="Mobile">Mobile</SelectItem>
            <SelectItem value="Desktop">Desktop</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Visual Bar Chart */}
      <div className="space-y-3">
        {pathData.map((path, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`${getRankColor(idx)} font-mono`}>
                  #{idx + 1}
                </Badge>
                <span className="font-medium text-muted-foreground">{path.step_3}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium text-muted-foreground">{path.step_2}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{path.step_1}</span>
                <ArrowRight className="h-3 w-3 text-primary" />
                <span className="font-semibold text-primary">{path.target}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center text-muted-foreground">
                  {getDeviceIcon(path.device_type)}
                  <span className="text-xs">{path.device_type}</span>
                </div>
                <span className="font-semibold w-16 text-right">{path.count}</span>
                <span className="text-xs text-muted-foreground w-12 text-right">{path.percentage}%</span>
              </div>
            </div>
            <Progress 
              value={(path.count / maxCount) * 100} 
              className="h-2"
            />
          </div>
        ))}
      </div>

      {/* Detailed Table */}
      <Card className="mt-6">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Device</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pathData.map((path, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Badge variant="outline" className={`${getRankColor(idx)}`}>
                      #{idx + 1}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 font-mono text-sm">
                      <span className="text-muted-foreground">{path.step_3}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{path.step_2}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span>{path.step_1}</span>
                      <ArrowRight className="h-3 w-3 text-primary" />
                      <span className="font-semibold text-primary">{path.target}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {getDeviceIcon(path.device_type)}
                      <span className="text-sm">{path.device_type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {path.count.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{path.percentage}%</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default PathAnalysisTable
