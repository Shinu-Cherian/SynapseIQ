from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE documents ADD COLUMN is_public BOOLEAN DEFAULT TRUE NOT NULL;"))
        print("Successfully added is_public to documents table.")
        
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS document_viewers (
            id SERIAL PRIMARY KEY,
            document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS ix_document_viewers_id ON document_viewers (id);
        """))
        print("Successfully created document_viewers table.")
except Exception as e:
    print("Migration error:", e)
