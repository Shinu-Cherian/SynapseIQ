import os
import uuid
import shutil
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException, status
from app.modules.documents.models import Document, DocumentVersion, DocumentViewer

# Local directory where files will be saved
STORAGE_DIR = os.path.join(os.getcwd(), "storage")

def ensure_storage_exists(workspace_id: str) -> str:
    """
    Ensures that the storage directory for the workspace exists.
    Returns the absolute path.
    """
    path = os.path.join(STORAGE_DIR, workspace_id)
    os.makedirs(path, exist_ok=True)
    return path

def save_file_to_disk(workspace_id: str, file: UploadFile) -> str:
    """
    Saves the uploaded file to the local filesystem with a unique filename.
    Returns the final file path.
    """
    workspace_path = ensure_storage_exists(workspace_id)
    
    # Generate unique filename on disk to avoid collisions
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ""
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    
    destination_path = os.path.join(workspace_path, unique_filename)
    
    # Write file content
    with open(destination_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return destination_path

def create_document(
    db: Session,
    workspace_id: str,
    title: str,
    category: str,
    creator_id: int,
    file: UploadFile,
    changelog: Optional[str] = "Initial upload",
    is_public: bool = True,
    viewer_ids: Optional[List[int]] = None
) -> Document:
    """
    Saves file to disk and registers Document metadata and Version 1 in DB.
    """
    # 1. Save file on disk
    file_path = save_file_to_disk(workspace_id, file)
    
    # 2. Get file size
    file_size = os.path.getsize(file_path)
    
    # 3. Create document record
    db_document = Document(
        workspace_id=workspace_id,
        title=title.strip(),
        category=category.strip(),
        is_public=is_public,
        creator_id=creator_id
    )
    db.add(db_document)
    db.flush() # Fetch document ID
    
    # 4. Create document version record (Version 1)
    db_version = DocumentVersion(
        document_id=db_document.id,
        version_number=1,
        file_path=file_path,
        file_size=file_size,
        file_type=file.content_type or "application/octet-stream",
        changelog=changelog,
        uploaded_by=creator_id
    )
    db.add(db_version)
    db.commit()
    db.refresh(db_document)

    # 5. Add viewers if not public
    if not is_public and viewer_ids:
        for vid in viewer_ids:
            # Prevent creating a record for the creator as they already have access
            if vid != creator_id:
                viewer_record = DocumentViewer(document_id=db_document.id, user_id=vid)
                db.add(viewer_record)
        db.commit()
    
    return db_document

def add_new_version(
    db: Session,
    workspace_id: str,
    document_id: int,
    file: UploadFile,
    changelog: str,
    user_id: int
) -> DocumentVersion:
    """
    Uploads a new version of an existing document.
    """
    # 1. Fetch document
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.workspace_id == workspace_id
    ).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found in this workspace"
        )
        
    # 2. Find latest version number
    latest_version = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == document_id
    ).order_by(DocumentVersion.version_number.desc()).first()
    
    next_version_num = (latest_version.version_number + 1) if latest_version else 1
    
    # 3. Save new file to disk
    file_path = save_file_to_disk(workspace_id, file)
    file_size = os.path.getsize(file_path)
    
    # 4. Save new version metadata in database
    db_version = DocumentVersion(
        document_id=document_id,
        version_number=next_version_num,
        file_path=file_path,
        file_size=file_size,
        file_type=file.content_type or "application/octet-stream",
        changelog=changelog.strip(),
        uploaded_by=user_id
    )
    db.add(db_version)
    db.commit()
    db.refresh(db_version)
    
    return db_version

def get_workspace_documents(
    db: Session, 
    workspace_id: str,
    current_user_id: int,
    current_user_role: str,
    category: Optional[str] = None
) -> List[Document]:
    """
    Retrieves all documents belonging to a workspace.
    Enforces visibility access control.
    """
    query = db.query(Document).filter(Document.workspace_id == workspace_id)
    if category:
        query = query.filter(Document.category == category.strip())

    documents = query.all()
    
    # Filter by access control
    # Owners and Admins can see everything
    if current_user_role in ["Owner", "Admin"]:
        return documents

    visible_docs = []
    for doc in documents:
        if doc.is_public:
            visible_docs.append(doc)
        elif doc.creator_id == current_user_id:
            visible_docs.append(doc)
        else:
            # Check if user is in DocumentViewer
            viewer_exists = db.query(DocumentViewer).filter(
                DocumentViewer.document_id == doc.id,
                DocumentViewer.user_id == current_user_id
            ).first()
            if viewer_exists:
                visible_docs.append(doc)
                
    return visible_docs

def get_document_versions(db: Session, document_id: int) -> List[DocumentVersion]:
    """
    Retrieves the history of all versions for a document.
    """
    return db.query(DocumentVersion).filter(
        DocumentVersion.document_id == document_id
    ).order_by(DocumentVersion.version_number.desc()).all()

def get_version_file_path(
    db: Session, 
    document_id: int, 
    version_number: Optional[int] = None
) -> DocumentVersion:
    """
    Retrieves file metadata path for a specific or latest version of a document.
    """
    query = db.query(DocumentVersion).filter(DocumentVersion.document_id == document_id)
    
    if version_number:
        version = query.filter(DocumentVersion.version_number == version_number).first()
    else:
        # Get latest version
        version = query.order_by(DocumentVersion.version_number.desc()).first()
        
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document version file path not found"
        )
        
    return version

def update_document_access(
    db: Session,
    workspace_id: str,
    document_id: int,
    is_public: bool,
    viewer_ids: List[int],
    current_user_id: int,
    current_user_role: str
) -> Document:
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.workspace_id == workspace_id
    ).first()
    
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
        
    # Security check: only Owner, Admin, or Creator can edit access
    if current_user_role not in ["Owner", "Admin"] and document.creator_id != current_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit access")
        
    document.is_public = is_public
    
    # Delete existing viewers
    db.query(DocumentViewer).filter(DocumentViewer.document_id == document_id).delete()
    
    # Add new viewers if restricted
    if not is_public and viewer_ids:
        for vid in viewer_ids:
            if vid != document.creator_id:
                viewer_record = DocumentViewer(document_id=document_id, user_id=vid)
                db.add(viewer_record)
                
    db.commit()
    db.refresh(document)
    return document
