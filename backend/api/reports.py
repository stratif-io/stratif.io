"""Reports API — create and retrieve shareable reports by shortcode."""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select

from backend.core.auth import get_current_user
from backend.product_db.deps import DBSession
from backend.product_db.models import Report

router = APIRouter(prefix="/api/reports", tags=["reports"])


class CreateReportRequest(BaseModel):
    name: str
    page: str
    params: dict[str, Any] = {}
    access: str = "public"
    snapshot: bool = False
    snapshot_data: str | None = None
    created_by_username: str = ""


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_report(
    body: CreateReportRequest,
    session: DBSession,
    _user: None = Depends(get_current_user),
) -> dict[str, str]:
    report = Report(
        name=body.name,
        page=body.page,
        params=json.dumps(body.params),
        access=body.access,
        snapshot=body.snapshot,
        snapshot_data=body.snapshot_data,
        created_by_username=body.created_by_username,
    )
    session.add(report)
    await session.commit()
    return {"shortcode": report.shortcode, "id": report.id}


@router.get("/{shortcode}")
async def get_report(
    shortcode: str, request: Request, session: DBSession
) -> dict[str, Any]:
    result = await session.execute(select(Report).where(Report.shortcode == shortcode))
    report = result.scalar_one_or_none()
    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Report not found"
        )
    if report.access == "authenticated" and not request.headers.get("X-API-Key"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Authentication required"
        )
    return {
        "id": report.id,
        "shortcode": report.shortcode,
        "name": report.name,
        "page": report.page,
        "params": json.loads(report.params),
        "access": report.access,
        "snapshot": report.snapshot,
        "snapshot_data": report.snapshot_data,
        "created_by_username": report.created_by_username,
        "created_at": report.created_at.isoformat(),
    }
