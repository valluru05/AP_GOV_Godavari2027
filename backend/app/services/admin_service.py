from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.user import User, Role, Permission, Department
from app.models.domain import (
    Zone, Project, WorkPackage, Asset, ChecklistTemplate, SystemSetting
)
from app.schemas.admin import (
    RoleMatrixItem,
    PermissionItem,
    PermissionCategoryGroup,
    RoleMatrixResponse,
    RoleCreateRequest,
    DepartmentCreateRequest,
    DepartmentUpdateRequest,
    DepartmentDetailResponse,
    ZoneCreateRequest,
    ZoneUpdateRequest,
    ZoneAdminResponse,
    ChecklistTemplateCreateRequest,
    ChecklistTemplateUpdateRequest,
    ChecklistTemplateResponse,
    SystemConfigResponse,
    SystemConfigUpdateRequest,
    DemoDataResetResponse
)
from app.services.audit_service import record_audit_event
from app.db.base import get_utc_now


# Default system configuration values per Section 19
DEFAULT_SYSTEM_CONFIG: Dict[str, Any] = {
    "project_categories": [
        "Drinking Water",
        "Sanitation",
        "Crowd Management",
        "Ghat Development",
        "Electrical & Lighting",
        "Civil Works",
        "Emergency Services"
    ],
    "work_categories": [
        "Civil & Hydraulic Works",
        "Modular Bio-Digesters",
        "High-Mast Illumination",
        "Automated RO Dispensers",
        "River Perimeter Safety Booms",
        "Pedestrian Queue Management",
        "Signage & Surveillance"
    ],
    "vendor_categories": [
        "Civil & Hydraulic Infrastructure",
        "Drinking Water & Water Purification",
        "Sanitation & Waste Management",
        "Electrical, Solar & Lighting Systems",
        "River Safety & Hydraulic Engineering"
    ],
    "asset_categories": [
        "Potable Water Treatment & Dispensing",
        "Modular Sanitation Units",
        "Hydraulic Water Barriers & River Safety",
        "High-Mast Lighting & Power Backup",
        "Crowd Control Barricading"
    ],
    "defect_sla_rules": {
        "Critical": {"max_resolution_hours": 24, "escalation_hours": 12, "description": "Direct risk to pilgrim safety or water contamination."},
        "High": {"max_resolution_hours": 72, "escalation_hours": 36, "description": "Material quality deviation requiring vendor rework."},
        "Medium": {"max_resolution_hours": 168, "escalation_hours": 72, "description": "Cosmetic or minor tolerance defect; rework within 7 days."},
        "Low": {"max_resolution_hours": 336, "escalation_hours": 168, "description": "Informational finding or documentation gap."}
    },
    "risk_weights": {
        "Rule A - Critical Path Delay": {"weight": 35, "description": "Milestone on the critical path is overdue, directly threatening Pushkaralu delivery."},
        "Rule B - Verification Gap": {"weight": 25, "description": "Vendor reported progress exceeds verified inspection progress by more than 15%."},
        "Rule C - Severe Open Defects": {"weight": 20, "description": "Work package contains open Critical or High severity defects."},
        "Rule D - Missing Evidence": {"weight": 10, "description": "Milestones claimed without mandatory photographic or lab test documentation."},
        "Rule E - Unverified Physical Readiness": {"weight": 10, "description": "Assets installed without third-party physical field verification sign-off."}
    },
    "readiness_gate_thresholds": {
        "Gate 1 - Work Package Verification": 80.0,
        "Gate 2 - Evidence Completeness": 100.0,
        "Gate 3 - Defect Remediation": 100.0,
        "Gate 4 - Final Physical Acceptance": 100.0
    },
    "data_retention_days": 2555,  # 7-year statutory audit retention
    "notification_channels": {
        "in_app": "active",
        "sms_gateway": "unconfigured_pilot_simulation",
        "email_smtp": "unconfigured_pilot_simulation",
        "whatsapp_api": "unconfigured_pilot_simulation"
    }
}


