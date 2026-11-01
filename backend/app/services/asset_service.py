import io
import base64
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, date, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
import qrcode

from app.models.domain import Asset, Zone, Project, WorkPackage, Defect, Inspection
from app.models.user import User
from app.services.audit_service import record_audit_event
from app.schemas.asset import (
    AssetCreate,
    AssetUpdate,
    AssetTransitionRequest,
    AssetMaintenanceCreate,
    AssetEvidenceCreate,
    AssetResponse,
    AssetQRLabelResponse,
    AssetStats
)


def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)


def generate_qr_image_data_uri(content: str) -> str:
    """Generates a high-contrast base64 PNG data URI for QR rendering and printing."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=3,
    )
    qr.add_data(content)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0F172A", back_color="#FFFFFF")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    b64_str = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{b64_str}"


def compute_asset_readiness(asset: Asset, defects: List[Defect], inspections: List[Inspection]) -> Dict[str, Any]:
    """
    Computes strict readiness indicators enforcing Pushkaralu 2027 Section 12 mandates:
    - Never label an asset operationally ready solely because it exists or installation completed.
    - Open critical/high defects or failed inspections explicitly block readiness.
    """
    open_defects = [d for d in defects if d.status not in ["Closed by Authorised User", "Resolved — Verification Passed"]]
    critical_defects = [d for d in open_defects if d.severity in ["Critical", "High"]]
    
    latest_inspection = inspections[0] if inspections else None
    latest_result = latest_inspection.outcome if latest_inspection else None

    is_ready = False
    badge_text = "Pending Verification"
    badge_variant = "warning"

    if asset.lifecycle_status == "Operationally Ready":
        if len(critical_defects) > 0:
            is_ready = False
            badge_text = f"Compromised — {len(critical_defects)} Critical Defect(s)"
            badge_variant = "error"
        else:
            is_ready = True
            badge_text = "Operationally Ready — Verified"
            badge_variant = "success"
    elif asset.lifecycle_status == "Accepted":
        is_ready = False
        badge_text = "Accepted — Commissioning Pending"
        badge_variant = "info"
    elif asset.lifecycle_status == "Verification Failed" or len(critical_defects) > 0:
        is_ready = False
        badge_text = "Verification Failed — Defect Active"
        badge_variant = "error"
    elif asset.lifecycle_status == "Maintenance Required":
        is_ready = False
        badge_text = "Maintenance Required"
        badge_variant = "warning"
    elif asset.lifecycle_status in ["Installed", "Inspection Pending"]:
        is_ready = False
        badge_text = "Installed — Awaiting Field Inspection"
        badge_variant = "brand"
    else:
        is_ready = False
        badge_text = f"{asset.lifecycle_status} — Pre-deployment"
        badge_variant = "neutral"

    return {
        "is_operationally_ready": is_ready,
        "readiness_badge_text": badge_text,
        "readiness_badge_variant": badge_variant,
        "open_defect_count": len(open_defects),
        "latest_inspection_result": latest_result,
    }


def enrich_asset_response(asset: Asset, db: Session) -> AssetResponse:
    """Builds a rich AssetResponse with computed readiness and contextual names."""
    defects = db.query(Defect).filter(Defect.asset_id == asset.id).all()
    inspections = (
        db.query(Inspection)
        .filter(Inspection.asset_id == asset.id)
        .order_by(Inspection.created_at.desc())
        .all()
    )

    readiness = compute_asset_readiness(asset, defects, inspections)
    qr_data_url = generate_qr_image_data_uri(f"https://civicproof.ap.gov.in/assets/lookup/qr/{asset.qr_identifier}")

    zone_name = asset.zone.name if asset.zone else None
    project_name = asset.project.name if asset.project else None
    work_package_name = asset.work_package.title if asset.work_package else None
    manager_name = asset.responsible_manager.full_name if asset.responsible_manager else None

    return AssetResponse(
        id=asset.id,
        asset_code=asset.asset_code,
        name=asset.name,
        category=asset.category,
        description=asset.description,
        department=asset.department,
        location_name=asset.location_name,
        zone_id=asset.zone_id,
        project_id=asset.project_id,
        work_package_id=asset.work_package_id,
        responsible_manager_id=asset.responsible_manager_id,
        serial_number=asset.serial_number,
        model_number=asset.model_number,
        lifecycle_status=asset.lifecycle_status,
        qr_identifier=asset.qr_identifier,
        installation_date=asset.installation_date,
        commissioning_date=asset.commissioning_date,
        latitude=asset.latitude,
        longitude=asset.longitude,
        readiness_notes=asset.readiness_notes,
        maintenance_history=asset.maintenance_history or [],
        supporting_evidence=asset.supporting_evidence or [],
        created_at=asset.created_at,
        updated_at=asset.updated_at,
        is_operationally_ready=readiness["is_operationally_ready"],
        readiness_badge_text=readiness["readiness_badge_text"],
        readiness_badge_variant=readiness["readiness_badge_variant"],
        open_defect_count=readiness["open_defect_count"],
        latest_inspection_result=readiness["latest_inspection_result"],
        zone_name=zone_name,
        project_name=project_name,
        work_package_name=work_package_name,
        manager_name=manager_name,
        qr_data_url=qr_data_url,
    )


class AssetService:
    @staticmethod
    def list_assets(
        db: Session,
        category: Optional[str] = None,
        lifecycle_status: Optional[str] = None,
        zone_id: Optional[str] = None,
        project_id: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[AssetResponse]:
        query = db.query(Asset)

        if category:
            query = query.filter(Asset.category == category)
        if lifecycle_status:
            query = query.filter(Asset.lifecycle_status == lifecycle_status)
        if zone_id:
            query = query.filter(Asset.zone_id == zone_id)
        if project_id:
            query = query.filter(Asset.project_id == project_id)
        if search:
            s = f"%{search}%"
            query = query.filter(
                (Asset.name.ilike(s)) |
                (Asset.asset_code.ilike(s)) |
                (Asset.location_name.ilike(s)) |
                (Asset.serial_number.ilike(s))
            )

        assets = query.order_by(Asset.created_at.desc()).all()
        return [enrich_asset_response(a, db) for a in assets]

    @staticmethod
    def get_asset(db: Session, asset_id: str) -> AssetResponse:
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Asset with ID '{asset_id}' not found."
            )
        return enrich_asset_response(asset, db)

    @staticmethod
    def get_asset_by_qr(db: Session, qr_identifier: str) -> AssetResponse:
        """
        Opaque QR lookup ensuring authenticated resolution without exposing raw database IDs in physical tags.
        """
        asset = (
            db.query(Asset)
            .filter((Asset.qr_identifier == qr_identifier) | (Asset.asset_code == qr_identifier))
            .first()
        )
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No asset found matching QR identifier or code '{qr_identifier}'."
            )
        return enrich_asset_response(asset, db)

    @staticmethod
    def get_qr_label(db: Session, asset_id: str) -> AssetQRLabelResponse:
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found.")
        
        verification_url = f"https://civicproof.ap.gov.in/assets/lookup/qr/{asset.qr_identifier}"
        qr_data_url = generate_qr_image_data_uri(verification_url)
        defects = db.query(Defect).filter(Defect.asset_id == asset.id).all()
        inspections = db.query(Inspection).filter(Inspection.asset_id == asset.id).all()
        readiness = compute_asset_readiness(asset, defects, inspections)

        return AssetQRLabelResponse(
            asset_id=asset.id,
            asset_code=asset.asset_code,
            asset_name=asset.name,
            department=asset.department or "Municipal Administration Department",
            location_name=asset.location_name,
            zone_name=asset.zone.name if asset.zone else None,
            qr_identifier=asset.qr_identifier,
            qr_data_url=qr_data_url,
            verification_url=verification_url,
            lifecycle_status=asset.lifecycle_status,
            is_operationally_ready=readiness["is_operationally_ready"],
            pushkaralu_event="Godavari Pushkaralu 2027",
        )

    @staticmethod
    def create_asset(db: Session, payload: AssetCreate, current_user: User) -> AssetResponse:
        # Category short code
        cat_map = {
            "Drinking-water units": "DW",
            "Public lighting": "LT",
            "Sanitation units": "SN",
            "River safety installation": "SF",
            "Signage": "SG",
            "Waste collection facilities": "WM",
            "Temporary access infrastructure": "AC",
        }
        prefix = cat_map.get(payload.category, "AST")
        
        zone_str = "GEN"
        if payload.zone_id:
            zone = db.query(Zone).filter(Zone.id == payload.zone_id).first()
            if zone:
                raw_code = zone.code.upper() if hasattr(zone, "code") and zone.code else zone.name[:4].upper()
                zone_str = raw_code.replace("GHAT-", "").replace("ZONE-", "")

        # Count existing assets to generate sequential code
        count = db.query(Asset).count() + 1
        asset_code = f"AST-{prefix}-{zone_str}-{count:03d}"
        unique_suffix = uuid.uuid4().hex[:8].upper()
        qr_identifier = f"QR-AST-{prefix}-{zone_str}-{unique_suffix}"

        asset = Asset(
            asset_code=asset_code,
            name=payload.name,
            category=payload.category,
            description=payload.description,
            department=payload.department,
            location_name=payload.location_name,
            zone_id=payload.zone_id,
            project_id=payload.project_id,
            work_package_id=payload.work_package_id,
            responsible_manager_id=payload.responsible_manager_id or current_user.id,
            serial_number=payload.serial_number,
            model_number=payload.model_number,
            lifecycle_status=payload.lifecycle_status or "Planned",
            qr_identifier=qr_identifier,
            installation_date=payload.installation_date,
            commissioning_date=payload.commissioning_date,
            latitude=payload.latitude,
            longitude=payload.longitude,
            readiness_notes=payload.readiness_notes,
            supporting_evidence=payload.supporting_evidence or [],
            maintenance_history=[],
        )
        db.add(asset)
        db.flush()

        record_audit_event(
            db=db,
            action="ASSET_CREATED",
            entity_type="asset",
            entity_id=asset.id,
            actor_id=current_user.id,
            actor_email=current_user.email,
            details={
                "asset_code": asset.asset_code,
                "name": asset.name,
                "category": asset.category,
                "lifecycle_status": asset.lifecycle_status,
                "qr_identifier": asset.qr_identifier,
            },
        )
        db.commit()
        db.refresh(asset)
        return enrich_asset_response(asset, db)

    @staticmethod
    def update_asset(db: Session, asset_id: str, payload: AssetUpdate, current_user: User) -> AssetResponse:
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found.")

        update_data = payload.model_dump(exclude_unset=True)
        for key, val in update_data.items():
            setattr(asset, key, val)

        asset.updated_at = get_utc_now()
        record_audit_event(
            db=db,
            action="ASSET_UPDATED",
            entity_type="asset",
            entity_id=asset.id,
            actor_id=current_user.id,
            actor_email=current_user.email,
            details={"updated_fields": list(update_data.keys())},
        )
        db.commit()
        db.refresh(asset)
        return enrich_asset_response(asset, db)

    @staticmethod
    def transition_asset_status(
        db: Session,
        asset_id: str,
        payload: AssetTransitionRequest,
        current_user: User
    ) -> AssetResponse:
        """
        Enforces strict Section 12 lifecycle transitions:
        - Planned -> Procurement Pending -> Installation Pending -> Installed -> Inspection Pending -> Verification Failed | Accepted -> Operationally Ready -> Maintenance Required -> Out of Service -> Retired
        - Critical Rule: Cannot transition to 'Operationally Ready' if open Critical/High defects exist or if inspection has not passed.
        """
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found.")

        prev_status = asset.lifecycle_status
        new_status = payload.new_status

        # Validate business mandates for Operationally Ready
        if new_status == "Operationally Ready":
            open_defects = db.query(Defect).filter(
                Defect.asset_id == asset.id,
                Defect.status.notin_(["Closed by Authorised User", "Resolved — Verification Passed"])
            ).all()
            critical_high = [d for d in open_defects if d.severity in ["Critical", "High"]]
            if critical_high:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Cannot mark asset '{asset.asset_code}' as Operationally Ready: "
                        f"{len(critical_high)} open Critical/High defect(s) exist ({critical_high[0].defect_id}). "
                        f"Contractor rework and inspector re-verification are strictly required."
                    )
                )
            if not asset.commissioning_date:
                asset.commissioning_date = date.today()

        asset.lifecycle_status = new_status
        if payload.notes:
            asset.readiness_notes = f"[{new_status} on {date.today().isoformat()}]: {payload.notes}"
        asset.updated_at = get_utc_now()

        record_audit_event(
            db=db,
            action="ASSET_STATUS_TRANSITIONED",
            entity_type="asset",
            entity_id=asset.id,
            actor_id=current_user.id,
            actor_email=current_user.email,
            details={
                "previous_status": prev_status,
                "new_status": new_status,
                "reason": payload.reason,
                "notes": payload.notes,
            },
        )
        db.commit()
        db.refresh(asset)
        return enrich_asset_response(asset, db)

    @staticmethod
    def add_maintenance_record(
        db: Session,
        asset_id: str,
        payload: AssetMaintenanceCreate,
        current_user: User
    ) -> AssetResponse:
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found.")

        history = list(asset.maintenance_history or [])
        new_entry = {
            "id": f"maint-{uuid.uuid4().hex[:6]}",
            "service_date": (payload.service_date or date.today()).isoformat(),
            "maintenance_type": payload.maintenance_type,
            "technician_name": payload.technician_name,
            "summary": payload.summary,
            "status": payload.status or "Completed",
            "parts_replaced": payload.parts_replaced,
            "next_service_due": payload.next_service_due.isoformat() if payload.next_service_due else None,
            "logged_by": current_user.full_name,
            "logged_at": get_utc_now().isoformat(),
        }
        history.insert(0, new_entry)
        asset.maintenance_history = history

        # If maintenance was completed and status was Maintenance Required, prompt or reset to Accepted
        if asset.lifecycle_status == "Maintenance Required" and payload.status == "Completed":
            asset.lifecycle_status = "Accepted"
            asset.readiness_notes = f"Maintenance completed by {payload.technician_name}. Ready for operational verification."

        asset.updated_at = get_utc_now()
        record_audit_event(
            db=db,
            action="ASSET_MAINTENANCE_LOGGED",
            entity_type="asset",
            entity_id=asset.id,
            actor_id=current_user.id,
            actor_email=current_user.email,
            details=new_entry,
        )
        db.commit()
        db.refresh(asset)
        return enrich_asset_response(asset, db)

    @staticmethod
    def add_supporting_evidence(
        db: Session,
        asset_id: str,
        payload: AssetEvidenceCreate,
        current_user: User
    ) -> AssetResponse:
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found.")

        evidence_list = list(asset.supporting_evidence or [])
        evidence_entry = {
            "id": f"evi-{uuid.uuid4().hex[:6]}",
            "name": payload.name,
            "caption": payload.caption,
            "file_type": payload.file_type or "photo",
            "uploaded_by": current_user.full_name,
            "uploaded_at": get_utc_now().isoformat(),
        }
        evidence_list.append(evidence_entry)
        asset.supporting_evidence = evidence_list
        asset.updated_at = get_utc_now()

        record_audit_event(
            db=db,
            action="ASSET_EVIDENCE_ATTACHED",
            entity_type="asset",
            entity_id=asset.id,
            actor_id=current_user.id,
            actor_email=current_user.email,
            details=evidence_entry,
        )
        db.commit()
        db.refresh(asset)
        return enrich_asset_response(asset, db)

    @staticmethod
    def get_stats(db: Session) -> AssetStats:
        assets = db.query(Asset).all()
        total = len(assets)

        op_ready = 0
        pending_verif = 0
        verif_failed = 0
        maint_req = 0
        installed = 0

        by_cat: Dict[str, int] = {}
        by_status: Dict[str, int] = {}
        by_zone_map: Dict[str, int] = {}

        for a in assets:
            by_cat[a.category] = by_cat.get(a.category, 0) + 1
            by_status[a.lifecycle_status] = by_status.get(a.lifecycle_status, 0) + 1

            if a.lifecycle_status == "Operationally Ready":
                op_ready += 1
            elif a.lifecycle_status in ["Inspection Pending", "Planned", "Procurement Pending", "Installation Pending"]:
                pending_verif += 1
            elif a.lifecycle_status == "Verification Failed":
                verif_failed += 1
            elif a.lifecycle_status == "Maintenance Required":
                maint_req += 1
            elif a.lifecycle_status == "Installed":
                installed += 1

            z_name = a.zone.name if a.zone else "Unassigned"
            by_zone_map[z_name] = by_zone_map.get(z_name, 0) + 1

        by_zone_list = [{"zone_name": k, "count": v} for k, v in by_zone_map.items()]

        return AssetStats(
            total_assets=total,
            operationally_ready_count=op_ready,
            pending_verification_count=pending_verif,
            verification_failed_count=verif_failed,
            maintenance_required_count=maint_req,
            installed_count=installed,
            assets_by_category=by_cat,
            assets_by_status=by_status,
            assets_by_zone=by_zone_list,
        )
