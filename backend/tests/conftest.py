import pytest
from app.db.session import SessionLocal
from app.models.domain import Defect, Asset, WorkPackage


@pytest.fixture(autouse=True)
def ensure_clean_test_state():
    # Setup before test runs
    db = SessionLocal()
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
    db.commit()
    db.close()

    yield

    # Teardown after test runs
    db = SessionLocal()
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
    db.commit()
    db.close()