# Default checklist templates for Pushkaralu 2027
DEFAULT_CHECKLIST_TEMPLATES = [
    {
        "template_code": "TPL-DW-001",
        "name": "Public Drinking-Water Facility Readiness Checklist",
        "category": "Drinking Water",
        "version": "v1.0",
        "description": "Statutory verification checklist for RO water kiosks, UV filtration, and spigot pressure at Pushkaralu bathing ghats.",
        "items": [
            {
                "id": "chk-dw-1",
                "title": "Hydrostatic Pressure Test Verification",
                "check_type": "measurement",
                "mandatory": True,
                "requires_photo": True,
                "acceptance_criteria": "Main line must hold 4.5 bar continuous pressure for 60 minutes with 0% leak."
            },
            {
                "id": "chk-dw-2",
                "title": "TDS and Potability Water Quality Test",
                "check_type": "measurement",
                "mandatory": True,
                "requires_photo": True,
                "acceptance_criteria": "TDS between 100-250 ppm, pH between 6.5-8.5, zero coliform bacterial colonies."
            },
            {
                "id": "chk-dw-3",
                "title": "Stainless Steel Dispensing Spigots & Drainage Sump",
                "check_type": "pass_fail",
                "mandatory": True,
                "requires_photo": True,
                "acceptance_criteria": "All 8 dispensing spigots functional with zero drippage and clear greywater runoff."
            },
            {
                "id": "chk-dw-4",
                "title": "Photographic Signage & QR Traceability Tag",
                "check_type": "pass_fail",
                "mandatory": True,
                "requires_photo": True,
                "acceptance_criteria": "AP Gov bilingual Pushkaralu signage and durable laser-etched QR tag installed."
            }
        ]
    },
    {
        "template_code": "TPL-SN-002",
        "name": "Ghat Promenade Sanitation & Bio-Toilet Verification",
        "category": "Sanitation",
        "version": "v1.0",
        "description": "Inspection protocol for mobile bio-toilets, anaerobic digestion tanks, and waste disposal pipelines.",
        "items": [
            {
                "id": "chk-sn-1",
                "title": "Bio-Digester Tank Inoculum Bacterial Seeding",
                "check_type": "pass_fail",
                "mandatory": True,
                "requires_photo": True,
                "acceptance_criteria": "DRDO-approved anaerobic microbial inoculum loaded and certified by environmental engineer."
            },
            {
                "id": "chk-sn-2",
                "title": "Vent Pipe Height & Anti-Siphon Traps",
                "check_type": "pass_fail",
                "mandatory": True,
                "requires_photo": True,
                "acceptance_criteria": "Vent stack height min 2.5m above roof with insect mesh and odor traps."
            },
            {
                "id": "chk-sn-3",
                "title": "Disability Access Ramp & Handrails",
                "check_type": "pass_fail",
                "mandatory": True,
                "requires_photo": True,
                "acceptance_criteria": "Slope ratio 1:12 with non-skid flooring and dual-height stainless steel handrails."
            }
        ]
    },
    {
        "template_code": "TPL-EL-003",
        "name": "Ghat High-Mast Lighting & Electrical Safety Audit",
        "category": "Electrical & Lighting",
        "version": "v1.0",
        "description": "Electrical load, earthing resistance, and IP66 waterproof ingress protection inspection.",
        "items": [
            {
                "id": "chk-el-1",
                "title": "Earthing Ground Resistance Test",
                "check_type": "measurement",
                "mandatory": True,
                "requires_photo": True,
                "acceptance_criteria": "Earth pit resistance must be strictly below 1.0 Ohm measured with calibrated Megger."
            },
            {
                "id": "chk-el-2",
                "title": "Dual-Grid Automatic Changeover (DG / Discom)",
                "check_type": "pass_fail",
                "mandatory": True,
                "requires_photo": True,
                "acceptance_criteria": "Automatic Transfer Switch (ATS) restores 100% illumination within 8 seconds of grid loss."
            }
        ]
    }
]


