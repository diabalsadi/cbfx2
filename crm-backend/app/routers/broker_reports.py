from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from typing import List, Optional

from backend_shared.database import get_db
from backend_shared.models.broker import Broker
from backend_shared.models.broker_report import BrokerReport
from backend_shared.models.user import User
from backend_shared.schemas.broker_report import BrokerReport as BrokerReportSchema
from backend_shared.services import r2_storage
from backend_shared.utils.auth import get_current_user
from backend_shared.auth.rbac import require_roles

router = APIRouter(prefix="/broker-reports", tags=["broker-reports"])

ALLOWED_ROLES = {"super_admin", "broker"}

def _authorized_broker(db: Session, broker_id: str, current_user: User) -> Broker:
    """Same ownership-scoping as brokers.py: a super_admin may act on any
    broker, a "broker"-role account only on the listing it owns."""
    broker = db.query(Broker).filter(Broker.id == broker_id).first()
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")
    if current_user.role != "super_admin" and broker.owner_email != current_user.email:
        raise HTTPException(status_code=403, detail="Not authorised")
    return broker


def _to_schema(report: BrokerReport, broker: Broker) -> BrokerReportSchema:
    return BrokerReportSchema(
        id=report.id,
        broker_id=report.broker_id,
        broker_name=broker.name,
        filename=report.filename,
        url=r2_storage.url_for(report.r2_key),
        size=report.size,
        uploaded_by=report.uploaded_by,
        created_at=report.created_at,
    )


@router.get("/", response_model=List[BrokerReportSchema])
def list_reports(
    broker_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    q = db.query(BrokerReport)
    if broker_id:
        q = q.filter(BrokerReport.broker_id == broker_id)
    reports = q.order_by(BrokerReport.created_at.desc()).all()
    if not reports:
        return []

    brokers = {
        b.id: b
        for b in db.query(Broker).filter(Broker.id.in_({r.broker_id for r in reports})).all()
    }
    if current_user.role != "super_admin":
        reports = [r for r in reports if brokers.get(r.broker_id) and brokers[r.broker_id].owner_email == current_user.email]

    return [_to_schema(r, brokers[r.broker_id]) for r in reports if brokers.get(r.broker_id)]


@router.post("/", response_model=BrokerReportSchema, status_code=status.HTTP_201_CREATED)
def upload_report(
    broker_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    broker = _authorized_broker(db, broker_id, current_user)
    if not file.filename:
        raise HTTPException(status_code=400, detail="A file is required")

    contents = file.file.read()
    try:
        uploaded = r2_storage.upload_broker_report(broker_id, file.filename, contents)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    report = BrokerReport(
        broker_id=broker_id,
        filename=file.filename,
        r2_key=uploaded["key"],
        size=uploaded["size"],
        uploaded_by=current_user.email,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return _to_schema(report, broker)


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    report = db.query(BrokerReport).filter(BrokerReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    _authorized_broker(db, report.broker_id, current_user)

    try:
        r2_storage.delete_broker_report(report.r2_key)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    db.delete(report)
    db.commit()
