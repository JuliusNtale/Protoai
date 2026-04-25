import pytest
import numpy as np
import base64
import cv2
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services.preprocessing import base64_to_numpy, preprocess_for_facenet, preprocess_for_l2cs


def _make_b64_image(h=480, w=640):
    """Create a random BGR image encoded as base64 JPEG."""
    img = np.random.randint(0, 255, (h, w, 3), dtype=np.uint8)
    _, buf = cv2.imencode('.jpg', img)
    return base64.b64encode(buf).decode('utf-8')


def test_base64_to_numpy_shape():
    b64 = _make_b64_image()
    arr = base64_to_numpy(b64)
    assert arr.shape == (480, 640, 3)
    assert arr.dtype == np.uint8


def test_base64_to_numpy_strips_data_uri():
    b64 = 'data:image/jpeg;base64,' + _make_b64_image()
    arr = base64_to_numpy(b64)
    assert arr is not None


def test_preprocess_for_facenet_shape():
    face = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
    out = preprocess_for_facenet(face)
    assert out.shape == (1, 3, 160, 160)
    assert out.dtype == np.float32


def test_preprocess_for_facenet_range():
    face = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
    out = preprocess_for_facenet(face)
    assert out.min() >= -1.0 - 1e-5
    assert out.max() <= 1.0 + 1e-5


def test_preprocess_for_l2cs_shape():
    face = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
    out = preprocess_for_l2cs(face)
    assert out.shape == (1, 3, 224, 224)
    assert out.dtype == np.float32
