from datetime import datetime, date, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.user import Department, Role, Permission, User, AuditEvent
from app.models.domain import Zone, Vendor, Project, WorkPackage, Milestone, Inspection, Defect, Asset
from app.core.security import get_password_hash
from app.services.audit_service import record_audit_event


PERMISSIONS_DATA = [
    # Projects
    {"id": "projects:read", "name": "View Projects", "category": "Projects", "description": "Can view infrastructure projects"},
    {"id": "projects:create", "name": "Create Projects", "category": "Projects", "description": "Can create new infrastructure projects"},
    {"id": "projects:edit", "name": "Edit Projects", "category": "Projects", "description": "Can modify project details and assignments"},
    {"id": "projects:assign", "name": "Assign Project Teams", "category": "Projects", "description": "Can assign managers and inspectors"},
    
    # Milestones & Progress
    {"id": "milestones:create", "name": "Create Milestones", "category": "Milestones", "description": "Can define project milestones"},
    {"id": "milestones:edit", "name": "Edit Milestones", "category": "Milestones", "description": "Can update milestone deadlines and requirements"},
    {"id": "milestones:read", "name": "View Milestones", "category": "Milestones", "description": "Can view milestones and deadlines"},
    {"id": "progress:submit", "name": "Submit Progress Updates", "category": "Progress", "description": "Can submit vendor progress reports with evidence"},
    {"id": "progress:review", "name": "Review Progress Updates", "category": "Progress", "description": "Can review vendor progress submissions"},

    # Inspections
    {"id": "inspections:read", "name": "View Inspections", "category": "Inspections", "description": "Can view field inspection reports"},
    {"id": "inspections:assign", "name": "Assign Inspections", "category": "Inspections", "description": "Can schedule and assign inspectors"},
    {"id": "inspections:conduct", "name": "Conduct Inspections", "category": "Inspections", "description": "Can execute checklists and record measurements"},
    {"id": "inspections:submit", "name": "Submit Inspection Results", "category": "Inspections", "description": "Can submit completed field inspections"},
    {"id": "inspections:review", "name": "Review Inspection Decisions", "category": "Inspections", "description": "Can review and accept field inspections"},

    # Defects & Rework
    {"id": "defects:read", "name": "View Defects", "category": "Defects", "description": "Can view defects and issues"},
    {"id": "defects:create", "name": "Log Defects", "category": "Defects", "description": "Can record failed checks and create defect tickets"},
    {"id": "defects:respond", "name": "Respond to Defects", "category": "Defects", "description": "Can submit vendor corrective actions"},
    {"id": "defects:reinspect", "name": "Verify Defect Rework", "category": "Defects", "description": "Can re-inspect corrected defects"},
    {"id": "defects:close", "name": "Authorize Defect Closure", "category": "Defects", "description": "Can officially close verified defects"},

    # Assets & QR
    {"id": "assets:read", "name": "View Assets", "category": "Assets", "description": "Can browse municipal asset registry and QR codes"},
    {"id": "assets:manage", "name": "Manage Assets", "category": "Assets", "description": "Can register, update, and generate QR labels for assets"},
    {"id": "assets:transition", "name": "Transition Asset Lifecycle", "category": "Assets", "description": "Can declare assets installed or ready"},

    # Readiness & Acceptance
    {"id": "readiness:read", "name": "View Readiness & Risk", "category": "Readiness", "description": "Can inspect readiness chains and risk evaluations"},
    {"id": "acceptance:approve", "name": "Approve Acceptance Transition", "category": "Readiness", "description": "Authorized reviewer acceptance of completed works"},

    # Reports & Audit
    {"id": "reports:read", "name": "View Reports", "category": "Reports", "description": "Can access analytical and progress reports"},
    {"id": "reports:export", "name": "Export Data", "category": "Reports", "description": "Can export CSV and PDF summaries"},
    {"id": "audit:read", "name": "View Audit Trail", "category": "Audit", "description": "Can inspect immutable system audit history"},

    # Administration
    {"id": "users:read", "name": "View Users", "category": "Administration", "description": "Can view user accounts and roles"},
    {"id": "users:manage", "name": "Manage Users", "category": "Administration", "description": "Can create, update, and deactivate users"},
    {"id": "settings:manage", "name": "System Configuration", "category": "Administration", "description": "Can configure workflow rules and templates"},
]

