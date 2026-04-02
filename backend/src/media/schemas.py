import uuid
from datetime import datetime

from pydantic import BaseModel


class MediaRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    post_id: uuid.UUID | None
    path: str
    original_name: str
    created_at: datetime
