import os
from flask import Blueprint, request, jsonify
import requests

from services.preprocessing import base64_to_numpy
from services.face_detector import detect_and_crop_face
from services.model_loader import get_facenet, get_loaded_model_paths
from services.identity_verifier import match_face_crop_to_baseline

verify_bp = Blueprint('verify', __name__)

_THRESHOLD = float(os.getenv('FACE_SIMILARITY_THRESHOLD', '0.6'))
_BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000").rstrip("/")
_AI_SERVICE_TOKEN = os.getenv("AI_SERVICE_TOKEN", "").strip()
_MODEL_VERSION = os.getenv("FACENET_MODEL_VERSION", "facenet_best.onnx")


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

    try:
        match, confidence, error = match_face_crop_to_baseline(face_crop, user_id, facenet)
    except Exception as exc:
        return jsonify({'error': f'Face embedding inference failed: {exc}'}), 500

    if match is None:
        return jsonify({"error": f"Unable to load registered face baseline: {error}"}), 422

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