ROLES_DATA = [
    {
        "id": "super_admin",
        "name": "Super Administrator",
        "description": "Full system control, administrative oversight, workflow configuration, and audit access.",
        "permissions": [p["id"] for p in PERMISSIONS_DATA]
    },
    {
        "id": "municipal_admin",
        "name": "Municipal Administrator",
        "description": "Jurisdiction-wide authority to assign projects, inspectors, monitor readiness, and approve acceptance.",
        "permissions": [
            "projects:read", "projects:create", "projects:edit", "projects:assign",
            "milestones:read", "milestones:create", "milestones:edit", "progress:review",
            "inspections:read", "inspections:assign", "inspections:review",
            "defects:read", "defects:close",
            "assets:read", "assets:manage",
            "readiness:read", "acceptance:approve",
            "reports:read", "reports:export",
            "users:read", "users:manage", "audit:read"
        ]
    },
    {
        "id": "project_manager",
        "name": "Project Manager",
        "description": "Responsible for managing project milestones, reviewing vendor progress, and tracking deadlines.",
        "permissions": [
            "projects:read", "projects:edit",
            "milestones:read", "milestones:create", "milestones:edit",
            "progress:review",
            "inspections:read", "inspections:assign",
            "defects:read",
            "assets:read",
            "readiness:read",
            "reports:read", "reports:export",
            "audit:read"
        ]
    },
    {
        "id": "field_inspector",
        "name": "Field Inspector",
        "description": "Conducts on-site verification, executes mobile checklists, records defects, and performs re-inspections.",
        "permissions": [
            "projects:read", "milestones:read",
            "inspections:read", "inspections:conduct", "inspections:submit",
            "defects:read", "defects:create", "defects:reinspect",
            "assets:read"
        ]
    },
    {
        "id": "vendor",
        "name": "Vendor / Contractor",
        "description": "Assigned infrastructure contractor. Submits progress updates and rectifies recorded defects.",
        "permissions": [
            "projects:read", "milestones:read",
            "progress:submit",
            "defects:read", "defects:respond"
        ]
    },
    {
        "id": "asset_manager",
        "name": "Asset Manager",
        "description": "Maintains physical municipal assets, QR identifiers, and tracks installation to operational readiness.",
        "permissions": [
            "projects:read",
            "assets:read", "assets:manage", "assets:transition",
            "inspections:read", "defects:read",
            "readiness:read", "reports:read"
        ]
    },
    {
        "id": "read_only_reviewer",
        "name": "Read-Only Government Reviewer",
        "description": "Independent oversight, vigilance officer, or external reviewer with read-only inspection access.",
        "permissions": [
            "projects:read", "milestones:read", "inspections:read", "defects:read",
            "assets:read", "readiness:read", "reports:read", "reports:export", "audit:read"
        ]
    }
]

DEPARTMENTS_DATA = [
    {"id": "dept-hq", "code": "MUNI-HQ", "name": "Municipal Corporation Headquarters", "description": "Central municipal administration and executive command center"},
    {"id": "dept-pwd", "code": "PWD-WTR", "name": "Public Works & Drinking Water Division", "description": "Drinking water infrastructure, ghat pipelines, and civil structures"},
    {"id": "dept-sani", "code": "SANI-HLT", "name": "Sanitation, Waste & Public Health", "description": "Mobile toilets, sanitation stations, and solid waste processing"},
    {"id": "dept-qa", "code": "QA-INSP", "name": "Quality Assurance & Field Verification Cell", "description": "Independent inspection engineers and compliance certifiers"},
    {"id": "dept-evt", "code": "EVT-OPS", "name": "Pushkaralu 2027 Operations Directorate", "description": "Ghat crowd management, lighting, and readiness coordination"},
]

