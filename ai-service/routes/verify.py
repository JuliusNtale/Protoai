import os
import numpy as np
from flask import Blueprint, request, jsonify

from services.preprocessing import base64_to_numpy, preprocess_for_facenet
from services.face_detector import detect_and_crop_face
from services.embedding_store import load_embedding, save_embedding, cosine_similarity
from services.model_loader import get_facenet

verify_bp = Blueprint('verify', __name__)

_THRESHOLD = float(os.getenv('FACE_SIMILARITY_THRESHOLD', '0.6'))


@verify_bp.route('/verify-identity', methods=['POST'])
def verify_identity():
    data = request.get_json(silent=True)

    if not data or 'user_id' not in data or 'image_base64' not in data:
        return jsonify({'error': 'Missing user_id or image_base64'}), 400

    user_id = int(data['user_id'])

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
        return jsonify({'match': True, 'confidence': 1.0, 'registered': True}), 200

    confidence = cosine_similarity(embedding, stored)
    match = confidence >= _THRESHOLD

    return jsonify({
        'match': bool(match),
        'confidence': round(float(confidence), 4),
    }), 200
