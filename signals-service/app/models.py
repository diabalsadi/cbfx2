"""Minimal mirrors of tables owned by the main cbfx backend
(backend/app/models/{play,user,analysis,article}.py) — this service is a
separate Python project and can't import that code, so it declares just the
columns it actually reads/writes. The tables themselves, their full schema,
and all migrations (backend/app/main.py's ALTER TABLE block) are owned by
the main backend; this service never creates or alters tables (no
Base.metadata.create_all() call anywhere here) — only inserts/selects/updates
against tables the backend already maintains.
"""
from sqlalchemy import Boolean, Column, String, Text, DateTime
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    __tablename__ = "users"

    email = Column(String, primary_key=True)
    name = Column(String)
    role = Column(String)
    hashed_password = Column(String)


class Play(Base):
    __tablename__ = "plays"

    id = Column(String, primary_key=True)
    pair = Column(String, nullable=False)
    direction = Column(String, nullable=False)
    entry_price = Column(String, nullable=False)
    take_profit = Column(String, nullable=True)
    stop_loss = Column(String, nullable=True)
    timeframe = Column(String, nullable=True)
    play_type = Column(String, nullable=False)
    status = Column(String, nullable=False)  # "open" | "closed" | "cancelled"
    close_reason = Column(String, nullable=True)  # "hit" | "miss" | "market_shift"
    confidence = Column(String, nullable=True)  # "High" | "Medium" | "Low"
    notes = Column(Text, nullable=True)
    author_email = Column(String, nullable=False)
    opened_at = Column(DateTime(timezone=True), server_default=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Analysis(Base):
    __tablename__ = "analysis"

    id = Column(String, primary_key=True)
    pair = Column(String, nullable=False)
    timeframe = Column(String, nullable=False)
    bias = Column(String, nullable=False)  # "Bullish" | "Bearish" | "Neutral"
    summary = Column(Text, nullable=True)
    author_email = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Article(Base):
    __tablename__ = "articles"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    excerpt = Column(String, nullable=True)
    article_type = Column(String, nullable=False)  # "news" | "analysis"
    market_category = Column(String, nullable=True)  # crypto | forex | metals | indices
    symbol = Column(String, nullable=True)
    is_published = Column(Boolean, nullable=False)
    author_email = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
