from app.modules.documents.models import Document, DocumentVersion

def test_document_model():
    """
    Verifies that a Document model can be correctly initialized.
    """
    doc = Document(
        workspace_id="TECHNOVA-001",
        title="ReachFlow_Architecture",
        category="Tech",
        creator_id=1
    )
    assert doc.workspace_id == "TECHNOVA-001"
    assert doc.title == "ReachFlow_Architecture"
    assert doc.category == "Tech"
    assert doc.creator_id == 1

def test_document_version_model():
    """
    Verifies that a DocumentVersion model can be initialized with file metadata.
    """
    version = DocumentVersion(
        document_id=1,
        version_number=2,
        file_path="/var/storage/file_v2.pdf",
        file_size=2048,
        file_type="application/pdf",
        changelog="Updated OAuth credentials info"
    )
    assert version.document_id == 1
    assert version.version_number == 2
    assert version.file_path == "/var/storage/file_v2.pdf"
    assert version.file_size == 2048
    assert version.changelog == "Updated OAuth credentials info"