DEMO_USERS_DATA = [
    {
        "id": "user-superadmin",
        "email": "superadmin@civicproof.gov.in",
        "username": "superadmin",
        "full_name": "Sri K. Ramesh Babu, IAS",
        "phone": "+91 883 2460001",
        "password": "AdminPass123!",
        "department_id": "dept-hq",
        "role_ids": ["super_admin"]
    },
    {
        "id": "user-muniadmin",
        "email": "muniadmin@civicproof.gov.in",
        "username": "muniadmin",
        "full_name": "P. Venkat Rao",
        "phone": "+91 883 2460002",
        "password": "MuniPass123!",
        "department_id": "dept-hq",
        "role_ids": ["municipal_admin"]
    },
    {
        "id": "user-pm",
        "email": "pm@civicproof.gov.in",
        "username": "pm_krishna",
        "full_name": "V. Krishna Mohan",
        "phone": "+91 883 2460003",
        "password": "PMPass123!",
        "department_id": "dept-pwd",
        "role_ids": ["project_manager"]
    },
    {
        "id": "user-inspector",
        "email": "inspector@civicproof.gov.in",
        "username": "inspector_suresh",
        "full_name": "M. Suresh Kumar",
        "phone": "+91 883 2460004",
        "password": "InspectorPass123!",
        "department_id": "dept-qa",
        "role_ids": ["field_inspector"]
    },
    {
        "id": "user-vendor",
        "email": "vendor@infra-ap.com",
        "username": "vendor_infra",
        "full_name": "Rajesh Varma (Godavari Infra Engineering)",
        "phone": "+91 883 2460005",
        "password": "VendorPass123!",
        "department_id": None,
        "vendor_id": "vnd-001",
        "role_ids": ["vendor"]
    },
    {
        "id": "user-assets",
        "email": "assets@civicproof.gov.in",
        "username": "asset_lakshmi",
        "full_name": "T. Lakshmi Narayana",
        "phone": "+91 883 2460006",
        "password": "AssetPass123!",
        "department_id": "dept-pwd",
        "role_ids": ["asset_manager"]
    },
    {
        "id": "user-reviewer",
        "email": "reviewer@audit.gov.in",
        "username": "audit_reviewer",
        "full_name": "Dr. S. Padmavathi (State Vigilance)",
        "phone": "+91 883 2460007",
        "password": "ReviewerPass123!",
        "department_id": "dept-hq",
        "role_ids": ["read_only_reviewer"]
    }
]

# --- Domain Data: Fictional Rajamahendravaram Pushkaralu 2027 Entities ---
ZONES_DATA = [
    {"id": "zone-koti", "code": "GHAT-KOTI", "name": "Kotilingala Ghat", "description": "Primary bathing ghat with highest pilgrim influx", "latitude": 16.9944, "longitude": 81.7678},
    {"id": "zone-pushkar", "code": "GHAT-PUSHKAR", "name": "Pushkar Ghat", "description": "Heritage ghat with VIP ceremonies and main aarti pavilion", "latitude": 17.0012, "longitude": 81.7742},
    {"id": "zone-saraswati", "code": "GHAT-SARASWATI", "name": "Saraswati Ghat", "description": "Transit sector with pilgrim waiting halls and feeder roads", "latitude": 16.9880, "longitude": 81.7610},
    {"id": "zone-dowles", "code": "SEC-DOWLES", "name": "Dowleswaram Barrage Sector", "description": "Southern barrage intake and emergency staging area", "latitude": 16.9421, "longitude": 81.7789},
]

