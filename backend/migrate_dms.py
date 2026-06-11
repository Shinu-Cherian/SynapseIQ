from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.modules.workspace.models import Workspace, WorkspaceMember
from app.modules.chat.models import Channel
from app.modules.auth.models import User

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    # Add missing DM channels for existing members
    workspaces = db.query(Workspace).all()
    for ws in workspaces:
        members = db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == ws.id).all()
        for member in members:
            if member.role != "Owner":
                user = db.query(User).filter(User.id == member.user_id).first()
                if not user: continue
                
                # Check if DM channel exists
                existing_dm = db.query(Channel).filter(
                    Channel.workspace_id == ws.id,
                    Channel.is_dm == True,
                    Channel.name == f"DM: {user.full_name}"
                ).first()
                
                if not existing_dm:
                    print(f"Creating missing DM channel for {user.full_name} in workspace {ws.id}")
                    dm_channel = Channel(
                        workspace_id=ws.id,
                        name=f"DM: {user.full_name}",
                        description=f"Direct message with {user.full_name}",
                        is_private=True,
                        is_dm=True,
                        dm_user_1_id=ws.owner_id,
                        dm_user_2_id=user.id
                    )
                    db.add(dm_channel)

    db.commit()
    print("DM Migration completed successfully.")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
