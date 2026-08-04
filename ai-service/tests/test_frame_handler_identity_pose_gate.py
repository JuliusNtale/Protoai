import sys
import os
import base64

import cv2
import numpy as np
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import app, socketio
import sockets.frame_handler as fh


def _dummy_frame_base64():
    img = np.zeros((240, 320, 3), dtype=np.uint8)
    ok, buf = cv2.imencode('.jpg', img)
    assert ok
    return base64.b64encode(buf.tobytes()).decode('ascii')


@pytest.fixture
def socket_client(monkeypatch):
    fh._anomaly_states.clear()
    fh._warning_counts.clear()
    fh._baseline_pose.clear()
    fh._gaze_calibration.clear()
    fh._identity_check_state.clear()
    fh._session_student_id.clear()
    app.config['TESTING'] = True
    client = socketio.test_client(app)
    yield client
    client.disconnect()


def _calibrate(client, session_id, frame_base64):
    """Run a session through calibration with a neutral, on-screen gaze so
    post-calibration frames are judged against a sane baseline."""
    for _ in range(fh._HEAD_POSE_CALIBRATION_FRAMES):
        client.emit('webcam_frame', {'session_id': session_id, 'frame_base64': frame_base64})
        client.get_received()


def test_identity_check_skipped_when_gaze_is_away(monkeypatch, socket_client):
    """A face turned away from the camera produces genuinely unreliable
    FaceNet embeddings against the frontal baseline - confirmed in
    production, this used to let a plain "looked away" get reported to the
    lecturer as "Identity Mismatch Detected" instead of gaze_away. The
    identity check must not even run on these frames."""
    calls = []
    monkeypatch.setattr(fh, '_check_identity_mismatch', lambda session_id, img: calls.append(session_id) or (False, None))
    monkeypatch.setattr(fh, 'estimate_head_pose', lambda img: {'yaw': -2.0, 'pitch': -10.0, 'roll': 0.0, 'alert': False})
    monkeypatch.setattr(fh, 'count_faces', lambda img: 1)

    frame_base64 = _dummy_frame_base64()
    session_id = 'gaze-away-session'

    monkeypatch.setattr(fh, 'estimate_gaze', lambda img: {'direction': 'Screen', 'confidence': 0.95, 'model_available': True})
    _calibrate(socket_client, session_id, frame_base64)
    assert calls == []  # nothing runs identity checks during calibration anyway

    monkeypatch.setattr(fh, 'estimate_gaze', lambda img: {'direction': 'Down', 'confidence': 0.95, 'model_available': True})
    socket_client.emit('webcam_frame', {'session_id': session_id, 'frame_base64': frame_base64})
    socket_client.get_received()

    assert calls == []


def test_identity_check_skipped_when_head_is_turned(monkeypatch, socket_client):
    """Same failure mode as the gaze-away case, but for a turned head -
    should be attributed to head_turned, never identity_mismatch."""
    calls = []
    monkeypatch.setattr(fh, '_check_identity_mismatch', lambda session_id, img: calls.append(session_id) or (False, None))
    monkeypatch.setattr(fh, 'count_faces', lambda img: 1)
    monkeypatch.setattr(fh, 'estimate_gaze', lambda img: {'direction': 'Screen', 'confidence': 0.95, 'model_available': True})

    frame_base64 = _dummy_frame_base64()
    session_id = 'head-turned-session'

    monkeypatch.setattr(fh, 'estimate_head_pose', lambda img: {'yaw': -2.0, 'pitch': -10.0, 'roll': 0.0, 'alert': False})
    _calibrate(socket_client, session_id, frame_base64)
    assert calls == []

    monkeypatch.setattr(fh, 'estimate_head_pose', lambda img: {'yaw': 45.0, 'pitch': -10.0, 'roll': 0.0, 'alert': True})
    socket_client.emit('webcam_frame', {'session_id': session_id, 'frame_base64': frame_base64})
    socket_client.get_received()

    assert calls == []


def test_identity_check_still_runs_for_a_normal_frontal_frame(monkeypatch, socket_client):
    """Regression guard: a student looking normally at the screen, post
    calibration, must still get the periodic identity recheck exactly as
    before this fix."""
    calls = []
    monkeypatch.setattr(fh, '_check_identity_mismatch', lambda session_id, img: calls.append(session_id) or (False, None))
    monkeypatch.setattr(fh, 'estimate_head_pose', lambda img: {'yaw': -2.0, 'pitch': -10.0, 'roll': 0.0, 'alert': False})
    monkeypatch.setattr(fh, 'count_faces', lambda img: 1)
    monkeypatch.setattr(fh, 'estimate_gaze', lambda img: {'direction': 'Screen', 'confidence': 0.95, 'model_available': True})

    frame_base64 = _dummy_frame_base64()
    session_id = 'normal-session'
    _calibrate(socket_client, session_id, frame_base64)
    assert calls == []

    socket_client.emit('webcam_frame', {'session_id': session_id, 'frame_base64': frame_base64})
    socket_client.get_received()

    assert calls == [session_id]


def test_identity_check_skips_low_confidence_face_detection(monkeypatch):
    """A partially-occluded or low-confidence face detection (e.g. a hand
    partly covering the camera) shouldn't be trusted for identity
    comparison either - same unreliable-embedding problem as an off-angle
    face, just from a different cause."""
    fh._identity_check_state.clear()
    fh._session_student_id.clear()
    monkeypatch.setattr(fh, '_resolve_student_id', lambda session_id: 42)
    monkeypatch.setattr(fh, 'get_facenet', lambda: object())
    monkeypatch.setattr(
        fh, 'detect_and_crop_face',
        lambda img: (np.zeros((10, 10, 3), dtype=np.uint8), 0.5),
    )

    img = np.zeros((240, 320, 3), dtype=np.uint8)
    confirmed, confidence = fh._check_identity_mismatch('low-confidence-session', img)

    assert confirmed is False
    assert confidence is None
