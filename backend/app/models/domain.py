from datetime import datetime, date
from typing import List, Optional, Dict, Any
from sqlalchemy import (
    String, Boolean, DateTime, Date, Integer, Float, ForeignKey, Text, JSON, Table, Column
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, generate_uuid, get_utc_now

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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now)

    work_packages: Mapped[List["WorkPackage"]] = relationship("WorkPackage", back_populates="vendor")


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
    
    # Work statuses: Draft, Planned, Assigned, In Progress, Progress Reported, Inspection Pending,
    # Verification Failed, Rework Required, Verification Passed, Awaiting Authorised Acceptance,
    # Accepted, Operationally Ready, On Hold, Cancelled
    workflow_state: Mapped[str] = mapped_column(String(60), default="In Progress", index=True)
    
    # Rule-based Risk attributes
    risk_score: Mapped[int] = mapped_column(Integer, default=0)  # 0 to 100
    risk_category: Mapped[str] = mapped_column(String(30), default="Low")  # Critical | High | Moderate | Low
    risk_explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    project: Mapped[Project] = relationship("Project", back_populates="work_packages")
    vendor: Mapped[Optional[Vendor]] = relationship("Vendor", back_populates="work_packages", lazy="joined")
    milestones: Mapped[List["Milestone"]] = relationship("Milestone", back_populates="work_package", cascade="all, delete-orphan", lazy="joined")
    inspections: Mapped[List["Inspection"]] = relationship("Inspection", back_populates="work_package", cascade="all, delete-orphan", lazy="joined")
    defects: Mapped[List["Defect"]] = relationship("Defect", back_populates="work_package", cascade="all, delete-orphan", lazy="joined")
    assets: Mapped[List["Asset"]] = relationship("Asset", back_populates="work_package", lazy="joined")


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
    reported_status: Mapped[str] = mapped_column(String(50), default="Pending")  # Pending | Reported Complete
    verification_status: Mapped[str] = mapped_column(String(50), default="Unverified")  # Unverified | Verified | Rejected
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    verification_timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now)

    work_package: Mapped[WorkPackage] = relationship("WorkPackage", back_populates="milestones")
    
    # Milestone dependencies (directed relationship: milestones that this milestone depends on)
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
    scheduled_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    actual_inspection_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    inspection_type: Mapped[str] = mapped_column(String(80), default="Routine Verification")
    checklist_version: Mapped[str] = mapped_column(String(20), default="v1.0")
    
    # Outcomes: Scheduled | In Progress | Passed | Failed | Re-Inspection Required
    outcome: Mapped[str] = mapped_column(String(50), default="Scheduled", index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewer_decision: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now)

    work_package: Mapped[WorkPackage] = relationship("WorkPackage", back_populates="inspections")


class Defect(Base):
    __tablename__ = "defects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    defect_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    work_package_id: Mapped[str] = mapped_column(String(36), ForeignKey("work_packages.id"), index=True, nullable=False)
    inspection_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("inspections.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Text] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="Quality & Safety")
    severity: Mapped[str] = mapped_column(String(30), default="High", index=True)  # Critical | High | Medium | Low
    
    # Statuses: Open | Assigned | Correction Submitted | Verification Pending | Rejected | Resolved | Closed
    status: Mapped[str] = mapped_column(String(50), default="Open", index=True)
    target_resolution_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    reported_by_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now)

    work_package: Mapped[WorkPackage] = relationship("WorkPackage", back_populates="defects")


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    asset_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    zone_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("zones.id"), nullable=True)
    project_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("projects.id"), nullable=True)
    work_package_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("work_packages.id"), nullable=True)
    
    # Lifecycle: Planned | Installed | Inspection Pending | Verification Failed | Accepted | Operationally Ready | Maintenance Required
    lifecycle_status: Mapped[str] = mapped_column(String(60), default="Planned", index=True)
    qr_identifier: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    installation_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    commissioning_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now)

    zone: Mapped[Optional[Zone]] = relationship("Zone", back_populates="assets", lazy="joined")
    project: Mapped[Optional[Project]] = relationship("Project", back_populates="assets")
    work_package: Mapped[Optional[WorkPackage]] = relationship("WorkPackage", back_populates="assets")
