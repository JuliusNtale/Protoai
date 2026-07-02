import os
import numpy as np
from flask import Blueprint, request, jsonify
import requests

from services.preprocessing import base64_to_numpy, preprocess_for_facenet
from services.face_detector import detect_and_crop_face
from services.embedding_store import load_embedding, save_embedding, cosine_similarity
from services.model_loader import get_facenet, get_loaded_model_paths

verify_bp = Blueprint('verify', __name__)

_THRESHOLD = float(os.getenv('FACE_SIMILARITY_THRESHOLD', '0.6'))
_BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000").rstrip("/")
_AI_SERVICE_TOKEN = os.getenv("AI_SERVICE_TOKEN", "").strip()
_MODEL_VERSION = os.getenv("FACENET_MODEL_VERSION", "facenet_best.onnx")


def _run_facenet_embedding(facenet, face_input: np.ndarray) -> np.ndarray:
    input_name = facenet.get_inputs()[0].name
    output_name = facenet.get_outputs()[0].name
    return facenet.run([output_name], {input_name: face_input})[0][0]


def _persist_verification(session_id: int, match: bool, confidence: float):
    if not _AI_SERVICE_TOKEN:
        return False, "AI_SERVICE_TOKEN is not configured"
    try:
        response = requests.post(
            f"{_BACKEND_URL}/api/sessions/verify",
            headers={"X-Internal-Token": _AI_SERVICE_TOKEN, "Content-Type": "application/json"},
            json={
                "session_id": session_id,
                "match": bool(match),
                "confidence_score": float(confidence),
                "verification_method": "ai-face-embedding",
                "model_version": _MODEL_VERSION,
            },
            timeout=8,
        )
        return response.ok, response.text
    except requests.RequestException as exc:
        return False, str(exc)


def _load_registered_baseline_embedding(user_id: int, facenet):
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
    baseline_embedding = _run_facenet_embedding(facenet, baseline_input)
    norm = np.linalg.norm(baseline_embedding)
    if norm > 0:
        baseline_embedding = baseline_embedding / norm

    save_embedding(user_id, baseline_embedding)
    return baseline_embedding, None


@verify_bp.route('/verify-identity', methods=['POST'])
def verify_identity():
    data = request.get_json(silent=True)

    if not data or 'user_id' not in data or 'image_base64' not in data:
        return jsonify({'error': 'Missing user_id or image_base64'}), 400

    user_id = int(data['user_id'])
    session_id = data.get("session_id")

    try:
        img_bgr = base64_to_numpy(data['image_base64'])
    except Exception:
        return jsonify({'error': 'Invalid base64 image'}), 400

    face_crop, _ = detect_and_crop_face(img_bgr)
    if face_crop is None:
        return jsonify({'error': 'No face detected in image'}), 422

    facenet = get_facenet()
    if facenet is None:
        model_paths = get_loaded_model_paths()
        return jsonify({
            'error': 'FaceNet model not loaded',
            'details': 'Ensure FACENET model file exists in MODELS_DIR and restart ai-service',
            'model_paths': model_paths,
        }), 503

    face_input = preprocess_for_facenet(face_crop)
    try:
        embedding = _run_facenet_embedding(facenet, face_input)
    except Exception as exc:
        return jsonify({'error': f'Face embedding inference failed: {exc}'}), 500
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = embedding / norm  # L2 normalise

    stored = load_embedding(user_id)

    if stored is None:
        baseline_embedding, baseline_error = _load_registered_baseline_embedding(user_id, facenet)
        if baseline_embedding is None:
            return jsonify({"error": f"Unable to load registered face baseline: {baseline_error}"}), 422
        stored = baseline_embedding

    confidence = max(0.0, min(1.0, cosine_similarity(embedding, stored)))
    match = confidence >= _THRESHOLD

    backend_persisted = None
    backend_persist_error = None
    if session_id is not None:
        ok, details = _persist_verification(int(session_id), bool(match), float(confidence))
        backend_persisted = ok
        if not ok:
            backend_persist_error = details

    return jsonify({
        'match': bool(match),
        'confidence': round(float(confidence), 4),
        'threshold': _THRESHOLD,
        'registered': True,
        'backend_persisted': backend_persisted,
        'backend_persist_error': backend_persist_error,
    }), 200
