"""WebSocket endpoint for real-time analytics metrics."""

import asyncio
import contextlib
import json
from datetime import UTC, datetime

import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError

from openflow.core.jwt_utils import decode_access_token
from openflow.db import get_db
from openflow.product_db import get_product_db
from openflow.services.connection_executor import open_analytics_db

log = structlog.get_logger(__name__)

router = APIRouter(tags=["realtime"])

PUSH_INTERVAL = 10  # seconds between periodic metric pushes


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


def _authenticate_ws(websocket: WebSocket) -> str | None:
    """Read the JWT session cookie and return user_id, or None if invalid."""
    token = websocket.cookies.get("of_session")
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        return payload.get("sub")
    except JWTError:
        return None


# ---------------------------------------------------------------------------
# DB resolution
# ---------------------------------------------------------------------------


def _get_db_for_user(user_id: str):
    """Return the analytics DB for the user's first connection, or the default DB."""
    product_db = get_product_db()
    row = product_db.fetchone(
        "SELECT id FROM connections WHERE user_id = ? ORDER BY created_at ASC LIMIT 1",
        (user_id,),
    )
    if row:
        return open_analytics_db(row["id"], user_id)
    return get_db()


# ---------------------------------------------------------------------------
# Metric fetchers  (synchronous — called via run_in_executor)
# ---------------------------------------------------------------------------


def _fetch_event_count(db) -> dict:
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


def _fetch_active_users(db) -> dict:
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


def _fetch_conversion(db) -> dict:
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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _now() -> str:
    return datetime.now(UTC).isoformat()


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    # ── Auth ────────────────────────────────────────────────────────────────
    user_id = _authenticate_ws(websocket)
    if not user_id:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await websocket.accept()
    log.info("ws_connected", user_id=user_id)

    loop = asyncio.get_running_loop()

    # ── Open analytics DB ────────────────────────────────────────────────────
    # try:
    db = await loop.run_in_executor(None, _get_db_for_user, user_id)
    # except Exception as exc:
    #    log.error("ws_db_open_failed", user_id=user_id, error=str(exc))
    #    await websocket.close(code=4500, reason="Database error")
    #    return

    # ── State ────────────────────────────────────────────────────────────────
    # subscriptions: {subscriptionId → event_type}
    subscriptions: dict[str, str] = {}

    # ── Background push loop ─────────────────────────────────────────────────
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

    # ── Message loop ─────────────────────────────────────────────────────────
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
                    # Immediately push current data so the client doesn't wait PUSH_INTERVAL
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
        log.info("ws_disconnected", user_id=user_id)
    except Exception as exc:
        log.error("ws_error", user_id=user_id, error=str(exc))
    finally:
        push_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await push_task