VENDORS_DATA = [
    {
        "id": "vnd-001",
        "vendor_code": "VND-AP-01",
        "company_name": "Godavari Infra Engineering Pvt Ltd",
        "category": "Civil & Hydraulic Infrastructure",
        "contact_name": "Rajesh Varma",
        "email": "vendor@infra-ap.com",
        "phone": "+91 883 2460005",
        "contract_reference": "CTR/2026/AP-PWD/089",
        "status": "Active"
    },
    {
        "id": "vnd-002",
        "vendor_code": "VND-AP-02",
        "company_name": "Delta Water Solutions & Utilities Ltd",
        "category": "Drinking Water & Water Purification",
        "contact_name": "K. Srinivas",
        "email": "contact@deltawater.in",
        "phone": "+91 883 2460022",
        "contract_reference": "CTR/2026/AP-WTR/104",
        "status": "Active"
    },
    {
        "id": "vnd-003",
        "vendor_code": "VND-AP-03",
        "company_name": "Andhra Sanitech & Waste Services",
        "category": "Sanitation & Bio-Toilets",
        "contact_name": "N. Ramanjaneyulu",
        "email": "ops@andhrasanitech.in",
        "phone": "+91 883 2460033",
        "contract_reference": "CTR/2026/AP-SANI/210",
        "status": "Active"
    },
    {
        "id": "vnd-004",
        "vendor_code": "VND-AP-04",
        "company_name": "Eastern Ghats Electrical & Grid Corp",
        "category": "Public Lighting & Solar Arrays",
        "contact_name": "M. Satyanarayana",
        "email": "projects@easterngrid.in",
        "phone": "+91 883 2460044",
        "contract_reference": "CTR/2026/AP-ELEC/315",
        "status": "Active"
    }
]


