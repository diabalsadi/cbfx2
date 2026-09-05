from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class BrokerReport(BaseModel):
    id: str
    broker_id: str
    broker_name: str
    filename: str
    url: str
    size: int
    uploaded_by: Optional[str] = None
    created_at: datetime
