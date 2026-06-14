from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

# Create the SQLAlchemy engine. 
# pool_pre_ping=True helps handle stale connections automatically.
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=10
)

# Create a sessionmaker factory.
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Declarative base class for models
Base = declarative_base()

# FastAPI dependency to yield database sessions
def get_db() -> Generator[Session, None, None]:
    """
    Yields a database session that will automatically be closed
    after the HTTP request lifecycle completes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
