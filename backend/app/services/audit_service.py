import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.user import AuditEvent


def record_audit_event(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: str,
    actor_id: Optional[str] = None,
    actor_email: Optional[str] = None,
    reason: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> AuditEvent:
    """
    Records an append-only audit event in the database.
    Historical events are immutable through application APIs.
    """
    # Deterministic or timestamped unique event code e.g. EVT-20261031-A1B2
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    suffix = uuid.uuid4().hex[:6].upper()
    event_code = f"EVT-{ts}-{suffix}"

    event = AuditEvent(
        id=str(uuid.uuid4()),
        event_id=event_code,
        actor_id=actor_id,
        actor_email=actor_email,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        reason=reason,
        details=details or {},
        ip_address=ip_address,
        created_at=datetime.now(timezone.utc)
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event
