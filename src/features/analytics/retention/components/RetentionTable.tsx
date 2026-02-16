import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { RetentionCohort } from '@/types'

interface RetentionTableProps {
  data: RetentionCohort[]
}

function getBadgeVariant(percent: number, thresholds: { good: number; medium: number }) {
  if (percent >= thresholds.good) return 'default'
  if (percent >= thresholds.medium) return 'secondary'
  return 'destructive'
}

export function RetentionTable({ data }: RetentionTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cohort Date</TableHead>
          <TableHead>Users</TableHead>
          <TableHead>Day 0</TableHead>
          <TableHead>Day 1</TableHead>
          <TableHead>Day 7</TableHead>
          <TableHead>Day 14</TableHead>
          <TableHead>Day 30</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, idx) => (
          <TableRow key={idx}>
            <TableCell>{new Date(row.cohort_date).toLocaleDateString()}</TableCell>
            <TableCell>{row.cohort_size}</TableCell>
            <TableCell>
              <Badge variant={getBadgeVariant(row.day_0_percent, { good: 80, medium: 50 })}>
                {row.day_0_percent}%
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={getBadgeVariant(row.day_1_percent, { good: 40, medium: 20 })}>
                {row.day_1_percent}%
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={getBadgeVariant(row.day_7_percent, { good: 20, medium: 10 })}>
                {row.day_7_percent}%
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={getBadgeVariant(row.day_14_percent, { good: 15, medium: 8 })}>
                {row.day_14_percent}%
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={getBadgeVariant(row.day_30_percent, { good: 10, medium: 5 })}>
                {row.day_30_percent}%
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
