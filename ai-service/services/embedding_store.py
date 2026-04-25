import numpy as np
import os
import pickle

_EMBEDDINGS_DIR = None


def _get_embeddings_dir() -> str:
    global _EMBEDDINGS_DIR
    if _EMBEDDINGS_DIR is None:
        models_dir = os.getenv('MODELS_DIR', './models')
        _EMBEDDINGS_DIR = os.path.join(models_dir, 'embeddings')
        os.makedirs(_EMBEDDINGS_DIR, exist_ok=True)
    return _EMBEDDINGS_DIR


def save_embedding(user_id: int, embedding: np.ndarray):
    """Persist a 512-d L2-normalised embedding for a user to disk."""
    path = os.path.join(_get_embeddings_dir(), f"user_{user_id}.pkl")
    with open(path, 'wb') as f:
        pickle.dump(embedding.astype(np.float32), f)


def load_embedding(user_id: int):
    """Load the stored embedding for a user. Returns None if not found."""
    path = os.path.join(_get_embeddings_dir(), f"user_{user_id}.pkl")
    if not os.path.exists(path):
        return None
    with open(path, 'rb') as f:
        return pickle.load(f)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two L2-normalised vectors."""
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))
