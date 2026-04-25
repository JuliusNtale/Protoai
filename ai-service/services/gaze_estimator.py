import numpy as np
from services.preprocessing import preprocess_for_l2cs
from services.face_detector import detect_and_crop_face
from services.model_loader import get_l2cs

GAZE_CLASSES = ['Screen', 'Left', 'Right', 'Up', 'Down']


def _softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - np.max(x))
    return e / e.sum()


def estimate_gaze(img_bgr: np.ndarray):
    """
    Classify gaze direction from a full frame.
    Returns dict {direction, confidence, model_available} or None if no face detected.
    Falls back gracefully when the ONNX model is not yet loaded.
    """
    l2cs = get_l2cs()

    face_crop, _ = detect_and_crop_face(img_bgr)
    if face_crop is None:
        return None

    if l2cs is None:
        return {'direction': 'Screen', 'confidence': 0.0, 'model_available': False}

    face_input = preprocess_for_l2cs(face_crop)
    logits = l2cs.run(['gaze_logits'], {'input': face_input})[0][0]
    probs = _softmax(logits)
    class_idx = int(np.argmax(probs))

    return {
        'direction': GAZE_CLASSES[class_idx],
        'confidence': round(float(probs[class_idx]), 4),
        'model_available': True,
    }
