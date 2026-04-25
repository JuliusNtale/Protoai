import threading
import requests
import os

from flask_socketio import SocketIO, emit

from services.preprocessing import base64_to_numpy
from services.gaze_estimator import estimate_gaze
from services.head_pose import estimate_head_pose
from services.face_detector import count_faces

_BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5000')

# Per-session warning counts cached in memory.
# Derick's DB is the authoritative store; this is a fast local cache.
_warning_counts: dict = {}
_lock = threading.Lock()


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

        # Forward each anomaly to Derick's backend and track the returned warning_count
        for anomaly in anomalies:
            try:
                resp = requests.post(
                    f"{_BACKEND_URL}/api/sessions/log",
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
            except requests.exceptions.RequestException:
                pass  # Backend unreachable — don't crash the WebSocket handler

        with _lock:
            _warning_counts[session_id] = warning_count

        gaze_direction = gaze.get('direction', 'Unknown') if gaze else 'Unknown'

        emit('anomaly_result', {
            'session_id':     session_id,
            'anomalies':      anomalies,
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
