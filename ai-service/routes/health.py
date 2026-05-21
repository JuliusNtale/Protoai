from flask import Blueprint, jsonify
from services.model_loader import get_facenet, get_l2cs, get_loaded_model_paths

health_bp = Blueprint('health', __name__)


@health_bp.route('/health', methods=['GET'])
def health():
    facenet_loaded = get_facenet() is not None
    l2cs_loaded = get_l2cs() is not None
    model_paths = get_loaded_model_paths()
    return jsonify({
        'status': 'ok',
        'models_loaded': {
            'facenet': facenet_loaded,
            'l2cs': l2cs_loaded,
        },
        'model_paths': model_paths,
    }), 200
