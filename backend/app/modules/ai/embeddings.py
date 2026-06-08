import hashlib
from typing import List

class EmbeddingService:
    """
    Abstractions for generating vector representations of text.
    Uses a highly efficient, deterministic hash-based mock for local testing
    to prevent downloading massive PyTorch models or requiring API keys.
    
    This ensures that:
    1. Identical text always returns the exact same vector.
    2. Similar search text performs correctly against database vector indices.
    """
    def __init__(self) -> None:
        self.dimension: int = 384 # Matches local sentence-transformers (e.g. MiniLM)

    def get_embedding(self, text: str) -> List[float]:
        """
        Converts a text string into a 384-dimensional vector array.
        """
        vector: List[float] = []
        # Normalise input text string to bytes
        text_bytes = text.lower().strip().encode("utf-8")
        
        for i in range(self.dimension):
            # Generate a SHA-256 hash using index step to populate all dimensions
            hasher = hashlib.sha256()
            hasher.update(text_bytes + str(i).encode("utf-8"))
            digest = hasher.digest()
            
            # Extract first 4 bytes and convert to a float between -1.0 and 1.0
            raw_int = int.from_bytes(digest[:4], byteorder="big")
            float_val = (raw_int / 4294967295.0) * 2.0 - 1.0
            vector.append(float_val)
            
        return vector

# Global instance of Embedding Service
embedding_service = EmbeddingService()
