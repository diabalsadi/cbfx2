import uuid

from sqlalchemy import Column, String, Text, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base


class Translation(Base):
    """Persistent cache of machine-translated public content, keyed by a hash
    of the original (always-English, authored) source text plus the target
    locale. Hashing the source text means edits to the underlying article/
    banner/etc. automatically invalidate the cache for that text (a new hash
    is looked up and misses), with no explicit invalidation logic needed.

    Deliberately does NOT store the original source text — the source of
    truth already lives in the owning table (articles, ad_banners, ...); this
    table only exists to avoid re-paying Google Translate for text it has
    already translated for a given locale.
    """

    __tablename__ = "translations"
    __table_args__ = (
        UniqueConstraint("source_hash", "target_locale", name="uq_translations_hash_locale"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # sha256 hex digest of the original English source string.
    source_hash = Column(String(64), nullable=False)
    target_locale = Column(String(8), nullable=False)
    translated_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
