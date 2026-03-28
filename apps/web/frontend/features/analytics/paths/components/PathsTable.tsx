import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, Smartphone, Monitor } from 'lucide-react'
import type { PathData } from '@/types'

interface PathsTableProps {
  data: PathData[]
}

function getRankColor(idx: number): string {
  if (idx === 0) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
  if (idx === 1) return 'bg-muted text-muted-foreground border-border'
  if (idx === 2) return 'bg-orange-700/10 text-orange-700 border-orange-700/20'
  return 'bg-muted text-muted-foreground'
}

function getDeviceIcon(type: string): React.ReactNode {
  return type === 'Mobile' ? (
    <Smartphone className="h-4 w-4 mr-1" />
  ) : (
    <Monitor className="h-4 w-4 mr-1" />
  )
}

export function PathsTable({ data }: PathsTableProps) {
  return (
    <Card>
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
            {data.map((path, idx) => (
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
  )
}
