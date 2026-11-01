from datetime import datetime, date
from typing import List, Optional, Dict, Any, TYPE_CHECKING
from sqlalchemy import (
    String, Boolean, DateTime, Date, Integer, Float, ForeignKey, Text, JSON, Table, Column
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, generate_uuid, get_utc_now

if TYPE_CHECKING:
    from app.models.user import User

# Milestone dependency directed graph relationship (milestone_id depends on depends_on_id)
milestone_dependencies = Table(
    "milestone_dependencies",
    Base.metadata,
    Column("milestone_id", String(36), ForeignKey("milestones.id", ondelete="CASCADE"), primary_key=True),
    Column("depends_on_id", String(36), ForeignKey("milestones.id", ondelete="CASCADE"), primary_key=True),
)


class Zone(Base):
    __tablename__ = "zones"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now)

    projects: Mapped[List["Project"]] = relationship("Project", back_populates="zone")
    assets: Mapped[List["Asset"]] = relationship("Asset", back_populates="zone")


class Vendor(Base):
    __tablename__ = "vendors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    vendor_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    company_name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    contact_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    contract_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Active")  # Active | Suspended | Under Review
    contract_start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    contract_end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    compliance_status: Mapped[str] = mapped_column(String(50), default="Compliant")  # Compliant | Renewal Due | Suspended
    compliance_document_ref: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    compliance_document_expiry: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    work_packages: Mapped[List["WorkPackage"]] = relationship("WorkPackage", back_populates="vendor")
    progress_submissions: Mapped[List["ProgressSubmission"]] = relationship("ProgressSubmission", back_populates="vendor")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_identifier: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    zone_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("zones.id"), nullable=True)
    department_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("departments.id"), nullable=True)
    project_manager_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    created_by_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    planned_completion_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    current_status: Mapped[str] = mapped_column(String(50), default="In Progress", index=True)
    priority: Mapped[str] = mapped_column(String(30), default="High")  # Critical | High | Medium | Low
    funding_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    zone: Mapped[Optional[Zone]] = relationship("Zone", back_populates="projects", lazy="joined")
    work_packages: Mapped[List["WorkPackage"]] = relationship("WorkPackage", back_populates="project", cascade="all, delete-orphan", lazy="joined")
    assets: Mapped[List["Asset"]] = relationship("Asset", back_populates="project")


class WorkPackage(Base):
    __tablename__ = "work_packages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    work_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    vendor_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("vendors.id"), index=True, nullable=True)
    responsible_manager_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    priority: Mapped[str] = mapped_column(String(30), default="High")
    planned_start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    planned_completion_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    actual_completion_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    
    # Critical distinction: Reported vs Verified
    reported_progress_percentage: Mapped[float] = mapped_column(Float, default=0.0)
    verified_progress_percentage: Mapped[float] = mapped_column(Float, default=0.0)
    workflow_state: Mapped[str] = mapped_column(String(60), default="In Progress", index=True)
    
    # Rule-based Risk attributes
    risk_score: Mapped[int] = mapped_column(Integer, default=0)
    risk_category: Mapped[str] = mapped_column(String(30), default="Low")
    risk_explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    project: Mapped[Project] = relationship("Project", back_populates="work_packages")
    vendor: Mapped[Optional[Vendor]] = relationship("Vendor", back_populates="work_packages", lazy="joined")
    milestones: Mapped[List["Milestone"]] = relationship("Milestone", back_populates="work_package", cascade="all, delete-orphan", lazy="joined")
    inspections: Mapped[List["Inspection"]] = relationship("Inspection", back_populates="work_package", cascade="all, delete-orphan", lazy="joined")
    defects: Mapped[List["Defect"]] = relationship("Defect", back_populates="work_package", cascade="all, delete-orphan", lazy="joined")
    assets: Mapped[List["Asset"]] = relationship("Asset", back_populates="work_package", lazy="joined")
    progress_submissions: Mapped[List["ProgressSubmission"]] = relationship("ProgressSubmission", back_populates="work_package", cascade="all, delete-orphan")


class ProgressSubmission(Base):
    __tablename__ = "progress_submissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    submission_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    work_package_id: Mapped[str] = mapped_column(String(36), ForeignKey("work_packages.id"), index=True, nullable=False)
    vendor_id: Mapped[str] = mapped_column(String(36), ForeignKey("vendors.id"), index=True, nullable=False)
    submitted_by_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    
    progress_percentage: Mapped[float] = mapped_column(Float, nullable=False)
    activities_description: Mapped[str] = mapped_column(Text, nullable=False)
    delay_or_blocker: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    estimated_completion_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    evidence_attachments: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, default=list)
    
    # Review workflow states: Under Review | Reviewed | Rejected | Superseded
    review_status: Mapped[str] = mapped_column(String(50), default="Under Review", index=True)
    reviewer_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    reviewer_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now)

    work_package: Mapped[WorkPackage] = relationship("WorkPackage", back_populates="progress_submissions")
    vendor: Mapped[Vendor] = relationship("Vendor", back_populates="progress_submissions")


