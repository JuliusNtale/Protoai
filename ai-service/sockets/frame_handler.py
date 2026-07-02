import threading
import requests
import os
import time

from flask_socketio import SocketIO, emit

from services.preprocessing import base64_to_numpy
from services.gaze_estimator import estimate_gaze
from services.head_pose import estimate_head_pose
from services.face_detector import count_faces

_BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5000')
_AI_SERVICE_TOKEN = os.getenv('AI_SERVICE_TOKEN', '').strip()

# Per-session warning counts cached in memory.
# Derick's DB is the authoritative store; this is a fast local cache.
_warning_counts: dict = {}
_anomaly_states: dict = {}
_lock = threading.Lock()

_ANOMALY_SECONDS = {
    'gaze_away': float(os.getenv('GAZE_AWAY_SECONDS', '5')),
    'head_turned': float(os.getenv('HEAD_TURNED_SECONDS', '3')),
    'face_absent': float(os.getenv('FACE_ABSENT_SECONDS', os.getenv('GAZE_AWAY_SECONDS', '5'))),
    'multiple_faces': float(os.getenv('MULTIPLE_FACES_SECONDS', '3')),
}
_WARNING_COOLDOWN_SECONDS = float(os.getenv('WARNING_COOLDOWN_SECONDS', '15'))


def _confirmed_anomalies(session_id, current_anomalies):
    """Return anomalies that have persisted long enough to count as warnings."""
    now = time.monotonic()
    current = set(current_anomalies)

    with _lock:
        session_state = _anomaly_states.setdefault(session_id, {})

        for anomaly in list(session_state):
            if anomaly not in current:
                del session_state[anomaly]

        confirmed = []
        for anomaly in current:
            state = session_state.setdefault(
                anomaly,
                {'started_at': now, 'last_logged_at': 0.0},
            )
            required_seconds = _ANOMALY_SECONDS.get(anomaly, 3.0)
            persisted = now - state['started_at']
            cooled_down = now - state['last_logged_at']
            if persisted >= required_seconds and cooled_down >= _WARNING_COOLDOWN_SECONDS:
                state['last_logged_at'] = now
                confirmed.append(anomaly)

    return confirmed


def register_handlers(socketio: SocketIO):

    @socketio.on('webcam_frame')
    def handle_frame(data):
        session_id = data.get('session_id')
        frame_base64 = data.get('frame_base64')

        if not session_id or not frame_base64:
            return

        try:
            img_bgr = base64_to_numpy(frame_base64)
        except Exception:
            return

        # Run all analysis concurrently
        gaze_result = [None]
        pose_result = [None]
        face_count  = [0]

        def run_gaze():
            gaze_result[0] = estimate_gaze(img_bgr)

        def run_pose():
            pose_result[0] = estimate_head_pose(img_bgr)

        def run_count():
            face_count[0] = count_faces(img_bgr)

        t1 = threading.Thread(target=run_gaze)
        t2 = threading.Thread(target=run_pose)
        t3 = threading.Thread(target=run_count)
        t1.start(); t2.start(); t3.start()
        t1.join();  t2.join();  t3.join()

        gaze = gaze_result[0]
        pose = pose_result[0]

        print(
            f"[gaze_debug] session={session_id} "
            f"direction={gaze.get('direction') if gaze else None} "
            f"confidence={gaze.get('confidence') if gaze else None} "
            f"model_available={gaze.get('model_available') if gaze else None} "
            f"face_count={face_count[0]}"
        )

        anomalies = []
        if gaze is None or face_count[0] == 0:
            anomalies.append('face_absent')
        elif gaze.get('direction') != 'Screen':
            anomalies.append('gaze_away')

        if pose is not None and pose.get('alert'):
            anomalies.append('head_turned')

        if face_count[0] > 1:
            anomalies.append('multiple_faces')

        with _lock:
            warning_count = _warning_counts.get(session_id, 0)

        confirmed_anomalies = _confirmed_anomalies(session_id, anomalies)

        # Forward confirmed anomalies to Derick's backend and track the returned warning_count
        headers = {'X-Internal-Token': _AI_SERVICE_TOKEN} if _AI_SERVICE_TOKEN else None
        for anomaly in confirmed_anomalies:
            try:
                resp = requests.post(
                    f"{_BACKEND_URL}/api/sessions/log",
                    headers=headers,
                    json={
                        'session_id': session_id,
                        'event_type': anomaly,
                        'event_data': {
                            'gaze_direction': gaze.get('direction') if gaze else None,
                            'yaw':   pose.get('yaw')   if pose else None,
                            'pitch': pose.get('pitch') if pose else None,
                        },
                    },
                    timeout=2,
                )
                if resp.ok:
                    warning_count = resp.json().get('warning_count', warning_count)
                else:
                    print(
                        f"[frame_handler] backend rejected anomaly log "
                        f"session={session_id} event={anomaly} status={resp.status_code}"
                    )
            except requests.exceptions.RequestException:
                pass  # Backend unreachable — don't crash the WebSocket handler

        with _lock:
            _warning_counts[session_id] = warning_count

        gaze_direction = gaze.get('direction', 'Unknown') if gaze else 'Unknown'

        emit('anomaly_result', {
            'session_id':     session_id,
            'anomalies':      anomalies,
            'confirmed_anomalies': confirmed_anomalies,
            'warning_count':  warning_count,
            'gaze_direction': gaze_direction,
        })

        if warning_count >= 3:
            emit('session_locked', {
                'session_id': session_id,
                'reason': 'warning_count_exceeded',
            })

    @socketio.on('connect')
    def handle_connect():
        pass  # Connection accepted; no special setup needed

    @socketio.on('disconnect')
    def handle_disconnect():
        pass  # Warning state naturally expires; no cleanup needed
