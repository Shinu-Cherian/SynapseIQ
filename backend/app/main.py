from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
import logging
from app.core.config import settings
from app.core.database import Base, engine
from app.core.redis_client import redis_manager
from app.core.rate_limit import setup_rate_limiting

# Import models to register them on Base metadata before auto-creating tables
from app.modules.auth.models import User
from app.modules.workspace.models import Workspace, WorkspaceMember, WorkspaceInvitation
from app.modules.projects.models import Project, ProjectMember, ProjectTask
from app.modules.chat.models import Channel, Message
from app.modules.documents.models import Document, DocumentVersion
from app.modules.meetings.models import Meeting, MeetingNote
from app.modules.ai.models import DocumentChunk
from app.modules.notifications.models import Notification

# Import routers
from app.modules.auth.router import router as auth_router
from app.modules.workspace.router import router as workspace_router
from app.modules.projects.router import router as projects_router
from app.modules.chat.router import router as chat_router
from app.modules.documents.router import router as documents_router
from app.modules.meetings.router import router as meetings_router
from app.modules.ai.router import router as ai_router
from app.modules.dashboard.router import router as dashboard_router
from app.modules.notifications.router import router as notifications_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles startup and shutdown lifecycle events.
    """
    # 1. Create database tables automatically if they don't exist (Local Dev convenience)
    try:
        print("Initializing database tables...")
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        Base.metadata.create_all(bind=engine)
        print("Database tables initialized successfully!")
    except Exception as e:
        print(f"Failed to auto-create database tables: {e}")

    # 2. Connect to Redis
    redis_manager.connect()
    yield
    # 3. Disconnect from Redis
    redis_manager.disconnect()

# Initialize FastAPI App
app = FastAPI(
    title=settings.APP_NAME,
    description="The AI Brain of Your Organization - Core Modular Monolith API",
    version="1.0.0",
    lifespan=lifespan,
    debug=settings.DEBUG
)

# Add GZip Middleware for performance
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Global Exception Handler
logger = logging.getLogger("uvicorn.error")

@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception):
    logger.error(f"Global Exception: {exc}", exc_info=True)
    if settings.ENVIRONMENT == "production":
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error"},
        )
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
    )

# Setup Rate Limiting
setup_rate_limiting(app)

# Set CORS middleware (essential for frontend communication)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Module Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(workspace_router, prefix=settings.API_V1_STR)
app.include_router(projects_router, prefix=settings.API_V1_STR)
app.include_router(chat_router, prefix=settings.API_V1_STR)
app.include_router(documents_router, prefix=settings.API_V1_STR)
app.include_router(meetings_router, prefix=settings.API_V1_STR)
app.include_router(ai_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)

# Root check endpoint
@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "api_docs_path": "/docs"
    }

# API Status check endpoint
@app.get("/healthz")
def health_check():
    redis_status = "healthy" if redis_manager.client and redis_manager.client.ping() else "unhealthy"
    return {
        "status": "ok",
        "services": {
            "postgres": "checked_via_lazy_connections",
            "redis": redis_status
        }
    }
