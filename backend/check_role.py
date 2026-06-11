import os
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.modules.workspace.models import WorkspaceMember

db = SessionLocal()
try:
    members = db.query(WorkspaceMember).all()
    for m in members:
        print(f"User {m.user_id} in Workspace {m.workspace_id} has role '{m.role}'")
finally:
    db.close()
