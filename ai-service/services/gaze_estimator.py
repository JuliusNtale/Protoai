import numpy as np
from services.preprocessing import preprocess_for_gaze_model
from services.gaze_normalization import normalize_eye_patch
from services.model_loader import get_gaze_model

# Model class order per trained_model_exports/checkpoints/README_HANDOFF.md:
# 0=Center, 1=Down, 2=Left, 3=Right, 4=Up. 'Center' is renamed 'Screen' here
# since frame_handler.py/monitor.py compare direction != 'Screen'.
GAZE_CLASSES = ['Screen', 'Down', 'Left', 'Right', 'Up']


def _softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - np.max(x))
    return e / e.sum()


def estimate_gaze(img_bgr: np.ndarray):
    """
    Classify gaze direction from a full frame.
    Returns dict {direction, confidence, model_available} or None if no face detected.
    Falls back gracefully when the ONNX model is not yet loaded.
    """
    gaze_model = get_gaze_model()

    eye_crop = normalize_eye_patch(img_bgr)
    if eye_crop is None:
        return None

    if gaze_model is None:
        return {'direction': 'Screen', 'confidence': 0.0, 'model_available': False}

    eye_input = preprocess_for_gaze_model(eye_crop)
    logits = gaze_model.run(['gaze_logits'], {'eye_image': eye_input})[0][0]
    probs = _softmax(logits)
    class_idx = int(np.argmax(probs))

    return {
        'direction': GAZE_CLASSES[class_idx],
        'confidence': round(float(probs[class_idx]), 4),
        'model_available': True,
    }