def run_seed_if_empty(db: Session):
    """Inserts foundational departments, permissions, roles, and demo users if not present."""
    from app.models import Base
    Base.metadata.create_all(bind=db.get_bind())

    # Check if superadmin already exists
    if db.query(User).filter(User.username == "superadmin").first():
        # Check if domain projects are already seeded
        if db.query(Project).filter(Project.project_identifier == "PRJ-2027-DW01").first():
            return
    else:
        print("--- Seeding CivicProof Foundation and Module 1 Security Data ---")

        # 1. Departments
        for dept_data in DEPARTMENTS_DATA:
            existing_dept = db.query(Department).filter(Department.id == dept_data["id"]).first()
            if not existing_dept:
                dept = Department(**dept_data)
                db.add(dept)
        db.commit()

        # 2. Permissions
        for perm_data in PERMISSIONS_DATA:
            existing_perm = db.query(Permission).filter(Permission.id == perm_data["id"]).first()
            if not existing_perm:
                perm = Permission(**perm_data)
                db.add(perm)
        db.commit()

        # 3. Roles and Permissions mapping
        for role_data in ROLES_DATA:
            role = db.query(Role).filter(Role.id == role_data["id"]).first()
            if not role:
                role = Role(
                    id=role_data["id"],
                    name=role_data["name"],
                    description=role_data["description"],
                    is_system_role=True
                )
                perms = db.query(Permission).filter(Permission.id.in_(role_data["permissions"])).all()
                role.permissions = perms
                db.add(role)
            else:
                perms = db.query(Permission).filter(Permission.id.in_(role_data["permissions"])).all()
                role.permissions = perms
        db.commit()

        # 4. Demo Users
        for user_info in DEMO_USERS_DATA:
            existing_user = db.query(User).filter(User.email == user_info["email"]).first()
            if not existing_user:
                u = User(
                    id=user_info["id"],
                    email=user_info["email"],
                    username=user_info["username"],
                    full_name=user_info["full_name"],
                    phone=user_info["phone"],
                    hashed_password=get_password_hash(user_info["password"]),
                    department_id=user_info["department_id"],
                    vendor_id=user_info.get("vendor_id"),
                    is_active=True
                )
                roles = db.query(Role).filter(Role.id.in_(user_info["role_ids"])).all()
                u.roles = roles
                db.add(u)
        db.commit()

    # 5. Domain Seeding (Zones, Vendors, Projects, Work Packages, Milestones, Inspections, Defects, Assets)
    print("--- Seeding Pushkaralu 2027 Infrastructure Domain Records ---")

    # Zones
    for zd in ZONES_DATA:
        if not db.query(Zone).filter(Zone.id == zd["id"]).first():
            db.add(Zone(**zd))
    db.commit()

    # Vendors
    for vd in VENDORS_DATA:
        if not db.query(Vendor).filter(Vendor.id == vd["id"]).first():
            db.add(Vendor(**vd))
    db.commit()

    today = date.today()

    # Projects
    # Project 1: Required Demonstration Project (Section 28)
    p1 = Project(
        id="prj-001",
        project_identifier="PRJ-2027-DW01",
        name="Demo — Public Drinking-Water Facility Readiness",
        description="Priority installation of high-capacity automated RO drinking-water dispensers and pipeline networks for Kotilingala Ghat.",
        category="Drinking Water",
        zone_id="zone-koti",
        department_id="dept-pwd",
        project_manager_id="user-pm",
        start_date=today - timedelta(days=60),
        planned_completion_date=today + timedelta(days=15),
        current_status="In Progress",
        priority="Critical",
        funding_reference="AP-GODAVARI-2027-WTR-01"
    )

    # Project 2: Sanitation block
    p2 = Project(
        id="prj-002",
        project_identifier="PRJ-2027-SN02",
        name="Pushkar Ghat Crowd Sanitation & Mobile Bio-Toilets",
        description="Modular bio-digester sanitation units and continuous waste management evacuation lines along Pushkar Ghat promenade.",
        category="Sanitation",
        zone_id="zone-pushkar",
        department_id="dept-sani",
        project_manager_id="user-pm",
        start_date=today - timedelta(days=90),
        planned_completion_date=today - timedelta(days=5),
        current_status="Verification Pending",
        priority="High",
        funding_reference="AP-GODAVARI-2027-SANI-04"
    )

    # Project 3: High-mast lighting
    p3 = Project(
        id="prj-003",
        project_identifier="PRJ-2027-LT03",
        name="Kotilingala Ghat High-Mast Lighting & Grid Resilience",
        description="High-output LED floodlight arrays with backup diesel generator synchronization for nocturnal crowd safety.",
        category="Public Lighting",
        zone_id="zone-koti",
        department_id="dept-evt",
        project_manager_id="user-pm",
        start_date=today - timedelta(days=45),
        planned_completion_date=today + timedelta(days=30),
        current_status="In Progress",
        priority="Medium",
        funding_reference="AP-GODAVARI-2027-ELEC-09"
    )

    # Project 4: Riverbank Barricading
    p4 = Project(
        id="prj-004",
        project_identifier="PRJ-2027-SF04",
        name="Godavari Riverbank Safety & Barrier Fortification",
        description="Submersible steel crowd control barricades and floating life-buoy anchors along Saraswati Ghat.",
        category="Public Safety",
        zone_id="zone-saraswati",
        department_id="dept-pwd",
        project_manager_id="user-pm",
        start_date=today - timedelta(days=80),
        planned_completion_date=today - timedelta(days=10),
        current_status="Delayed",
        priority="Critical",
        funding_reference="AP-GODAVARI-2027-SAFE-12"
    )

    for p in [p1, p2, p3, p4]:
        if not db.query(Project).filter(Project.id == p.id).first():
            db.add(p)
    db.commit()

    # Work Packages
    # WP1: Vendor reported 100%, but failed inspection -> 0% verified, Defect logged! (Core Demo Scenario)
    wp1 = WorkPackage(
        id="wp-001",
        work_id="WP-DW-KOTI-01",
        project_id="prj-001",
        title="Automated RO Water Purification Hub — Sector 1",
        description="Installation of 5000 LPH RO water filtration plant, UV sterilization, and 12-tap sanitary dispensing manifolds.",
        category="Drinking Water",
        vendor_id="vnd-001",
        priority="Critical",
        planned_start_date=today - timedelta(days=50),
        planned_completion_date=today - timedelta(days=2),
        reported_progress_percentage=100.0,
        verified_progress_percentage=0.0,
        workflow_state="Verification Failed",
        risk_score=85,
        risk_category="Critical",
        risk_explanation="Vendor submitted 100% completion. Mandatory pressure test inspection FAILED. Blocking defect DEF-DW-001 open."
    )

    # WP2: In Progress water line
    wp2 = WorkPackage(
        id="wp-002",
        work_id="WP-DW-KOTI-02",
        project_id="prj-001",
        title="Sub-surface Chlorination Pipeline Network",
        description="Underground ductile iron pipe connections supplying treated water to secondary ghat kiosks.",
        category="Drinking Water",
        vendor_id="vnd-002",
        priority="High",
        planned_start_date=today - timedelta(days=30),
        planned_completion_date=today + timedelta(days=12),
        reported_progress_percentage=60.0,
        verified_progress_percentage=50.0,
        workflow_state="In Progress",
        risk_score=25,
        risk_category="Low",
        risk_explanation="Progress on schedule. Pre-inspection trenching completed and verified."
    )

    # WP3: Sanitation Block (Accepted by Municipal Reviewer)
    wp3 = WorkPackage(
        id="wp-003",
        work_id="WP-SN-PUSH-01",
        project_id="prj-002",
        title="Pushkar Ghat 40-Bay Prefabricated Bio-Toilets",
        description="Turnkey modular stainless steel toilet blocks with aerobic microbial digesters and greywater recycling.",
        category="Sanitation",
        vendor_id="vnd-003",
        priority="High",
        planned_start_date=today - timedelta(days=80),
        planned_completion_date=today - timedelta(days=10),
        actual_completion_date=today - timedelta(days=4),
        reported_progress_percentage=100.0,
        verified_progress_percentage=100.0,
        workflow_state="Accepted",
        risk_score=5,
        risk_category="Low",
        risk_explanation="All milestones verified. Independent inspection passed. Formally accepted by Municipal Administrator."
    )

    # WP4: Lighting array (Inspection pending)
    wp4 = WorkPackage(
        id="wp-004",
        work_id="WP-LT-KOTI-01",
        project_id="prj-003",
        title="Kotilingala Ghat 30m High-Mast Lighting Tower",
        description="Erection of 30-meter motorized high-mast tower with 16x 400W LED fixtures and automatic luminance dimming.",
        category="Public Lighting",
        vendor_id="vnd-004",
        priority="Medium",
        planned_start_date=today - timedelta(days=40),
        planned_completion_date=today + timedelta(days=5),
        reported_progress_percentage=90.0,
        verified_progress_percentage=75.0,
        workflow_state="Inspection Pending",
        risk_score=35,
        risk_category="Moderate",
        risk_explanation="Vendor submitted final cabling update. Field inspection scheduled for tomorrow."
    )

    # WP5: Riverbank Barricades (Overdue milestone, high risk)
    wp5 = WorkPackage(
        id="wp-005",
        work_id="WP-SF-SARA-01",
        project_id="prj-004",
        title="Saraswati Ghat Deep-Water Barricade Line",
        description="Heavy-duty anchored barrier system preventing pilgrims from drifting into high-velocity Godavari currents.",
        category="Public Safety",
        vendor_id="vnd-001",
        priority="Critical",
        planned_start_date=today - timedelta(days=70),
        planned_completion_date=today - timedelta(days=8),
        reported_progress_percentage=45.0,
        verified_progress_percentage=30.0,
        workflow_state="Rework Required",
        risk_score=92,
        risk_category="Critical",
        risk_explanation="Milestone MS-SF-02 is 8 days overdue. Vendor response delayed by 6 days. Predecessor mooring unstable."
    )

    for wp in [wp1, wp2, wp3, wp4, wp5]:
        if not db.query(WorkPackage).filter(WorkPackage.id == wp.id).first():
            db.add(wp)
    db.commit()

    # Milestones
    milestones_data = [
        # For WP1
        {"id": "ms-01", "work_package_id": "wp-001", "name": "Civil Foundation & RO Shelter", "due_date": today - timedelta(days=35), "reported_status": "Reported Complete", "verification_status": "Verified", "is_mandatory": True},
        {"id": "ms-02", "work_package_id": "wp-001", "name": "RO Plant & UV System Installation", "due_date": today - timedelta(days=15), "reported_status": "Reported Complete", "verification_status": "Verified", "is_mandatory": True},
        {"id": "ms-03", "work_package_id": "wp-001", "name": "Hydrostatic Pressure Test & Water Purity Lab Test", "due_date": today - timedelta(days=3), "reported_status": "Reported Complete", "verification_status": "Rejected", "is_mandatory": True},
        # For WP2
        {"id": "ms-04", "work_package_id": "wp-002", "name": "Pipeline Trenching & Bedding", "due_date": today - timedelta(days=10), "reported_status": "Reported Complete", "verification_status": "Verified", "is_mandatory": True},
        {"id": "ms-05", "work_package_id": "wp-002", "name": "Pipe Laying & Jointing", "due_date": today + timedelta(days=6), "reported_status": "Pending", "verification_status": "Unverified", "is_mandatory": True},
        # For WP3
        {"id": "ms-06", "work_package_id": "wp-003", "name": "Substructure Bio-Digester Tanks", "due_date": today - timedelta(days=40), "reported_status": "Reported Complete", "verification_status": "Verified", "is_mandatory": True},
        {"id": "ms-07", "work_package_id": "wp-003", "name": "Superstructure & Sanitary Fixtures", "due_date": today - timedelta(days=15), "reported_status": "Reported Complete", "verification_status": "Verified", "is_mandatory": True},
        # For WP5
        {"id": "ms-08", "work_package_id": "wp-005", "name": "Riverbed Sub-Mooring Anchors", "due_date": today - timedelta(days=25), "reported_status": "Reported Complete", "verification_status": "Verified", "is_mandatory": True},
        {"id": "ms-09", "work_package_id": "wp-005", "name": "Galvanized Steel Barrier Linkage", "due_date": today - timedelta(days=8), "reported_status": "Pending", "verification_status": "Unverified", "is_mandatory": True},  # OVERDUE!
    ]
    for ms in milestones_data:
        if not db.query(Milestone).filter(Milestone.id == ms["id"]).first():
            db.add(Milestone(**ms))
    db.commit()

    # Inspections
    # Inspection 1: FAILED inspection on WP1 (Hydrostatic Pressure Test)
    insp1 = Inspection(
        id="insp-001",
        inspection_id="INSP-2026-DW01-01",
        work_package_id="wp-001",
        inspector_id="user-inspector",
        scheduled_date=today - timedelta(days=3),
        actual_inspection_date=datetime.now(timezone.utc) - timedelta(days=3),
        inspection_type="Pre-Commissioning Verification",
        checklist_version="v1.2",
        outcome="Failed",
        notes="Mandatory hydrostatic test failed at 4.2 bar (spec requires 6.0 bar sustained for 30 mins). Water seepage detected at manifold gasket joint. Defect logged.",
        reviewer_decision="Rejected"
    )

    # Inspection 2: PASSED inspection on WP3 (Sanitation block)
    insp2 = Inspection(
        id="insp-002",
        inspection_id="INSP-2026-SN03-01",
        work_package_id="wp-003",
        inspector_id="user-inspector",
        scheduled_date=today - timedelta(days=6),
        actual_inspection_date=datetime.now(timezone.utc) - timedelta(days=6),
        inspection_type="Sanitation & Acceptance Audit",
        checklist_version="v2.0",
        outcome="Passed",
        notes="All 40 units inspected. Bacterial culture active in digesters. Ventilation and wheelchair ramps compliant. Certified acceptable.",
        reviewer_decision="Approved"
    )

    # Inspection 3: SCHEDULED / Awaiting Action on WP4 (Lighting)
    insp3 = Inspection(
        id="insp-003",
        inspection_id="INSP-2026-LT04-01",
        work_package_id="wp-004",
        inspector_id="user-inspector",
        scheduled_date=today + timedelta(days=1),
        inspection_type="Electrical & Illumination Audit",
        checklist_version="v1.0",
        outcome="Scheduled",
        notes="Awaiting on-site lux-meter night illumination verification."
    )

    for insp in [insp1, insp2, insp3]:
        if not db.query(Inspection).filter(Inspection.id == insp.id).first():
            db.add(insp)
    db.commit()

    # Defects
    # Defect 1: Critical blocking defect on WP1
    d1 = Defect(
        id="def-001",
        defect_id="DEF-DW-001",
        work_package_id="wp-001",
        inspection_id="insp-001",
        title="High-Pressure Manifold Gasket Failure & RO Seepage",
        description="Gasket seal at secondary manifold inlet ruptured under 4.2 bar test pressure, releasing untreated groundwater into clean distribution basin.",
        category="Hydraulic Quality & Safety",
        severity="Critical",
        status="Open",
        target_resolution_date=today + timedelta(days=2),
        reported_by_id="user-inspector"
    )

    # Defect 2: High defect on WP5 (Barricading)
    d2 = Defect(
        id="def-002",
        defect_id="DEF-SF-002",
        work_package_id="wp-005",
        title="Mooring Cable Tensile Slack & Corrosion on Anchor #4",
        description="Anchor bolt show signs of saline corrosion and cable tension is 35% below safety threshold for fast-flowing river currents.",
        category="Structural Safety",
        severity="High",
        status="Assigned",
        target_resolution_date=today + timedelta(days=3),
        reported_by_id="user-inspector"
    )

    for d in [d1, d2]:
        if not db.query(Defect).filter(Defect.id == d.id).first():
            db.add(d)
    db.commit()

    # Assets
    assets_data = [
        {
            "id": "ast-001",
            "asset_code": "AST-RO-KOTI-01",
            "name": "RO Water Dispensing Kiosk #1 (Kotilingala)",
            "category": "Drinking Water Facility",
            "description": "5000 LPH RO dispensing unit with chilled and ambient faucets",
            "zone_id": "zone-koti",
            "project_id": "prj-001",
            "work_package_id": "wp-001",
            "lifecycle_status": "Verification Failed",
            "qr_identifier": "QR-AST-DW-KOTI-001",
            "installation_date": today - timedelta(days=12),
            "latitude": 16.9946,
            "longitude": 81.7681
        },
        {
            "id": "ast-002",
            "asset_code": "AST-BIO-PUSH-01",
            "name": "40-Bay Bio-Sanitation Complex (Pushkar)",
            "category": "Sanitation Complex",
            "description": "Modular stainless steel bio-digester toilet complex with solar lighting",
            "zone_id": "zone-pushkar",
            "project_id": "prj-002",
            "work_package_id": "wp-003",
            "lifecycle_status": "Operationally Ready",
            "qr_identifier": "QR-AST-SN-PUSH-040",
            "installation_date": today - timedelta(days=20),
            "commissioning_date": today - timedelta(days=3),
            "latitude": 17.0015,
            "longitude": 81.7745
        },
        {
            "id": "ast-003",
            "asset_code": "AST-HM-KOTI-01",
            "name": "30m High-Mast Floodlight Tower (Kotilingala)",
            "category": "Public Lighting Array",
            "description": "30-meter high-mast tower with 16x 400W LED fixtures and lightning arrester",
            "zone_id": "zone-koti",
            "project_id": "prj-003",
            "work_package_id": "wp-004",
            "lifecycle_status": "Inspection Pending",
            "qr_identifier": "QR-AST-LT-KOTI-030",
            "installation_date": today - timedelta(days=5),
            "latitude": 16.9940,
            "longitude": 81.7675
        },
        {
            "id": "ast-004",
            "asset_code": "AST-SAFE-SARA-01",
            "name": "Deep-Water Submersible Barricade Sector C",
            "category": "River Safety Installation",
            "description": "120-meter interlocking marine steel barrier with high-visibility foam buoys",
            "zone_id": "zone-saraswati",
            "project_id": "prj-004",
            "work_package_id": "wp-005",
            "lifecycle_status": "Maintenance Required",
            "qr_identifier": "QR-AST-SF-SARA-120",
            "installation_date": today - timedelta(days=15),
            "latitude": 16.9882,
            "longitude": 81.7612
        }
    ]

    for ad in assets_data:
        if not db.query(Asset).filter(Asset.id == ad["id"]).first():
            db.add(Asset(**ad))
    db.commit()

    print("--- Pushkaralu 2027 domain data seeded successfully! ---")


if __name__ == "__main__":
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        run_seed_if_empty(db)
    finally:
        db.close()