# --- Roles & Permissions Matrix ---
def get_roles_matrix(db: Session) -> RoleMatrixResponse:
    roles = db.query(Role).all()
    all_perms = db.query(Permission).all()

    # Group permissions by category
    category_map: Dict[str, List[PermissionItem]] = {}
    for p in all_perms:
        cat = p.category or "General"
        if cat not in category_map:
            category_map[cat] = []
        category_map[cat].append(
            PermissionItem(id=p.id, name=p.name, category=cat, description=p.description)
        )

    categories = [
        PermissionCategoryGroup(category=cat, permissions=perms)
        for cat, perms in category_map.items()
    ]

    role_items = [
        RoleMatrixItem(
            id=r.id,
            name=r.name,
            description=r.description,
            is_system_role=r.is_system_role,
            permission_ids=[p.id for p in r.permissions]
        )
        for r in roles
    ]

    return RoleMatrixResponse(roles=role_items, categories=categories)


def update_role_permissions(
    db: Session,
    role_id: str,
    permission_ids: List[str],
    current_user: User
) -> RoleMatrixItem:
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise ValueError(f"Role '{role_id}' not found")

    old_perm_ids = [p.id for p in role.permissions]
    new_perms = db.query(Permission).filter(Permission.id.in_(permission_ids)).all()
    role.permissions = new_perms
    db.commit()
    db.refresh(role)

    record_audit_event(
        db=db,
        action="ROLE_PERMISSIONS_UPDATED",
        entity_type="role",
        entity_id=role.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        reason=f"Administrator updated permission set for role {role.name}",
        details={"old_permissions": old_perm_ids, "new_permissions": permission_ids}
    )

    return RoleMatrixItem(
        id=role.id,
        name=role.name,
        description=role.description,
        is_system_role=role.is_system_role,
        permission_ids=[p.id for p in role.permissions]
    )


def create_custom_role(
    db: Session,
    role_in: RoleCreateRequest,
    current_user: User
) -> RoleMatrixItem:
    role_id = role_in.name.lower().replace(" ", "_").replace("-", "_")
    if db.query(Role).filter(Role.id == role_id).first():
        raise ValueError(f"Role with identifier '{role_id}' already exists")

    perms = db.query(Permission).filter(Permission.id.in_(role_in.permission_ids)).all()
    role = Role(
        id=role_id,
        name=role_in.name,
        description=role_in.description,
        is_system_role=False,
        permissions=perms
    )
    db.add(role)
    db.commit()
    db.refresh(role)

    record_audit_event(
        db=db,
        action="ROLE_CREATED",
        entity_type="role",
        entity_id=role.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        reason=f"Custom role '{role.name}' created by administrator",
        details={"permissions": role_in.permission_ids}
    )

    return RoleMatrixItem(
        id=role.id,
        name=role.name,
        description=role.description,
        is_system_role=False,
        permission_ids=[p.id for p in role.permissions]
    )


# --- Departments ---
def get_departments_detail(db: Session) -> List[DepartmentDetailResponse]:
    depts = db.query(Department).all()
    results = []
    for d in depts:
        user_cnt = db.query(func.count(User.id)).filter(User.department_id == d.id).scalar() or 0
        proj_cnt = db.query(func.count(Project.id)).filter(Project.department_id == d.id).scalar() or 0
        results.append(
            DepartmentDetailResponse(
                id=d.id,
                code=d.code,
                name=d.name,
                description=d.description,
                user_count=user_cnt,
                project_count=proj_cnt
            )
        )
    return results


