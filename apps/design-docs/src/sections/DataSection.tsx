import { useState } from "react";
import { ComponentSection, ComponentRow } from "../components/ComponentSection";
import { DataTable } from "@/components/data-table";
import { EventsTable } from "@/components/events-table/EventsTable";
import { PivotTable } from "@/components/pivot-table/PivotTable";
import { VirtualList } from "@/components/virtual-list/VirtualList";
import { Pagination } from "@/components/shared/Pagination";
import type { ColumnDef } from "@tanstack/react-table";

interface SampleRow {
  id: string;
  name: string;
  value: number;
  status: string;
}

const sampleColumns: ColumnDef<SampleRow>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "value", header: "Value" },
  { accessorKey: "status", header: "Status" },
];

const sampleRows: SampleRow[] = [
  { id: "1", name: "page_view", value: 1240, status: "active" },
  { id: "2", name: "click", value: 830, status: "active" },
  { id: "3", name: "signup", value: 142, status: "active" },
  { id: "4", name: "purchase", value: 38, status: "inactive" },
];

const eventsTableProps = {
  data: [
    {
      event_id: "1",
      user_id: "u1",
      event_name: "page_view",
      timestamp: "2024-01-07T10:00:00Z",
    },
    {
      event_id: "2",
      user_id: "u2",
      event_name: "click",
      timestamp: "2024-01-07T10:01:00Z",
    },
    {
      event_id: "3",
      user_id: "u1",
      event_name: "signup",
      timestamp: "2024-01-07T10:02:00Z",
    },
  ],
  total: 3,
  page: 1,
  pageSize: 20,
  loading: false,
  sortField: "timestamp",
  sortOrder: "desc" as const,
  onSortChange: () => {},
  filterFields: [{ field: "event_name", label: "Event" }],
  customProperties: [],
  filterOptions: {},
  allEventNames: ["page_view", "click", "signup"],
  columnFilters: {},
  onColumnFilterChange: () => {},
  onColumnFilterClear: () => {},
  eventNameFilter: [],
  onEventNameFilterChange: () => {},
  userIdFilter: "",
  onUserIdFilterChange: () => {},
  onPageChange: () => {},
  onUserClick: () => {},
};

const virtualItems = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  label: `Item ${i + 1}`,
  value: Math.floor(Math.random() * 1000),
}));

function PaginationDemo() {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const total = 142;
  const totalPages = Math.ceil(total / pageSize);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      from={from}
      to={to}
      total={total}
      onPageChange={setPage}
    />
  );
}

export function DataSection() {
  return (
    <ComponentSection id="data" title="Data Display">
      <ComponentRow label="VirtualList">
        <div
          className="w-full border rounded-md overflow-hidden"
          style={{ height: 200 }}
        >
          <VirtualList
            items={virtualItems}
            estimateSize={() => 36}
            renderItem={(item) => (
              <div className="flex items-center justify-between px-3 py-2 border-b border-border text-sm">
                <span>{item.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {item.value}
                </span>
              </div>
            )}
          />
        </div>
      </ComponentRow>

      <ComponentRow label="Pagination">
        <div className="w-full border rounded-md overflow-hidden">
          <PaginationDemo />
        </div>
      </ComponentRow>

      <ComponentRow label="DataTable">
        <div className="w-full border rounded-md overflow-hidden">
          <DataTable columns={sampleColumns} data={sampleRows} />
        </div>
      </ComponentRow>

      <ComponentRow label="EventsTable">
        <div className="w-full border rounded-md overflow-hidden">
          <EventsTable {...eventsTableProps} />
        </div>
      </ComponentRow>

      <ComponentRow label="PivotTable">
        <div
          className="w-full border rounded-md overflow-hidden"
          style={{ height: 400 }}
        >
          <PivotTable
            colDefsData={{
              columnDefs: [
                {
                  field: "event_name",
                  headerName: "Event",
                  enableRowGroup: true,
                },
                {
                  field: "country",
                  headerName: "Country",
                  enableRowGroup: true,
                  enablePivot: true,
                },
                {
                  field: "count",
                  headerName: "Count",
                  enableValue: true,
                  allowedAggFuncs: ["sum"],
                },
              ],
            }}
            colDefsLoading={false}
            activeFilters={{}}
            fetchRows={async ({ rowGroups, valueCols, pivotCols }) => {
              if (rowGroups.length === 0 && valueCols.length === 0)
                return { rows: [] };
              const fakeRows = [
                {
                  event_name: "page_view",
                  country: "US",
                  count: 1240,
                  users: 890,
                },
                {
                  event_name: "page_view",
                  country: "GB",
                  count: 540,
                  users: 410,
                },
                { event_name: "click", country: "US", count: 830, users: 620 },
                { event_name: "click", country: "DE", count: 310, users: 280 },
                { event_name: "signup", country: "US", count: 142, users: 142 },
                { event_name: "signup", country: "FR", count: 58, users: 58 },
                { event_name: "purchase", country: "US", count: 38, users: 35 },
                { event_name: "purchase", country: "GB", count: 12, users: 12 },
              ];
              if (pivotCols.length > 0) {
                const pivotField = pivotCols[0].colId;
                const valueField = valueCols[0]?.colId ?? "count";
                const pivotValues = [
                  ...new Set(
                    fakeRows.map(
                      (r) => r[pivotField as keyof typeof r] as string,
                    ),
                  ),
                ];
                const grouped: Record<string, Record<string, unknown>> = {};
                const rowField = rowGroups[0]?.colId ?? "event_name";
                for (const row of fakeRows) {
                  const key = row[rowField as keyof typeof row] as string;
                  if (!grouped[key]) grouped[key] = { [rowField]: key };
                  const pv = row[pivotField as keyof typeof row] as string;
                  grouped[key][pv] = row[valueField as keyof typeof row];
                }
                const colDefs = [
                  { field: rowField, headerName: rowField },
                  ...pivotValues.map((v) => ({ field: v, headerName: v })),
                ];
                return { rows: Object.values(grouped), columnDefs: colDefs };
              }
              const rowField = rowGroups[0]?.colId ?? "event_name";
              const grouped: Record<string, Record<string, unknown>> = {};
              for (const row of fakeRows) {
                const key = row[rowField as keyof typeof row] as string;
                if (!grouped[key]) grouped[key] = { [rowField]: key };
                for (const vc of valueCols) {
                  grouped[key][vc.colId] =
                    ((grouped[key][vc.colId] as number) ?? 0) +
                    ((row[vc.colId as keyof typeof row] as number) ?? 0);
                }
              }
              return { rows: Object.values(grouped) };
            }}
            fetchFilterValues={async (field) => {
              const vals: Record<string, string[]> = {
                event_name: ["page_view", "click", "signup", "purchase"],
                country: ["US", "GB", "DE", "FR"],
                browser: ["Chrome", "Safari", "Firefox"],
              };
              return vals[field] ?? [];
            }}
          />
        </div>
      </ComponentRow>
    </ComponentSection>
  );
}
