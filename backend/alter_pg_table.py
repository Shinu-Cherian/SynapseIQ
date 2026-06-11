from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE channels ADD COLUMN is_dm BOOLEAN NOT NULL DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE channels ADD COLUMN dm_user_1_id INTEGER REFERENCES users(id) ON DELETE CASCADE;"))
        conn.execute(text("ALTER TABLE channels ADD COLUMN dm_user_2_id INTEGER REFERENCES users(id) ON DELETE CASCADE;"))
        print("Columns added successfully.")
except Exception as e:
    print(f"Error or already exists: {e}")
