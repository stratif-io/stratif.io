/**
 * Shared domain types used by design system components.
 */

export interface Event {
  user_id: string;
  event_name: string;
  timestamp: string;
  properties: Record<string, unknown>;
  session_id?: string;
  device_type?: string;
}
