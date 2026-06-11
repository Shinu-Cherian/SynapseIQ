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
    is_public: bool = Form(True),
    viewer_ids: str = Form(""),
    file: UploadFile = File(..., description="Document file to upload (PDF, DOCX, etc.)"),
    db: Session = Depends(get_db),
    # Guard: Any workspace member can upload documents
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Uploads a new document to the workspace.
    """
    import json
    v_ids = []
    if viewer_ids:
        try:
            v_ids = json.loads(viewer_ids)
        except Exception:
            pass
            
    return services.create_document(
        db,
        workspace_id=workspace_id,
        title=title,
        category=category,
        creator_id=current_member.user_id,
        file=file,
        changelog=changelog,
        is_public=is_public,
        viewer_ids=v_ids
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
    return services.get_workspace_documents(
        db, 
        workspace_id=workspace_id, 
        current_user_id=current_member.user_id,
        current_user_role=current_member.role,
        category=category
    )

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
    # Verify access using get_workspace_documents
    visible_docs = services.get_workspace_documents(db, workspace_id, current_member.user_id, current_member.role)
    if not any(d.id == document_id for d in visible_docs):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied"
        )
    return services.get_document_versions(db, document_id=document_id)

@router.get("/{document_id}/download")
def download_latest_version(
    workspace_id: str,
    document_id: int,
    inline: bool = False,
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Downloads the latest version of a document.
    """
    # Verify access using get_workspace_documents
    visible_docs = services.get_workspace_documents(db, workspace_id, current_member.user_id, current_member.role)
    document = next((d for d in visible_docs if d.id == document_id), None)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied"
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
        filename=f"{document.title}{file_ext}",
        content_disposition_type="inline" if inline else "attachment"
    )

@router.get("/{document_id}/download/{version_number}")
def download_specific_version(
    workspace_id: str,
    document_id: int,
    version_number: int,
    inline: bool = False,
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Downloads a specific version of a document.
    """
    # Verify access using get_workspace_documents
    visible_docs = services.get_workspace_documents(db, workspace_id, current_member.user_id, current_member.role)
    document = next((d for d in visible_docs if d.id == document_id), None)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied"
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
        filename=f"{document.title}_v{version_number}{file_ext}",
        content_disposition_type="inline" if inline else "attachment"
    )

@router.patch("/{document_id}/access", response_model=schemas.DocumentResponse)
def update_document_access(
    workspace_id: str,
    document_id: int,
    access_update: schemas.DocumentAccessUpdate,
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Updates the visibility access of a document.
    Only the Creator or a Team Head can perform this action.
    """
    return services.update_document_access(
        db,
        workspace_id=workspace_id,
        document_id=document_id,
        is_public=access_update.is_public,
        viewer_ids=access_update.viewer_ids,
        current_user_id=current_member.user_id,
        current_user_role=current_member.role
    )
