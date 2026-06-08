import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.documents import schemas, services
from app.modules.documents.models import Document
from app.modules.workspace.dependencies import RequireWorkspaceRole
from app.modules.workspace.models import WorkspaceMember

router = APIRouter(prefix="/workspaces/{workspace_id}/documents", tags=["Documents"])

@router.post("", response_model=schemas.DocumentResponse, status_code=status.HTTP_201_CREATED)
def upload_document(
    workspace_id: str,
    title: str = Form(..., description="Display title of the document"),
    category: str = Form("General", description="Tag/Category e.g. HR, Tech"),
    changelog: str = Form("Initial upload", description="Changelog description for first version"),
    file: UploadFile = File(..., description="Document file to upload (PDF, DOCX, etc.)"),
    db: Session = Depends(get_db),
    # Guard: Any workspace member can upload documents
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Uploads a new document to the workspace.
    Saves the file to local storage and creates Version 1 in database records.
    """
    return services.create_document(
        db,
        workspace_id=workspace_id,
        title=title,
        category=category,
        creator_id=current_member.user_id,
        file=file,
        changelog=changelog
    )

@router.post("/{document_id}/versions", response_model=schemas.DocumentVersionResponse, status_code=status.HTTP_201_CREATED)
def upload_new_version(
    workspace_id: str,
    document_id: int,
    changelog: str = Form(..., description="Describe what changed in this version"),
    file: UploadFile = File(..., description="New file version to upload"),
    db: Session = Depends(get_db),
    # Guard: Workspace members only
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Uploads a new version of an existing document.
    Automatically increments version number.
    """
    return services.add_new_version(
        db,
        workspace_id=workspace_id,
        document_id=document_id,
        file=file,
        changelog=changelog,
        user_id=current_member.user_id
    )

@router.get("", response_model=List[schemas.DocumentResponse])
def get_documents(
    workspace_id: str,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Lists all documents inside a workspace, optionally filtered by category.
    """
    return services.get_workspace_documents(db, workspace_id=workspace_id, category=category)

@router.get("/{document_id}/versions", response_model=List[schemas.DocumentVersionResponse])
def get_versions(
    workspace_id: str,
    document_id: int,
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Retrieves the history of all versions for a specific document.
    """
    # Verify document belongs to workspace
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.workspace_id == workspace_id
    ).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found in this workspace"
        )
    return services.get_document_versions(db, document_id=document_id)

@router.get("/{document_id}/download")
def download_latest_version(
    workspace_id: str,
    document_id: int,
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Downloads the latest version of a document.
    """
    # 1. Verify document exists in workspace
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.workspace_id == workspace_id
    ).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found in this workspace"
        )
        
    # 2. Get latest version file metadata
    db_version = services.get_version_file_path(db, document_id)
    if not os.path.exists(db_version.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical file not found on disk"
        )
        
    # Extract file suffix
    file_ext = os.path.splitext(db_version.file_path)[1]
    
    # 3. Return FileResponse mapping original title
    return FileResponse(
        path=db_version.file_path,
        media_type=db_version.file_type,
        filename=f"{document.title}{file_ext}"
    )

@router.get("/{document_id}/download/{version_number}")
def download_specific_version(
    workspace_id: str,
    document_id: int,
    version_number: int,
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Downloads a specific version of a document.
    """
    # 1. Verify document
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.workspace_id == workspace_id
    ).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found in this workspace"
        )
        
    # 2. Get version metadata
    db_version = services.get_version_file_path(db, document_id, version_number)
    if not os.path.exists(db_version.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical file not found on disk"
        )
        
    file_ext = os.path.splitext(db_version.file_path)[1]
    
    return FileResponse(
        path=db_version.file_path,
        media_type=db_version.file_type,
        filename=f"{document.title}_v{version_number}{file_ext}"
    )
