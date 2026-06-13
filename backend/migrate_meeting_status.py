from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE meetings ADD COLUMN status VARCHAR NOT NULL DEFAULT 'scheduled'"))
        conn.execute(text("ALTER TABLE meetings ADD COLUMN jitsi_room_id VARCHAR UNIQUE"))
    print("Migration successful: added status and jitsi_room_id to meetings table.")
except Exception as e:
    print("Migration error (may already exist):", e)
