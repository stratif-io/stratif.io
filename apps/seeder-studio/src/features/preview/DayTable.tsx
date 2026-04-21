import { formatNum } from "@/lib/format";
import type { TwinOutput } from "@/lib/twin";

interface Props {
  out: TwinOutput;
  rows?: number;
}

export function DayTable({ out, rows = 7 }: Props) {
  const count = Math.min(rows, out.days);

  return (
    <table className="w-full text-xs tabular-nums border-collapse">
      <thead>
        <tr className="text-left text-muted-foreground border-b">
          <th className="py-1 pr-3 font-medium">Day</th>
          <th className="py-1 pr-3 font-medium">New users</th>
          <th className="py-1 pr-3 font-medium">Active users</th>
          <th className="py-1 pr-3 font-medium">Churned</th>
          <th className="py-1 pr-3 font-medium">Reactivated</th>
          <th className="py-1 font-medium">Events</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: count }, (_, i) => (
          <tr key={i} className="border-b border-border/40 hover:bg-muted/30">
            <td className="py-1 pr-3 text-muted-foreground">{i + 1}</td>
            <td className="py-1 pr-3">
              {formatNum(Math.round(out.newUsers[i]))}
            </td>
            <td className="py-1 pr-3">
              {formatNum(Math.round(out.activeUsers[i]))}
            </td>
            <td
              className="py-1 pr-3 text-destructive/80"
              data-testid={`cell-churned-${i}`}
            >
              {formatNum(Math.round(out.churnedUsers[i]))}
            </td>
            <td
              className="py-1 pr-3 text-[hsl(var(--chart-4))]/80"
              data-testid={`cell-reactivated-${i}`}
            >
              {formatNum(Math.round(out.reactivatedUsers[i]))}
            </td>
            <td className="py-1" data-testid={`cell-events-${i}`}>
              {formatNum(Math.round(out.events[i]))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