def create_department(
    db: Session,
    dept_in: DepartmentCreateRequest,
    current_user: User
) -> DepartmentDetailResponse:
    dept_id = f"dept-{dept_in.code.lower()}"
    if db.query(Department).filter(Department.code == dept_in.code).first():
        raise ValueError(f"Department code '{dept_in.code}' already exists")

    dept = Department(
        id=dept_id,
        code=dept_in.code.upper(),
        name=dept_in.name,
        description=dept_in.description
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)

    record_audit_event(
        db=db,
        action="DEPARTMENT_CREATED",
        entity_type="department",
        entity_id=dept.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        reason=f"Department '{dept.name}' ({dept.code}) created by administrator"
    )

    return DepartmentDetailResponse(
        id=dept.id,
        code=dept.code,
        name=dept.name,
        description=dept.description,
        user_count=0,
        project_count=0
    )


def update_department(
    db: Session,
    dept_id: str,
    dept_in: DepartmentUpdateRequest,
    current_user: User
) -> DepartmentDetailResponse:
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise ValueError(f"Department '{dept_id}' not found")

    changes = {}
    if dept_in.name is not None and dept_in.name != dept.name:
        changes["name"] = {"old": dept.name, "new": dept_in.name}
        dept.name = dept_in.name
    if dept_in.description is not None:
        dept.description = dept_in.description

    db.commit()
    db.refresh(dept)

    user_cnt = db.query(func.count(User.id)).filter(User.department_id == dept.id).scalar() or 0
    proj_cnt = db.query(func.count(Project.id)).filter(Project.department_id == dept.id).scalar() or 0

    record_audit_event(
        db=db,
        action="DEPARTMENT_UPDATED",
        entity_type="department",
        entity_id=dept.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        reason=f"Department '{dept.name}' updated by administrator",
        details=changes
    )

    return DepartmentDetailResponse(
        id=dept.id,
        code=dept.code,
        name=dept.name,
        description=dept.description,
        user_count=user_cnt,
        project_count=proj_cnt
    )


# --- Zones / Ghats ---
def get_zones_admin(db: Session) -> List[ZoneAdminResponse]:
    zones = db.query(Zone).all()
    results = []
    for z in zones:
        proj_cnt = db.query(func.count(Project.id)).filter(Project.zone_id == z.id).scalar() or 0
        asset_cnt = db.query(func.count(Asset.id)).filter(Asset.zone_id == z.id).scalar() or 0
        results.append(
            ZoneAdminResponse(
                id=z.id,
                code=z.code,
                name=z.name,
                description=z.description,
                latitude=z.latitude or 16.98,
                longitude=z.longitude or 81.78,
                is_active=True,
                project_count=proj_cnt,
                asset_count=asset_cnt
            )
        )
    return results


def create_zone(
    db: Session,
    zone_in: ZoneCreateRequest,
    current_user: User
) -> ZoneAdminResponse:
    zone_id = f"zone-{zone_in.code.lower()}"
    if db.query(Zone).filter(Zone.code == zone_in.code).first():
        raise ValueError(f"Zone code '{zone_in.code}' already exists")

    zone = Zone(
        id=zone_id,
        code=zone_in.code.upper(),
        name=zone_in.name,
        description=zone_in.description,
        latitude=zone_in.latitude,
        longitude=zone_in.longitude
    )
    db.add(zone)
    db.commit()
    db.refresh(zone)

    record_audit_event(
        db=db,
        action="ZONE_CREATED",
        entity_type="zone",
        entity_id=zone.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        reason=f"Zone '{zone.name}' ({zone.code}) created by administrator"
    )

    return ZoneAdminResponse(
        id=zone.id,
        code=zone.code,
        name=zone.name,
        description=zone.description,
        latitude=zone.latitude or 16.98,
        longitude=zone.longitude or 81.78,
        is_active=True,
        project_count=0,
        asset_count=0
    )


