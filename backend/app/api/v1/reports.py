from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_permission
from app.models.user import User
from app.schemas.report import (
    ReportTypeOption,
    ReportFilterParams,
    ReportDataResponse
)
from app.services.report_service import (
    get_available_report_types,
    generate_report,
    generate_csv_export
)

router = APIRouter(prefix="/reports", tags=["Reports, Exports, & Audit History"])


@router.get("/types", response_model=List[ReportTypeOption])
def list_report_types(
    current_user: User = Depends(get_current_user)
):
    """
    Returns directory of all 12 executive, engineering, and compliance reports.
    """
    return get_available_report_types()


@router.post("/data", response_model=ReportDataResponse)
def get_report_data(
    filters: ReportFilterParams,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates structured report dataset, column definitions, and summary metrics
    respecting active filters and role-based permissions.
    """
    return generate_report(db=db, filters=filters, current_user=current_user)


@router.get("/export/csv")
def export_report_csv(
    report_type: str = Query("project_progress", description="Report identifier"),
    zone_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("reports:export"))
):
    """
    Streams CSV export file with OWASP formula injection sanitization,
    government header metadata, and audit event recording per Section 17 (Page 37).
    """
    filters = ReportFilterParams(
        report_type=report_type,  # type: ignore
        zone_id=zone_id,
        category=category,
        status=status,
        risk_level=risk_level,
        search=search
    )

    csv_content = generate_csv_export(db=db, filters=filters, current_user=current_user)

    filename = f"civicproof_{report_type}_{date.today().isoformat()}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache"
        }
    )
