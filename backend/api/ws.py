"""WebSocket endpoint for real-time analytics metrics."""

import asyncio
import contextlib
import json
from datetime import UTC, datetime

import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.services.connection_executor import AnalyticsDatabase, get_analytics_db

log = structlog.get_logger(__name__)

router = APIRouter(tags=["realtime"])

PUSH_INTERVAL = 10  # seconds between periodic metric pushes


# ---------------------------------------------------------------------------
# Metric fetchers  (synchronous — called via run_in_executor)
# ---------------------------------------------------------------------------


def _fetch_event_count(db: AnalyticsDatabase) -> dict:
    rows = db.execute("""
        SELECT
            COUNT(*)                                                            AS total,
            COUNT(*) FILTER (WHERE CAST(timestamp AS DATE) = CURRENT_DATE)     AS today,
            COUNT(*) FILTER (
                WHERE CAST(timestamp AS DATE) = CURRENT_DATE - INTERVAL '1 day'
            )                                                                   AS yesterday
        FROM events
    """)
    total, today, yesterday = rows[0]
    change = round((today - yesterday) / yesterday * 100, 1) if yesterday else 0.0
    return {"total": total, "today": today, "change": change}


def _fetch_active_users(db: AnalyticsDatabase) -> dict:
    """Users active in the last 30 minutes relative to the most recent event."""
    rows = db.execute("""
        WITH latest AS (
            SELECT MAX(timestamp) AS max_ts FROM events
        ),
        recent AS (
            SELECT
                e.user_id,
                e.timestamp,
                json_extract_string(e.properties, 'page_url') AS page,
                ROW_NUMBER() OVER (
                    PARTITION BY e.user_id ORDER BY e.timestamp DESC
                ) AS rn
            FROM events e, latest
            WHERE e.timestamp >= latest.max_ts - INTERVAL '30 minutes'
        )
        SELECT
            user_id,
            MAX(timestamp)                              AS last_active,
            MAX(CASE WHEN rn = 1 THEN page END)         AS page
        FROM recent
        GROUP BY user_id
        ORDER BY last_active DESC
        LIMIT 20
    """)
    users = [
        {
            "id": row[0],
            "lastActive": row[1].isoformat()
            if isinstance(row[1], datetime)
            else str(row[1]),
            "page": row[2] or "/",
        }
        for row in rows
    ]
    return {"count": len(users), "users": users}


def _fetch_conversion(db: AnalyticsDatabase) -> dict:
    """Overall Home → Purchase conversion rate."""
    rows = db.execute("""
        WITH home_users AS (
            SELECT DISTINCT user_id FROM events WHERE event_name = 'Home'
        ),
        converted AS (
            SELECT DISTINCT h.user_id
            FROM home_users h
            WHERE EXISTS (
                SELECT 1 FROM events e
                WHERE e.user_id = h.user_id AND e.event_name = 'Purchase'
            )
        )
        SELECT
            (SELECT COUNT(*) FROM home_users) AS total,
            (SELECT COUNT(*) FROM converted)  AS converted
    """)
    total, converted = rows[0]
    rate = round(converted / total * 100, 2) if total else 0.0
    return {"conversionRate": rate, "totalConverted": converted, "change": 0.0}


_FETCHERS = {
    "event_count": _fetch_event_count,
    "active_users": _fetch_active_users,
    "conversion_update": _fetch_conversion,
}


def _now() -> str:
    return datetime.now(UTC).isoformat()


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    log.info("ws_connected")

    loop = asyncio.get_running_loop()

    # Get the analytics DB (pass connection_id=None explicitly — not via DI)
    try:
        db_gen = get_analytics_db(connection_id=None)  # type: ignore[call-arg]
        db = await db_gen.__anext__()
    except Exception as exc:
        await websocket.send_json({"type": "error", "message": str(exc)})
        await websocket.close()
        return

    subscriptions: dict[str, str] = {}

    async def push_loop() -> None:
        while True:
            await asyncio.sleep(PUSH_INTERVAL)
            pending = set(subscriptions.values())
            for event_type in pending:
                try:
                    payload = await loop.run_in_executor(
                        None, _FETCHERS[event_type], db
                    )
                    await websocket.send_json(
                        {
                            "type": "data",
                            "event": event_type,
                            "payload": payload,
                            "timestamp": _now(),
                        }
                    )
                except Exception as exc:
                    log.warning("ws_push_error", event=event_type, error=str(exc))

    push_task = asyncio.create_task(push_loop())

    try:
        await websocket.send_json({"type": "connected", "timestamp": _now()})

        while True:
            try:
                msg = json.loads(await websocket.receive_text())
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            elif msg_type == "subscribe":
                event = msg.get("event")
                sub_id = msg.get("subscriptionId")
                if event in _FETCHERS and sub_id:
                    subscriptions[sub_id] = event
                    try:
                        payload = await loop.run_in_executor(None, _FETCHERS[event], db)
                        await websocket.send_json(
                            {
                                "type": "data",
                                "event": event,
                                "payload": payload,
                                "timestamp": _now(),
                                "subscriptionId": sub_id,
                            }
                        )
                    except Exception as exc:
                        log.warning(
                            "ws_subscribe_fetch_error", event=event, error=str(exc)
                        )

            elif msg_type == "unsubscribe":
                subscriptions.pop(msg.get("subscriptionId", ""), None)

    except WebSocketDisconnect:
        log.info("ws_disconnected")
    except Exception as exc:
        log.error("ws_error", error=str(exc))
    finally:
        push_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await push_task
