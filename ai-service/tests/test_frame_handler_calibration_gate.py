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
    fh._identity_check_state.clear()
    fh._session_student_id.clear()
    # Avoid real network calls to the backend for the identity re-check path;
    # it's covered separately in test_frame_handler_debounce.py.
    monkeypatch.setattr(fh, '_resolve_student_id', lambda session_id: None)
    app.config['TESTING'] = True
    client = socketio.test_client(app)
    yield client
    client.disconnect()


def _get_anomaly_result(client):
    received = client.get_received()
    return next(e for e in received if e['name'] == 'anomaly_result')['args'][0]


def test_no_anomaly_tracked_while_still_calibrating(monkeypatch, socket_client):
    """A student glancing away while the camera is still calibrating its
    head-pose baseline ('Setting Up Monitoring' on the frontend) must not
    accumulate toward a warning - that phase exists precisely so monitoring
    hasn't started judging them yet."""
    monkeypatch.setattr(fh, 'estimate_gaze', lambda img: {'direction': 'Down', 'confidence': 0.95, 'model_available': True})
    monkeypatch.setattr(fh, 'estimate_head_pose', lambda img: {'yaw': -2.0, 'pitch': -10.0, 'roll': 0.0, 'alert': False})
    monkeypatch.setattr(fh, 'count_faces', lambda img: 1)

    frame_base64 = _dummy_frame_base64()
    session_id = 'calib-session'

    for _ in range(fh._HEAD_POSE_CALIBRATION_FRAMES):
        socket_client.emit('webcam_frame', {'session_id': session_id, 'frame_base64': frame_base64})
        payload = _get_anomaly_result(socket_client)
        assert payload['calibrating'] is True
        assert payload['anomalies'] == []
        assert payload['confirmed_anomalies'] == []
        assert payload['warning_count'] == 0


def test_anomaly_tracking_resumes_once_calibration_is_done(monkeypatch, socket_client):
    """Once calibration has actually finished, a genuinely sustained
    away-gaze reading should be tracked (and eventually confirmed) exactly
    as before this fix."""
    monkeypatch.setattr(fh, 'estimate_gaze', lambda img: {'direction': 'Down', 'confidence': 0.95, 'model_available': True})
    monkeypatch.setattr(fh, 'estimate_head_pose', lambda img: {'yaw': -2.0, 'pitch': -10.0, 'roll': 0.0, 'alert': False})
    monkeypatch.setattr(fh, 'count_faces', lambda img: 1)

    frame_base64 = _dummy_frame_base64()
    session_id = 'post-calib-session'

    for _ in range(fh._HEAD_POSE_CALIBRATION_FRAMES):
        socket_client.emit('webcam_frame', {'session_id': session_id, 'frame_base64': frame_base64})
        socket_client.get_received()

    socket_client.emit('webcam_frame', {'session_id': session_id, 'frame_base64': frame_base64})
    payload = _get_anomaly_result(socket_client)
    assert payload['calibrating'] is False
    assert 'gaze_away' in payload['anomalies']
