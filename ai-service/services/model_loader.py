import onnxruntime as ort
import os

_facenet_session = None
_l2cs_session = None


def load_models():
    global _facenet_session, _l2cs_session

    models_dir = os.getenv('MODELS_DIR', './models')
    facenet_path = os.path.join(models_dir, 'facenet_best.onnx')
    l2cs_path = os.path.join(models_dir, 'l2cs_net.onnx')

    if os.path.exists(facenet_path):
        _facenet_session = ort.InferenceSession(facenet_path)
        print(f"[model_loader] FaceNet loaded from {facenet_path}")
    else:
        print(f"[model_loader] WARNING: FaceNet not found at {facenet_path}")

    if os.path.exists(l2cs_path):
        _l2cs_session = ort.InferenceSession(l2cs_path)
        print(f"[model_loader] L2CS-Net loaded from {l2cs_path}")
    else:
        print(f"[model_loader] WARNING: L2CS-Net not found at {l2cs_path}")


def get_facenet():
    return _facenet_session


def get_l2cs():
    return _l2cs_session
