from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.notification import (
    NotificationRead,
    NotificationListResponse,
    NotificationUnreadCountResponse,
    MyTasksResponse,
    ExternalChannelsStatusResponse
)
from app.services.notification_service import (
    get_user_notifications,
    mark_notification_as_read,
    mark_all_notifications_as_read,
    get_unread_count,
    get_my_tasks,
    get_external_channels_status
)

router = APIRouter(prefix="/notifications", tags=["Notifications & Task Management"])


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    unread_only: bool = Query(False, description="Filter to unread notifications only"),
    trigger_type: Optional[str] = Query(None, description="Filter by trigger type"),
    severity: Optional[str] = Query(None, description="Filter by severity level"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the in-app notification list for the authenticated user,
    with unread counts, action links, and severity badges (Section 18).
    """
    return get_user_notifications(
        db=db,
        user=current_user,
        unread_only=unread_only,
        trigger_type=trigger_type,
        severity=severity,
        limit=limit,
        offset=offset
    )


@router.get("/unread-count", response_model=NotificationUnreadCountResponse)
def get_unread_notification_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lightweight endpoint for navigation bar notification bell badge polling.
    """
    count = get_unread_count(db=db, user_id=current_user.id)
    return NotificationUnreadCountResponse(unread_count=count)


@router.post("/{notification_id}/read", response_model=NotificationRead)
def mark_single_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Marks a specific notification as read.
    """
    try:
        return mark_notification_as_read(db=db, notification_id=notification_id, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/mark-all-read")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Marks all notifications for the current user as read.
    """
    count = mark_all_notifications_as_read(db=db, user_id=current_user.id)
    return {"marked_count": count, "message": f"{count} notifications marked as read"}


@router.get("/my-tasks", response_model=MyTasksResponse)
def get_personal_action_queue(
    task_type: Optional[str] = Query(None, description="Filter by task type"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    due_status: Optional[str] = Query(None, description="Filter: overdue, due_today, upcoming"),
    search: Optional[str] = Query(None, description="Search task title or description"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns personalized task action queue combining assigned inspections, pending reviews,
    outstanding vendor corrections, overdue milestones, and risk actions (Section 18).
    """
    return get_my_tasks(
        db=db,
        user=current_user,
        task_type=task_type,
        priority=priority,
        due_status=due_status,
        search=search
    )


@router.get("/external-channels-status", response_model=ExternalChannelsStatusResponse)
def get_channels_status(
    current_user: User = Depends(get_current_user)
):
    """
    Statutory disclosure of external messaging adapters status per Section 18 (Page 39).
    """
    return get_external_channels_status()
