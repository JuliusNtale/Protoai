import os
from flask import Blueprint, jsonify

health_bp = Blueprint('health', __name__)


@health_bp.route('/health', methods=['GET'])
def health():
    models_dir = os.getenv('MODELS_DIR', './models')
    facenet_loaded = os.path.exists(os.path.join(models_dir, 'facenet_best.onnx'))
    l2cs_loaded = os.path.exists(os.path.join(models_dir, 'l2cs_net.onnx'))
    return jsonify({
        'status': 'ok',
        'models_loaded': {
            'facenet': facenet_loaded,
            'l2cs': l2cs_loaded,
        },
    }), 200