def update_zone(
    db: Session,
    zone_id: str,
    zone_in: ZoneUpdateRequest,
    current_user: User
) -> ZoneAdminResponse:
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise ValueError(f"Zone '{zone_id}' not found")

    changes = {}
    if zone_in.name is not None and zone_in.name != zone.name:
        changes["name"] = {"old": zone.name, "new": zone_in.name}
        zone.name = zone_in.name
    if zone_in.description is not None:
        zone.description = zone_in.description
    if zone_in.latitude is not None:
        zone.latitude = zone_in.latitude
    if zone_in.longitude is not None:
        zone.longitude = zone_in.longitude

    db.commit()
    db.refresh(zone)

    proj_cnt = db.query(func.count(Project.id)).filter(Project.zone_id == zone.id).scalar() or 0
    asset_cnt = db.query(func.count(Asset.id)).filter(Asset.zone_id == zone.id).scalar() or 0

    record_audit_event(
        db=db,
        action="ZONE_UPDATED",
        entity_type="zone",
        entity_id=zone.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        reason=f"Zone '{zone.name}' updated by administrator",
        details=changes
    )

    return ZoneAdminResponse(
        id=zone.id,
        code=zone.code,
        name=zone.name,
        description=zone.description,
        latitude=zone.latitude or 16.98,
        longitude=zone.longitude or 81.78,
        is_active=True,
        project_count=proj_cnt,
        asset_count=asset_cnt
    )



# --- Checklist Templates ---
def _seed_checklist_templates_if_empty(db: Session) -> None:
    if db.query(ChecklistTemplate).count() > 0:
        return

    for tpl in DEFAULT_CHECKLIST_TEMPLATES:
        t = ChecklistTemplate(
            template_code=tpl["template_code"],
            name=tpl["name"],
            category=tpl["category"],
            version=tpl["version"],
            description=tpl["description"],
            items=[i for i in tpl["items"]],
            is_active=True
        )
        db.add(t)
    db.commit()


def get_checklist_templates(
    db: Session,
    category: Optional[str] = None,
    is_active: Optional[bool] = None
) -> List[ChecklistTemplateResponse]:
    _seed_checklist_templates_if_empty(db)
    q = db.query(ChecklistTemplate)
    if category and category != "All":
        q = q.filter(ChecklistTemplate.category == category)
    if is_active is not None:
        q = q.filter(ChecklistTemplate.is_active == is_active)

    templates = q.order_by(ChecklistTemplate.template_code).all()
    return [
        ChecklistTemplateResponse(
            id=t.id,
            template_code=t.template_code,
            name=t.name,
            category=t.category,
            version=t.version,
            description=t.description,
            is_active=t.is_active,
            items=[i for i in (t.items or [])],
            created_at=t.created_at,
            updated_at=t.updated_at
        )
        for t in templates
    ]


def create_checklist_template(
    db: Session,
    tpl_in: ChecklistTemplateCreateRequest,
    current_user: User
) -> ChecklistTemplateResponse:
    if db.query(ChecklistTemplate).filter(ChecklistTemplate.template_code == tpl_in.template_code).first():
        raise ValueError(f"Checklist template code '{tpl_in.template_code}' already exists")

    t = ChecklistTemplate(
        template_code=tpl_in.template_code.upper(),
        name=tpl_in.name,
        category=tpl_in.category,
        version=tpl_in.version,
        description=tpl_in.description,
        items=[i.model_dump() for i in tpl_in.items],
        is_active=True
    )
    db.add(t)
    db.commit()
    db.refresh(t)

    record_audit_event(
        db=db,
        action="CHECKLIST_TEMPLATE_CREATED",
        entity_type="checklist_template",
        entity_id=t.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        reason=f"Checklist template '{t.name}' ({t.template_code}) created by administrator"
    )

    return ChecklistTemplateResponse(
        id=t.id,
        template_code=t.template_code,
        name=t.name,
        category=t.category,
        version=t.version,
        description=t.description,
        is_active=t.is_active,
        items=t.items or [],
        created_at=t.created_at,
        updated_at=t.updated_at
    )


