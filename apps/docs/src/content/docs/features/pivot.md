---
title: Pivot
description: Cross-tabulate any event property against any other
---

Pivot lets you slice your event data across two dimensions simultaneously — rows and columns — to spot patterns that one-dimensional charts miss.

![Pivot table showing event counts by month (rows) and OS (columns)](/screenshots/pivot.png)

## Building a pivot

- **Rows** — the dimension that becomes table rows (Month in the example)
- **Columns** — the dimension that becomes column headers (OS in the example)
- **Values** — the metric in each cell (Event Count by default)

Drag and drop any event property into rows or columns. Add multiple values to see them side by side.

## Export

Click **CSV** or **XLSX** to export the full table. Pivot is often the last step before handing data to a stakeholder who needs a spreadsheet.

## When to use Pivot

Use Pivot when you need to answer questions with two independent dimensions:

- "How does event volume break down by OS _and_ by month?" (spot which OS is growing or shrinking)
- "How does conversion rate vary by country _and_ by device type?" (find the worst-performing combination)
- "How does feature usage break down by plan tier _and_ by geography?"

One-dimensional breakdowns answer one of these questions. Pivot answers both at once.
