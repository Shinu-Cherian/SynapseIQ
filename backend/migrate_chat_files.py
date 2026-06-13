import os
import sys

# Add the project root directory to sys.path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from sqlalchemy import text
from app.core.database import SessionLocal

def run_migration():
    db = SessionLocal()
    try:
        print("Adding file_url, file_name, file_type to messages table...")
        db.execute(text("ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url VARCHAR;"))
        db.execute(text("ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name VARCHAR;"))
        db.execute(text("ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_type VARCHAR;"))
        
        # Also need to alter 'content' to allow NULL if it was previously NOT NULL
        print("Altering content column to be nullable...")
        db.execute(text("ALTER TABLE messages ALTER COLUMN content DROP NOT NULL;"))
        
        db.commit()
        print("Migration completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error during migration: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
