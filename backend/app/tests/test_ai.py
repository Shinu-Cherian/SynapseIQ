from app.modules.ai.services import chunk_text
from app.modules.ai.embeddings import embedding_service

def test_text_chunking():
    """
    Verifies that the text chunking utility splits content with overlap correctly.
    """
    # 35 characters
    test_text = "abcdefghijklmnopqrstuvwxyz123456789"
    
    # Chunk size 10, overlap 2
    chunks = chunk_text(test_text, chunk_size=10, overlap=2)
    
    assert len(chunks) > 1
    # First chunk should have length 10
    assert len(chunks[0]) == 10
    # verify content splits
    assert chunks[0] == "abcdefghij"

def test_embedding_dimensions():
    """
    Verifies that the embedding service outputs a 384-dimensional vector.
    """
    text = "Hello SynapseIQ!"
    vector = embedding_service.get_embedding(text)
    
    assert len(vector) == 384
    assert isinstance(vector[0], float)
    
    # Verify determinism: Same text must give same vector
    vector2 = embedding_service.get_embedding(text)
    assert vector == vector2
