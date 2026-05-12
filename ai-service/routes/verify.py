import os
import numpy as np
from flask import Blueprint, request, jsonify
import requests

from services.preprocessing import base64_to_numpy, preprocess_for_facenet
from services.face_detector import detect_and_crop_face
from services.embedding_store import load_embedding, save_embedding, cosine_similarity
from services.model_loader import get_facenet

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
        return jsonify({'error': 'FaceNet model not loaded'}), 503

    face_input = preprocess_for_facenet(face_crop)
    embedding = facenet.run(['embedding'], {'input': face_input})[0][0]
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = embedding / norm  # L2 normalise

    stored = load_embedding(user_id)

    if stored is None:
        # First call for this user — register their embedding
        save_embedding(user_id, embedding)
        if session_id is not None:
            _persist_verification(int(session_id), True, 1.0)
        return jsonify({'match': True, 'confidence': 1.0, 'registered': True}), 200

    confidence = cosine_similarity(embedding, stored)
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
        'backend_persisted': backend_persisted,
        'backend_persist_error': backend_persist_error,
    }), 200
