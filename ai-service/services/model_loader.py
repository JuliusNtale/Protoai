import onnxruntime as ort
import os

_facenet_session = None
_l2cs_session = None
_facenet_path_loaded = None
_l2cs_path_loaded = None


def _resolve_candidate_paths(models_dir: str, primary_name: str, fallbacks: list[str]) -> list[str]:
    names = [primary_name] + [name for name in fallbacks if name and name != primary_name]
    return [os.path.join(models_dir, name) for name in names]


def load_models():
    global _facenet_session, _l2cs_session, _facenet_path_loaded, _l2cs_path_loaded

    models_dir = os.getenv('MODELS_DIR', './models')
    facenet_name = os.getenv('FACENET_MODEL_VERSION', 'facenet_best.onnx')
    l2cs_name = os.getenv('L2CS_MODEL_VERSION', 'l2cs_net.onnx')

    facenet_candidates = _resolve_candidate_paths(
        models_dir,
        facenet_name,
        ['facenet_best.onnx', 'facenet.onnx', 'facenet512.onnx'],
    )
    l2cs_candidates = _resolve_candidate_paths(
        models_dir,
        l2cs_name,
        ['l2cs_net.onnx'],
    )

    _facenet_session = None
    _facenet_path_loaded = None
    for facenet_path in facenet_candidates:
        if os.path.exists(facenet_path):
            _facenet_session = ort.InferenceSession(facenet_path)
            _facenet_path_loaded = facenet_path
            print(f"[model_loader] FaceNet loaded from {facenet_path}")
            break
    if _facenet_session is None:
        print(f"[model_loader] WARNING: FaceNet not found. Checked: {facenet_candidates}")

    _l2cs_session = None
    _l2cs_path_loaded = None
    for l2cs_path in l2cs_candidates:
        if os.path.exists(l2cs_path):
            _l2cs_session = ort.InferenceSession(l2cs_path)
            _l2cs_path_loaded = l2cs_path
            print(f"[model_loader] L2CS-Net loaded from {l2cs_path}")
            break
    if _l2cs_session is None:
        print(f"[model_loader] WARNING: L2CS-Net not found. Checked: {l2cs_candidates}")


def get_facenet():
    if _facenet_session is None:
        load_models()
    return _facenet_session


def get_l2cs():
    if _l2cs_session is None:
        load_models()
    return _l2cs_session


def get_loaded_model_paths():
    return {
        'facenet': _facenet_path_loaded,
        'l2cs': _l2cs_path_loaded,
    }
