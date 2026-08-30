from pydantic import BaseModel, Field
from datetime import datetime


class BrokerRatingSubmit(BaseModel):
    rating: int = Field(ge=1, le=5)


class BrokerRatingOut(BaseModel):
    rating: int
    updated_at: datetime

    class Config:
        from_attributes = True
