from fastapi.testclient import TestClient
from app.main import app
from app.core.security import hash_password, verify_password, create_access_token

client = TestClient(app)

def test_password_hashing():
    """
    Verifies that password hashing generates secure hashes and validates correctly.
    """
    password = "secretpassword123"
    hashed = hash_password(password)
    
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrongpassword", hashed) is False

def test_jwt_creation():
    """
    Verifies that JWT token generation completes successfully.
    """
    token = create_access_token(subject=42)
    assert token is not None
    assert isinstance(token, str)

def test_read_root():
    """
    Verifies that the root HTTP endpoint responds with a 200 OK and healthy status.
    """
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
