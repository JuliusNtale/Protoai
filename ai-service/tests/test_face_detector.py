import numpy as np
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services.face_detector import detect_and_crop_face, count_faces


def test_detect_and_crop_face_returns_none_for_blank_image():
    blank = np.zeros((480, 640, 3), dtype=np.uint8)
    face_crop, confidence = detect_and_crop_face(blank)
    assert face_crop is None
    assert confidence == 0.0


def test_count_faces_returns_zero_for_blank_image():
    blank = np.zeros((480, 640, 3), dtype=np.uint8)
    assert count_faces(blank) == 0
