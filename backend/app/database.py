import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

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
is_postgres = DATABASE_URL.startswith(("postgres://", "postgresql://", "postgresql+psycopg2://"))
if is_postgres:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    engine_kwargs["connect_args"] = {"sslmode": "require"}

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
