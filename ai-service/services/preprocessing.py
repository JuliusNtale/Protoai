import base64
import numpy as np
import cv2


def base64_to_numpy(b64_string: str) -> np.ndarray:
    """Decode base64 JPEG/PNG string to numpy array (H, W, 3) BGR uint8."""
    # Strip data URI prefix if present (e.g. "data:image/jpeg;base64,...")
    if ',' in b64_string:
        b64_string = b64_string.split(',', 1)[1]
    img_bytes = base64.b64decode(b64_string)
    np_arr = np.frombuffer(img_bytes, dtype=np.uint8)
    img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise ValueError("Failed to decode image from base64")
    return img_bgr


def preprocess_for_facenet(face_bgr: np.ndarray) -> np.ndarray:
    """
    Resize to 160x160, convert BGR→RGB, normalize to [-1, 1].
    Returns float32 array of shape (1, 3, 160, 160).
    Matches facenet-pytorch normalization used during Beckham's training.
    """
    face_rgb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB)
    face_resized = cv2.resize(face_rgb, (160, 160))
    face_float = face_resized.astype(np.float32) / 255.0
    face_normalized = (face_float - 0.5) / 0.5  # → [-1, 1]
    return np.transpose(face_normalized, (2, 0, 1))[np.newaxis, :]  # HWC → NCHW


def preprocess_for_l2cs(face_bgr: np.ndarray) -> np.ndarray:
    """
    Resize to 224x224, convert BGR→RGB, apply ImageNet mean/std normalization.
    Returns float32 array of shape (1, 3, 224, 224).
    Matches torchvision normalization used during Beckham's training.
    """
    face_rgb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB)
    face_resized = cv2.resize(face_rgb, (224, 224))
    face_float = face_resized.astype(np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    face_normalized = (face_float - mean) / std
    return np.transpose(face_normalized, (2, 0, 1))[np.newaxis, :]  # HWC → NCHW
