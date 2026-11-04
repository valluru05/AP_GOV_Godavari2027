import pytest
from app.db.session import SessionLocal
from app.models.domain import Defect, Asset, WorkPackage, Inspection


def _reset_test_state():
    db = SessionLocal()
    try:
        d1 = db.query(Defect).filter(Defect.id == "def-001").first()
        if d1:
            d1.status = "Open"
            d1.severity = "Critical"
            d1.verification_result = None

        a1 = db.query(Asset).filter(Asset.id == "ast-001").first()
        if a1:
            a1.lifecycle_status = "Verification Failed"

        wp1 = db.query(WorkPackage).filter(WorkPackage.id == "wp-001").first()
        if wp1:
            wp1.workflow_state = "Rework Required"
            wp1.verified_progress_percentage = 0.0
            wp1.reported_progress_percentage = 100.0

        wp2 = db.query(WorkPackage).filter(WorkPackage.id == "wp-002").first()
        if wp2:
            wp2.workflow_state = "In Progress"
            wp2.verified_progress_percentage = 50.0
            wp2.reported_progress_percentage = 60.0

        insp1 = db.query(Inspection).filter(Inspection.id == "insp-001").first()
        if insp1:
            insp1.outcome = "Failed"
            insp1.verified_percentage_awarded = 0.0
            insp1.reviewer_decision = "Rejected"

        insp3 = db.query(Inspection).filter(Inspection.id == "insp-003").first()
        if insp3:
            insp3.outcome = "Scheduled"
            insp3.verified_percentage_awarded = 0.0
            insp3.reviewer_decision = None

        db.commit()
    finally:
        db.close()


@pytest.fixture(autouse=True)
def ensure_clean_test_state():
    _reset_test_state()
    yield
    _reset_test_state()

