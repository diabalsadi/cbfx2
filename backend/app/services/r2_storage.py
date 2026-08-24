"""Cloudflare R2 (S3-compatible) storage for the admin Media Manager.

Credentials/endpoint are read lazily on first use rather than at import time
so a deployment that hasn't configured R2 yet doesn't fail to start — the
media router just returns 503 until R2_* env vars are set.
"""
import os
import re
import uuid
from pathlib import Path
from typing import List, TypedDict

import boto3
from botocore.client import Config

IMAGES_PREFIX = "images/"

# Extension is derived from this allowlist (never from the client-supplied
# filename), matching the pattern in routers/forum.py — keeps the store from
# ever holding a file whose declared type doesn't match an allowed image.
ALLOWED_IMAGE_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

MAX_UPLOAD_BYTES = 10 * 1024 * 1024

_client = None


class MediaImage(TypedDict):
    key: str
    url: str
    size: int
    last_modified: str


def _bucket_name() -> str:
    return os.getenv("R2_BUCKET_NAME", "tradeverse")


def _get_client():
    global _client
    if _client is not None:
        return _client

    endpoint = os.getenv("R2_ENDPOINT")
    access_key = os.getenv("R2_ACCESS_KEY_ID")
    secret_key = os.getenv("R2_SECRET_ACCESS_KEY")
    if not endpoint or not access_key or not secret_key:
        raise RuntimeError(
            "R2_ENDPOINT, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY environment "
            "variables are required for media storage"
        )

    _client = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        region_name="auto",
    )
    return _client


def _public_url(key: str) -> str:
    base = os.getenv("R2_PUBLIC_URL")
    if not base:
        raise RuntimeError("R2_PUBLIC_URL environment variable is required for media storage")
    return f"{base.rstrip('/')}/{key}"


def _safe_stem(filename: str) -> str:
    stem = Path(filename).stem
    stem = re.sub(r"[^a-zA-Z0-9_-]+", "-", stem).strip("-").lower()
    return stem[:60] or "image"


def upload_image(filename: str, content_type: str, data: bytes) -> MediaImage:
    suffix = ALLOWED_IMAGE_TYPES.get((content_type or "").lower())
    if suffix is None:
        raise ValueError("Unsupported image type. Allowed: PNG, JPEG, WEBP, GIF.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise ValueError("Image must be 10MB or smaller.")

    key = f"{IMAGES_PREFIX}{_safe_stem(filename)}-{uuid.uuid4().hex[:8]}{suffix}"
    _get_client().put_object(
        Bucket=_bucket_name(),
        Key=key,
        Body=data,
        ContentType=content_type,
    )
    return {"key": key, "url": _public_url(key), "size": len(data), "last_modified": ""}


def list_images() -> List[MediaImage]:
    client = _get_client()
    bucket = _bucket_name()
    paginator = client.get_paginator("list_objects_v2")
    items: List[MediaImage] = []
    for page in paginator.paginate(Bucket=bucket, Prefix=IMAGES_PREFIX):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            if key == IMAGES_PREFIX:
                continue
            items.append(
                {
                    "key": key,
                    "url": _public_url(key),
                    "size": obj["Size"],
                    "last_modified": obj["LastModified"].isoformat(),
                }
            )
    items.sort(key=lambda i: i["last_modified"], reverse=True)
    return items


def delete_image(key: str) -> None:
    if not key.startswith(IMAGES_PREFIX) or ".." in key:
        raise ValueError("Invalid image key")
    _get_client().delete_object(Bucket=_bucket_name(), Key=key)