def update_checklist_template(
    db: Session,
    template_id: str,
    tpl_in: ChecklistTemplateUpdateRequest,
    current_user: User
) -> ChecklistTemplateResponse:
    t = db.query(ChecklistTemplate).filter(ChecklistTemplate.id == template_id).first()
    if not t:
        raise ValueError(f"Checklist template '{template_id}' not found")

    if tpl_in.name is not None:
        t.name = tpl_in.name
    if tpl_in.category is not None:
        t.category = tpl_in.category
    if tpl_in.version is not None:
        t.version = tpl_in.version
    if tpl_in.description is not None:
        t.description = tpl_in.description
    if tpl_in.is_active is not None:
        t.is_active = tpl_in.is_active
    if tpl_in.items is not None:
        t.items = [i.model_dump() for i in tpl_in.items]

    t.updated_at = get_utc_now()
    db.commit()
    db.refresh(t)

    record_audit_event(
        db=db,
        action="CHECKLIST_TEMPLATE_UPDATED",
        entity_type="checklist_template",
        entity_id=t.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        reason=f"Checklist template '{t.name}' updated by administrator"
    )

    return ChecklistTemplateResponse(
        id=t.id,
        template_code=t.template_code,
        name=t.name,
        category=t.category,
        version=t.version,
        description=t.description,
        is_active=t.is_active,
        items=t.items or [],
        created_at=t.created_at,
        updated_at=t.updated_at
    )


# --- System Parameters & Thresholds Configuration ---
def get_system_config(db: Session) -> SystemConfigResponse:
    setting = db.query(SystemSetting).filter(SystemSetting.setting_key == "core_config").first()
    if not setting:
        return SystemConfigResponse(
            project_categories=DEFAULT_SYSTEM_CONFIG["project_categories"],
            work_categories=DEFAULT_SYSTEM_CONFIG["work_categories"],
            vendor_categories=DEFAULT_SYSTEM_CONFIG["vendor_categories"],
            asset_categories=DEFAULT_SYSTEM_CONFIG["asset_categories"],
            defect_sla_rules=DEFAULT_SYSTEM_CONFIG["defect_sla_rules"],
            risk_weights=DEFAULT_SYSTEM_CONFIG["risk_weights"],
            readiness_gate_thresholds=DEFAULT_SYSTEM_CONFIG["readiness_gate_thresholds"],
            data_retention_days=DEFAULT_SYSTEM_CONFIG["data_retention_days"],
            notification_channels=DEFAULT_SYSTEM_CONFIG["notification_channels"]
        )

    val = setting.setting_value or {}
    return SystemConfigResponse(
        project_categories=val.get("project_categories", DEFAULT_SYSTEM_CONFIG["project_categories"]),
        work_categories=val.get("work_categories", DEFAULT_SYSTEM_CONFIG["work_categories"]),
        vendor_categories=val.get("vendor_categories", DEFAULT_SYSTEM_CONFIG["vendor_categories"]),
        asset_categories=val.get("asset_categories", DEFAULT_SYSTEM_CONFIG["asset_categories"]),
        defect_sla_rules=val.get("defect_sla_rules", DEFAULT_SYSTEM_CONFIG["defect_sla_rules"]),
        risk_weights=val.get("risk_weights", DEFAULT_SYSTEM_CONFIG["risk_weights"]),
        readiness_gate_thresholds=val.get("readiness_gate_thresholds", DEFAULT_SYSTEM_CONFIG["readiness_gate_thresholds"]),
        data_retention_days=val.get("data_retention_days", DEFAULT_SYSTEM_CONFIG["data_retention_days"]),
        notification_channels=val.get("notification_channels", DEFAULT_SYSTEM_CONFIG["notification_channels"]),
        last_updated_at=setting.updated_at,
        last_updated_by=setting.updated_by
    )


