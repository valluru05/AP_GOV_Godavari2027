from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User, AuditEvent
from app.schemas.user import AuditEventResponse
from app.api.deps import require_permission

router = APIRouter(prefix="/audit", tags=["Audit Log"])


@router.get("", response_model=List[AuditEventResponse])
def list_audit_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    actor_email: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("audit:read"))
):
    """
    Retrieves immutable audit event history.
    Requires audit:read permission.
    Supports filtering by action, entity, actor, and date ranges.
    """
    query = db.query(AuditEvent)

    if action:
        query = query.filter(AuditEvent.action == action)
    if entity_type:
        query = query.filter(AuditEvent.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditEvent.entity_id == entity_id)
    if actor_email:
        query = query.filter(AuditEvent.actor_email.ilike(f"%{actor_email}%"))
    if start_date:
        query = query.filter(AuditEvent.created_at >= start_date)
    if end_date:
        query = query.filter(AuditEvent.created_at <= end_date)

    events = query.order_by(AuditEvent.created_at.desc()).offset(skip).limit(limit).all()
    return events
