from pydantic import BaseModel


class MediaImage(BaseModel):
    # Object key within the bucket, e.g. "images/banner-a1b2c3d4.png".
    key: str
    url: str
    size: int
    last_modified: str
