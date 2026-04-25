import pytest
import numpy as np
import tempfile
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


def test_save_and_load_embedding(tmp_path, monkeypatch):
    monkeypatch.setenv('MODELS_DIR', str(tmp_path))

    # Reset cached dir so it picks up the new env var
    import services.embedding_store as es
    es._EMBEDDINGS_DIR = None

    vec = np.random.randn(512).astype(np.float32)
    es.save_embedding(42, vec)
    loaded = es.load_embedding(42)

    assert loaded is not None
    assert loaded.shape == (512,)
    np.testing.assert_allclose(loaded, vec, rtol=1e-5)


def test_load_missing_embedding_returns_none(tmp_path, monkeypatch):
    monkeypatch.setenv('MODELS_DIR', str(tmp_path))

    import services.embedding_store as es
    es._EMBEDDINGS_DIR = None

    result = es.load_embedding(999)
    assert result is None


def test_cosine_similarity_same_vector():
    from services.embedding_store import cosine_similarity
    v = np.array([1.0, 0.0, 0.0])
    assert abs(cosine_similarity(v, v) - 1.0) < 1e-6


def test_cosine_similarity_orthogonal():
    from services.embedding_store import cosine_similarity
    a = np.array([1.0, 0.0])
    b = np.array([0.0, 1.0])
    assert abs(cosine_similarity(a, b)) < 1e-6
