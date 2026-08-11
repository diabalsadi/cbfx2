from pydantic import BaseModel
from datetime import datetime

SECTIONS = {"featured", "sponsored", "partners", "more_partners"}


class BrokerPlacementSet(BaseModel):
    broker_id: str


class BrokerPlacement(BaseModel):
    id: str
    section: str
    position: int
    broker_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
