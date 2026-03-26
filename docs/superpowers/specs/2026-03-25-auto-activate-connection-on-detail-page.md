# Auto-Activate Connection on Detail Page

**Date:** 2026-03-25
**Status:** Draft

## Summary

When a user navigates to a connection's detail page (`/connections/:id`), the app automatically tests the connection in the background. If the test passes, the connection becomes the active connection (`activeConnectionId` in the app store). If it fails, the active connection is unchanged.

## Motivation

Currently, navigating to a connection detail page does not update the active connection in the `ConnectionSelector` header dropdown. Users expect that viewing/editing a connection implicitly makes it the active one — but only if it actually works.

## Design

### Behavior

1. `ConnectionDetailPage` mounts and the connection data loads from the API.
2. A connection test is automatically triggered (using the existing `useTestConnection` hook).
3. A status indicator is shown near the connection header:
   - **Verifying…** (spinner) — while the test is in flight
   - **Active** (green dot) — test passed; `setActiveConnectionId(connection.id)` is called
   - **Connection failed** (red) — test failed; active connection unchanged
4. The test runs once on load. No polling or auto-retry. Because `ConnectionDetailPage` remounts on each navigation, the test re-runs every time the user navigates to the page — this is intentional (ensures the connection is still reachable).

### Scope

- **Modified:** `ConnectionDetailPage.tsx` — add auto-test logic and status indicator
- **Unchanged:** `ConnectionConfigTab.tsx` (has its own manual "Test Connection" button), `ConnectionSelector.tsx`, `app-store.ts`

### Status Indicator Placement

Displayed inline with the connection name/type header, to the right of the db type label. Compact — does not interrupt the page layout.

## Error Handling

- If the test API call fails (network error), treat as a failed test — do not set as active. Any non-success result (timeout, auth error, unreachable host) is treated uniformly as "Connection failed".
- If the connection data itself fails to load, existing error handling in `ConnectionDetailPage` applies (no change).
- The auto-test and the manual "Test Connection" button in `ConnectionConfigTab` use the same hook independently. No deduplication is needed — each runs its own mutation and they do not interfere.
- After the auto-test sets the connection as active, subsequent config edits do not clear the active status. The "Active" indicator reflects the test result at page load; it resets (back to "Verifying…") only on next navigation to the page.