class Milestone(Base):
    __tablename__ = "milestones"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    work_package_id: Mapped[str] = mapped_column(String(36), ForeignKey("work_packages.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    due_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=True)
    acceptance_criteria: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    required_evidence_type: Mapped[Optional[str]] = mapped_column(String(100), default="Photographic Inspection")
    responsible_party: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    
    # State tracking
    reported_status: Mapped[str] = mapped_column(String(50), default="Pending")
    verification_status: Mapped[str] = mapped_column(String(50), default="Unverified")
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    verification_timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now)

    work_package: Mapped[WorkPackage] = relationship("WorkPackage", back_populates="milestones")
    
    # Milestone dependencies
    dependencies: Mapped[List["Milestone"]] = relationship(
        "Milestone",
        secondary=milestone_dependencies,
        primaryjoin=id == milestone_dependencies.c.milestone_id,
        secondaryjoin=id == milestone_dependencies.c.depends_on_id,
        backref="dependent_milestones",
        lazy="joined"
    )


class Inspection(Base):
    __tablename__ = "inspections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    inspection_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    work_package_id: Mapped[str] = mapped_column(String(36), ForeignKey("work_packages.id"), index=True, nullable=False)
    inspector_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    milestone_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("milestones.id"), nullable=True)
    asset_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("assets.id"), nullable=True)

    scheduled_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    actual_inspection_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    inspection_type: Mapped[str] = mapped_column(String(80), default="Routine Verification")
    checklist_version: Mapped[str] = mapped_column(String(20), default="v1.0")
    
    # Checklists and findings
    checklist_results: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, default=list)
    evidence_photos: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, default=list)
    
    # Physical field geolocation metadata
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    gps_accuracy_meters: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_geofence_verified: Mapped[bool] = mapped_column(Boolean, default=True)

    # Verdict and Progress Impact
    outcome: Mapped[str] = mapped_column(String(50), default="Scheduled", index=True)  # Scheduled | In Progress | Passed | Failed | Conditional Pass
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verified_percentage_awarded: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reviewer_decision: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    inspector_signature: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now)

    work_package: Mapped[WorkPackage] = relationship("WorkPackage", back_populates="inspections")
    milestone: Mapped[Optional["Milestone"]] = relationship("Milestone")
    asset: Mapped[Optional["Asset"]] = relationship("Asset")
    defects: Mapped[List["Defect"]] = relationship("Defect", back_populates="inspection")


class Defect(Base):
    __tablename__ = "defects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    defect_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    work_package_id: Mapped[str] = mapped_column(String(36), ForeignKey("work_packages.id"), index=True, nullable=False)
    inspection_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("inspections.id"), nullable=True)
    checklist_item_ref: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    asset_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("assets.id"), nullable=True)
    assigned_vendor_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("vendors.id"), nullable=True)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Text] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="Quality & Safety")
    severity: Mapped[str] = mapped_column(String(30), default="High", index=True)  # Critical | High | Medium | Low
    status: Mapped[str] = mapped_column(String(60), default="Open", index=True)  # Open | Assigned | Acknowledged | In Progress | Correction Submitted | Verification Pending | Rejected — Rework Required | Resolved — Verification Passed | Closed by Authorised User

    target_resolution_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    reported_by_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)

    # Initial defect photographic/document evidence
    evidence_attachments: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, default=list)

    # Contractor / Vendor Rework Submission details
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rework_evidence: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, default=list)
    rework_count: Mapped[int] = mapped_column(Integer, default=0)

    # Quality Inspector Re-inspection and Verification findings
    verification_result: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # Pass | Fail | Pending
    verification_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)

    # Official Administrative Closure
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_by_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)

    # Chronological lifecycle audit history
    history: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now)

    work_package: Mapped[WorkPackage] = relationship("WorkPackage", back_populates="defects")
    inspection: Mapped[Optional["Inspection"]] = relationship("Inspection", back_populates="defects")
    asset: Mapped[Optional["Asset"]] = relationship("Asset")
    vendor: Mapped[Optional["Vendor"]] = relationship("Vendor")
    reported_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[reported_by_id])
    verified_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[verified_by_id])
    closed_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[closed_by_id])



class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    asset_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    location_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    zone_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("zones.id"), nullable=True)
    project_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("projects.id"), nullable=True)
    work_package_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("work_packages.id"), nullable=True)
    responsible_manager_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    
    # State machine: Planned | Procurement Pending | Installation Pending | Installed | Inspection Pending | Verification Failed | Accepted | Operationally Ready | Maintenance Required | Out of Service | Retired
    lifecycle_status: Mapped[str] = mapped_column(String(60), default="Planned", index=True)
    qr_identifier: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    serial_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    model_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    installation_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    commissioning_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    maintenance_history: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, default=list)
    supporting_evidence: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, default=list)
    readiness_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    zone: Mapped[Optional[Zone]] = relationship("Zone", back_populates="assets", lazy="joined")
    project: Mapped[Optional[Project]] = relationship("Project", back_populates="assets")
    work_package: Mapped[Optional[WorkPackage]] = relationship("WorkPackage", back_populates="assets")
    responsible_manager: Mapped[Optional["User"]] = relationship("User", foreign_keys=[responsible_manager_id], lazy="joined")
    defects: Mapped[List["Defect"]] = relationship("Defect", foreign_keys="Defect.asset_id", lazy="selectin", overlaps="asset")
    inspections: Mapped[List["Inspection"]] = relationship("Inspection", foreign_keys="Inspection.asset_id", lazy="selectin", overlaps="asset")


class OfflineSyncRecord(Base):
    __tablename__ = "offline_sync_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    client_submission_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    action_type: Mapped[str] = mapped_column(String(60), nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="synced")  # synced | conflict | failed
    details: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True, nullable=False)

    # Statutory trigger category per Section 18
    trigger_type: Mapped[str] = mapped_column(String(60), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="info", index=True)  # critical | warning | info | success

    # Related record and direct navigation route
    entity_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    entity_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    action_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Read tracking
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Idempotent deduplication hash to avoid duplicates on retries
    deduplication_key: Mapped[Optional[str]] = mapped_column(String(150), unique=True, index=True, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now, index=True)


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    setting_key: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    setting_value: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    category: Mapped[str] = mapped_column(String(50), default="general")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)


class ChecklistTemplate(Base):
    __tablename__ = "checklist_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    template_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    version: Mapped[str] = mapped_column(String(20), default="v1.0")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    items: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)


