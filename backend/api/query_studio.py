"""Query Studio API — executes arbitrary SQL against the active connection."""

import time
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.core.auth import get_current_user
from backend.services.connection_executor import AnalyticsDatabase, get_analytics_db

router = APIRouter(
    prefix="/api",
    tags=["query-studio"],
    dependencies=[Depends(get_current_user)],
)


class QueryStudioRequest(BaseModel):
    sql: str


class QueryStudioResponse(BaseModel):
    columns: list[str]
    rows: list[list]
    execution_time_ms: int
    error: str | None = None


@router.post("/query-studio/execute")
def execute_query(
    request: QueryStudioRequest,
    db: Annotated[AnalyticsDatabase, Depends(get_analytics_db)],
) -> QueryStudioResponse:
    """Execute arbitrary SQL against the active connection and return columns + rows."""
    start = time.monotonic()
    try:
        columns, rows = db.execute_with_columns(request.sql.strip())
    except Exception as exc:
        return QueryStudioResponse(
            columns=[],
            rows=[],
            execution_time_ms=0,
            error=str(exc),
        )
    elapsed_ms = int((time.monotonic() - start) * 1000)
    return QueryStudioResponse(
        columns=columns,
        rows=[list(row) for row in rows],
        execution_time_ms=elapsed_ms,
    )
