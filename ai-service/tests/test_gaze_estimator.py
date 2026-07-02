import pytest
import numpy as np
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services import gaze_estimator


class _FakeGazeSession:
    def __init__(self, logits):
        self._logits = logits

    def run(self, output_names, feeds):
        assert output_names == ['gaze_logits']
        assert 'eye_image' in feeds
        assert feeds['eye_image'].shape == (1, 1, 36, 60)
        return [np.array([self._logits], dtype=np.float32)]


def test_estimate_gaze_no_face_returns_none(monkeypatch):
    monkeypatch.setattr(gaze_estimator, 'normalize_eye_patch', lambda img: None)
    result = gaze_estimator.estimate_gaze(np.zeros((10, 10, 3), dtype=np.uint8))
    assert result is None


def test_estimate_gaze_model_unavailable_falls_back(monkeypatch):
    eye = np.zeros((36, 60, 3), dtype=np.uint8)
    monkeypatch.setattr(gaze_estimator, 'normalize_eye_patch', lambda img: eye)
    monkeypatch.setattr(gaze_estimator, 'get_gaze_model', lambda: None)

    result = gaze_estimator.estimate_gaze(np.zeros((10, 10, 3), dtype=np.uint8))

    assert result == {'direction': 'Screen', 'confidence': 0.0, 'model_available': False}


@pytest.mark.parametrize("class_idx,expected_direction", [
    (0, 'Screen'),
    (1, 'Down'),
    (2, 'Left'),
    (3, 'Right'),
    (4, 'Up'),
])
def test_estimate_gaze_maps_class_index_to_direction(monkeypatch, class_idx, expected_direction):
    eye = np.zeros((36, 60, 3), dtype=np.uint8)
    logits = [-5.0] * 5
    logits[class_idx] = 5.0

    monkeypatch.setattr(gaze_estimator, 'normalize_eye_patch', lambda img: eye)
    monkeypatch.setattr(gaze_estimator, 'get_gaze_model', lambda: _FakeGazeSession(logits))

    result = gaze_estimator.estimate_gaze(np.zeros((10, 10, 3), dtype=np.uint8))

    assert result['direction'] == expected_direction
    assert result['model_available'] is True
    assert 0.0 <= result['confidence'] <= 1.0
