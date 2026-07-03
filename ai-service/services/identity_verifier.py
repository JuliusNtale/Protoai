import os

import numpy as np
import requests

from services.preprocessing import base64_to_numpy, preprocess_for_facenet
from services.face_detector import detect_and_crop_face
from services.embedding_store import load_embedding, save_embedding, cosine_similarity

_THRESHOLD = float(os.getenv('FACE_SIMILARITY_THRESHOLD', '0.6'))
_BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000").rstrip("/")
_AI_SERVICE_TOKEN = os.getenv("AI_SERVICE_TOKEN", "").strip()


def run_facenet_embedding(facenet, face_input: np.ndarray) -> np.ndarray:
    input_name = facenet.get_inputs()[0].name
    output_name = facenet.get_outputs()[0].name
    return facenet.run([output_name], {input_name: face_input})[0][0]


def _l2_normalize(vector: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(vector)
    return vector / norm if norm > 0 else vector


def load_registered_baseline_embedding(user_id: int, facenet):
    """Fetch the student's registered baseline photo, embed it, and cache it on disk."""
    response = requests.get(
        f"{_BACKEND_URL}/api/images/internal/{user_id}/baseline",
        headers={"X-Internal-Token": _AI_SERVICE_TOKEN},
        timeout=8,
    )
    if not response.ok:
        return None, f"Baseline image fetch failed: {response.status_code}"

    payload = response.json()
    baseline_base64 = payload.get("image_base64")
    if not baseline_base64:
        return None, "Baseline image payload missing image_base64"

    try:
        baseline_bgr = base64_to_numpy(baseline_base64)
    except Exception:
        return None, "Invalid baseline image payload"

    baseline_face, _ = detect_and_crop_face(baseline_bgr)
    if baseline_face is None:
        return None, "No face detected in registered baseline image"

    baseline_input = preprocess_for_facenet(baseline_face)
    baseline_embedding = _l2_normalize(run_facenet_embedding(facenet, baseline_input))
    save_embedding(user_id, baseline_embedding)
    return baseline_embedding, None


def get_baseline_embedding(user_id: int, facenet):
    stored = load_embedding(user_id)
    if stored is not None:
        return stored, None
    return load_registered_baseline_embedding(user_id, facenet)


def match_face_crop_to_baseline(face_crop_bgr: np.ndarray, user_id: int, facenet):
    """Compare a detected face crop against the student's registered baseline.

    Returns (match, confidence, None) on success, or (None, None, error) if
    the comparison couldn't be run at all (e.g. baseline unavailable).
    """
    face_input = preprocess_for_facenet(face_crop_bgr)
    embedding = _l2_normalize(run_facenet_embedding(facenet, face_input))

    baseline_embedding, error = get_baseline_embedding(user_id, facenet)
    if baseline_embedding is None:
        return None, None, error

    confidence = max(0.0, min(1.0, cosine_similarity(embedding, baseline_embedding)))
    return confidence >= _THRESHOLD, confidence, None
