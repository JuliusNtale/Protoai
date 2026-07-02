import numpy as np
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services.gaze_normalization import normalize_eye_patch


def test_normalize_eye_patch_returns_none_for_blank_image():
    blank = np.zeros((480, 640, 3), dtype=np.uint8)
    assert normalize_eye_patch(blank) is None


def test_normalize_eye_patch_returns_none_for_tiny_image():
    tiny = np.zeros((10, 10, 3), dtype=np.uint8)
    assert normalize_eye_patch(tiny) is None
