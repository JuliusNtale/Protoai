from flask import Blueprint, jsonify
from services.model_loader import get_facenet, get_gaze_model, get_loaded_model_paths

health_bp = Blueprint('health', __name__)


@health_bp.route('/health', methods=['GET'])
def health():
    facenet_loaded = get_facenet() is not None
    gaze_loaded = get_gaze_model() is not None
    model_paths = get_loaded_model_paths()
    return jsonify({
        'status': 'ok',
        'models_loaded': {
            'facenet': facenet_loaded,
            'gaze': gaze_loaded,
        },
        'model_paths': model_paths,
    }), 200
