import os
from dotenv import find_dotenv, load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# find_dotenv(usecwd=True): without it, dotenv searches upward from *this
# file's* location (backend-shared/backend_shared/), not the running
# service's working directory. Since backend-shared is a sibling of
# backend/, crm-backend/, and user-backend/ — not their ancestor — the
# default search never reaches any of their .env files. Each service is
# run with its own directory as cwd, so usecwd=True is what actually finds
# them. (usecwd is a find_dotenv() param, not load_dotenv()'s.)
load_dotenv(find_dotenv(usecwd=True))

# Get database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is required")

engine_kwargs = {
    "pool_pre_ping": True,
    "pool_recycle": 1800,
}

# Render PostgreSQL requires SSL and can drop idle connections, so make the
# connection settings explicit for that environment.
is_postgres = DATABASE_URL.startswith(
    ("postgres://", "postgresql://", "postgresql+psycopg2://")
)
if is_postgres:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    engine_kwargs["connect_args"] = {"sslmode": "require"}
    # pool_size/max_overflow are QueuePool-only kwargs — SQLite (local dev)
    # uses SingletonThreadPool and rejects them outright, so these only
    # apply on the Postgres path. Values match SQLAlchemy's own defaults;
    # pinned explicitly (env-overridable) so they're a deliberate, easy-to-
    # find knob rather than an implicit default someone has to look up.
    engine_kwargs["pool_size"] = int(os.getenv("DB_POOL_SIZE", "5"))
    engine_kwargs["max_overflow"] = int(os.getenv("DB_MAX_OVERFLOW", "10"))

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL, **engine_kwargs)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()


# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