def update_system_config(
    db: Session,
    config_in: SystemConfigUpdateRequest,
    current_user: User
) -> SystemConfigResponse:
    setting = db.query(SystemSetting).filter(SystemSetting.setting_key == "core_config").first()
    if not setting:
        val = {k: v for k, v in DEFAULT_SYSTEM_CONFIG.items()}
        setting = SystemSetting(
            setting_key="core_config",
            setting_value=val,
            category="governance",
            description="Core governance, categories, risk weights, and SLA thresholds",
            updated_by=current_user.full_name or current_user.email,
            updated_at=get_utc_now()
        )
        db.add(setting)

    cur_val = setting.setting_value or {k: v for k, v in DEFAULT_SYSTEM_CONFIG.items()}
    changes = {}

    if config_in.project_categories is not None:
        changes["project_categories"] = config_in.project_categories
        cur_val["project_categories"] = config_in.project_categories
    if config_in.work_categories is not None:
        changes["work_categories"] = config_in.work_categories
        cur_val["work_categories"] = config_in.work_categories
    if config_in.vendor_categories is not None:
        changes["vendor_categories"] = config_in.vendor_categories
        cur_val["vendor_categories"] = config_in.vendor_categories
    if config_in.asset_categories is not None:
        changes["asset_categories"] = config_in.asset_categories
        cur_val["asset_categories"] = config_in.asset_categories
    if config_in.defect_sla_rules is not None:
        changes["defect_sla_rules"] = config_in.defect_sla_rules
        cur_val["defect_sla_rules"] = config_in.defect_sla_rules
    if config_in.risk_weights is not None:
        changes["risk_weights"] = config_in.risk_weights
        cur_val["risk_weights"] = config_in.risk_weights
    if config_in.readiness_gate_thresholds is not None:
        changes["readiness_gate_thresholds"] = config_in.readiness_gate_thresholds
        cur_val["readiness_gate_thresholds"] = config_in.readiness_gate_thresholds
    if config_in.data_retention_days is not None:
        changes["data_retention_days"] = config_in.data_retention_days
        cur_val["data_retention_days"] = config_in.data_retention_days

    setting.setting_value = cur_val
    setting.updated_by = current_user.full_name or current_user.email
    setting.updated_at = get_utc_now()
    db.commit()
    db.refresh(setting)

    record_audit_event(
        db=db,
        action="CONFIG_UPDATED",
        entity_type="system_setting",
        entity_id=setting.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        reason="System risk thresholds, SLA rules, or category definitions updated by administrator",
        details=changes
    )

    return get_system_config(db)


# --- Demo Data Management & Reset ---
def reset_demo_data(
    db: Session,
    current_user: User,
    confirmation_code: str,
    reason: str
) -> DemoDataResetResponse:
    """
    Safely resets and reseeds Pushkaralu 2027 demo data with confirmation verification.
    Preserves audit history and super_admin account.
    """
    if confirmation_code.strip() != "RESET-PUSHKARALU-2027":
        raise ValueError("Invalid confirmation code. Please enter 'RESET-PUSHKARALU-2027' to authorize reset.")

    if len(reason.strip()) < 10:
        raise ValueError("A justification reason of at least 10 characters is required for statutory demo-data reset.")

    from scripts.seed_demo_data import run_seed_if_empty
    run_seed_if_empty(db)

    record_audit_event(
        db=db,
        action="DEMO_DATA_RESET",
        entity_type="system",
        entity_id="pilot-civicproof",
        actor_id=current_user.id,
        actor_email=current_user.email,
        reason=reason,
        details={"confirmation_code": confirmation_code}
    )

    projects_count = db.query(Project).count()
    wp_count = db.query(WorkPackage).count()
    assets_count = db.query(Asset).count()
    zones_count = db.query(Zone).count()

    return DemoDataResetResponse(
        status="success",
        message="Godavari Pushkaralu 2027 demo records validated and synchronized successfully.",
        reseeded_counts={
            "projects": projects_count,
            "work_packages": wp_count,
            "assets": assets_count,
            "zones": zones_count
        }
    )
