import onnxruntime as ort
import os

_facenet_session = None
_gaze_session = None
_facenet_path_loaded = None
_gaze_path_loaded = None


def _resolve_candidate_paths(models_dir: str, primary_name: str, fallbacks: list[str]) -> list[str]:
    names = [primary_name] + [name for name in fallbacks if name and name != primary_name]
    return [os.path.join(models_dir, name) for name in names]


def load_models():
    global _facenet_session, _gaze_session, _facenet_path_loaded, _gaze_path_loaded

    models_dir = os.getenv('MODELS_DIR', './models')
    facenet_name = os.getenv('FACENET_MODEL_VERSION', 'facenet_best.onnx')
    gaze_name = os.getenv('GAZE_MODEL_VERSION', 'gaze_model.onnx')

    facenet_candidates = _resolve_candidate_paths(
        models_dir,
        facenet_name,
        ['facenet_best.onnx', 'facenet.onnx', 'facenet512.onnx'],
    )
    gaze_candidates = _resolve_candidate_paths(
        models_dir,
        gaze_name,
        ['gaze_model.onnx'],
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

    _gaze_session = None
    _gaze_path_loaded = None
    for gaze_path in gaze_candidates:
        if os.path.exists(gaze_path):
            _gaze_session = ort.InferenceSession(gaze_path)
            _gaze_path_loaded = gaze_path
            print(f"[model_loader] Gaze model loaded from {gaze_path}")
            break
    if _gaze_session is None:
        print(f"[model_loader] WARNING: Gaze model not found. Checked: {gaze_candidates}")


def get_facenet():
    if _facenet_session is None:
        load_models()
    return _facenet_session


def get_gaze_model():
    if _gaze_session is None:
        load_models()
    return _gaze_session


def get_loaded_model_paths():
    return {
        'facenet': _facenet_path_loaded,
        'gaze': _gaze_path_loaded,
    }
