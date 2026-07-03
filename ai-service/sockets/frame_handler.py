import threading
import requests
import os
import time

from flask_socketio import SocketIO, emit

from services.preprocessing import base64_to_numpy
from services.gaze_estimator import estimate_gaze
from services.head_pose import estimate_head_pose, _YAW_THRESHOLD, _PITCH_THRESHOLD
from services.face_detector import count_faces, detect_and_crop_face
from services.model_loader import get_facenet
from services.identity_verifier import match_face_crop_to_baseline

_BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5000')
_AI_SERVICE_TOKEN = os.getenv('AI_SERVICE_TOKEN', '').strip()

# Per-session warning counts cached in memory.
# Derick's DB is the authoritative store; this is a fast local cache.
_warning_counts: dict = {}
_anomaly_states: dict = {}
_baseline_pose: dict = {}
_session_student_id: dict = {}
_identity_check_state: dict = {}
_lock = threading.Lock()

# How often to re-run the (comparatively expensive) FaceNet identity check
# against the registered baseline during the exam, and how many CONSECUTIVE
# mismatched checks are required before treating it as a confirmed impostor.
# This is the check that catches someone swapping in mid-exam without ever
# leaving/reloading the /exam page (the one-time /verify-identity call and
# the page-load /status guard only cover entry, not the middle of a session).
_IDENTITY_RECHECK_SECONDS = float(os.getenv('IDENTITY_RECHECK_SECONDS', '8'))
_IDENTITY_MISMATCH_CONFIRM_COUNT = int(os.getenv('IDENTITY_MISMATCH_CONFIRM_COUNT', '2'))

# Number of frames at the start of a session used to calibrate that
# student's own neutral head pose, before any head_turned alert can fire.
# A fixed global yaw/pitch threshold doesn't work across different real
# camera/seating setups — live production data showed resting pitch varying
# from about -13 degrees to -43 degrees between two sessions with no real
# head movement, purely from camera angle/placement. Comparing against each
# session's own calibrated baseline instead (same idea as the environment/
# camera check most real proctoring systems run before the timed test
# starts) fixes that.
_HEAD_POSE_CALIBRATION_FRAMES = int(os.getenv('HEAD_POSE_CALIBRATION_FRAMES', '5'))

_ANOMALY_SECONDS = {
    'gaze_away': float(os.getenv('GAZE_AWAY_SECONDS', '2')),
    'head_turned': float(os.getenv('HEAD_TURNED_SECONDS', '2')),
    'face_absent': float(os.getenv('FACE_ABSENT_SECONDS', os.getenv('GAZE_AWAY_SECONDS', '2'))),
    'multiple_faces': float(os.getenv('MULTIPLE_FACES_SECONDS', '2')),
}
_WARNING_COOLDOWN_SECONDS = float(os.getenv('WARNING_COOLDOWN_SECONDS', '15'))

# Minimum gaze-model confidence before a non-Screen reading counts as a real
# anomaly at all. The model's confidence sits close to chance level (~0.2 for
# 5 classes) on low-quality frames, so low-confidence readings are treated as
# inconclusive rather than "away" — see the 2026-07-02 warning-escalation
# investigation.
_GAZE_CONFIDENCE_THRESHOLD = float(os.getenv('GAZE_CONFIDENCE_THRESHOLD', '0.4'))

# Directions that count as "looking away" for warning purposes. The model's
# own "Center" class (per trained_model_exports/checkpoints/label_config.json:
# pitch_center=-8.93, yaw_scale=7.21, center_thresh=0.85) is a narrow ~±6°
# yaw / ~±4° pitch cone — much narrower than the angle spanned by reading
# across a normal-sized monitor. Left/Right is expected, normal screen-reading
# behavior and is NOT treated as away; only Down/Up (looking away from the
# screen plane entirely, e.g. at a phone or notes) escalates.
_AWAY_DIRECTIONS = {'Down', 'Up'}


def _base_type(anomaly):
    """Strip the ':direction' qualifier some anomaly keys carry internally."""
    return anomaly.split(':', 1)[0]


def _calibrated_head_alert(session_id, pose):
    """
    Calibrate this session's neutral yaw/pitch from its first few frames,
    then flag head_turned based on DEVIATION from that baseline rather than
    an absolute global threshold. Returns (alert: bool, calibrating: bool).
    """
    with _lock:
        state = _baseline_pose.setdefault(
            session_id,
            {'yaw_samples': [], 'pitch_samples': [], 'baseline_yaw': None, 'baseline_pitch': None},
        )

        if state['baseline_yaw'] is None:
            state['yaw_samples'].append(pose['yaw'])
            state['pitch_samples'].append(pose['pitch'])
            if len(state['yaw_samples']) >= _HEAD_POSE_CALIBRATION_FRAMES:
                state['baseline_yaw'] = sum(state['yaw_samples']) / len(state['yaw_samples'])
                state['baseline_pitch'] = sum(state['pitch_samples']) / len(state['pitch_samples'])
            return False, True

        yaw_delta = pose['yaw'] - state['baseline_yaw']
        pitch_delta = pose['pitch'] - state['baseline_pitch']
        alert = abs(yaw_delta) > _YAW_THRESHOLD or abs(pitch_delta) > _PITCH_THRESHOLD
        return alert, False


def _confirmed_anomalies(session_id, current_anomalies):
    """Return anomalies that have persisted long enough to count as warnings.

    Anomaly keys may be direction-qualified (e.g. 'gaze_away:Right') so that
    the required persistence must be the SAME specific direction the whole
    time — flip-flopping between different wrong directions (a signature of
    model noise, not real gaze deviation) resets the timer instead of
    accumulating toward a warning.
    """
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
            required_seconds = _ANOMALY_SECONDS.get(_base_type(anomaly), 3.0)
            persisted = now - state['started_at']
            cooled_down = now - state['last_logged_at']
            if persisted >= required_seconds and cooled_down >= _WARNING_COOLDOWN_SECONDS:
                state['last_logged_at'] = now
                confirmed.append(anomaly)

    return confirmed


def _resolve_student_id(session_id):
    """Trusted session_id -> student_id lookup via the backend (never trust
    a client-supplied user_id here - see the internal endpoint's docstring
    for why that would defeat the whole check)."""
    with _lock:
        cached = _session_student_id.get(session_id)
    if cached is not None:
        return cached

    try:
        response = requests.get(
            f"{_BACKEND_URL}/api/sessions/internal/{session_id}",
            headers={'X-Internal-Token': _AI_SERVICE_TOKEN} if _AI_SERVICE_TOKEN else None,
            timeout=3,
        )
        if response.ok:
            student_id = response.json().get('student_id')
            if student_id is not None:
                with _lock:
                    _session_student_id[session_id] = student_id
                return student_id
    except requests.exceptions.RequestException:
        pass
    return None


def _check_identity_mismatch(session_id, img_bgr):
    """
    Periodically re-verify the current frame's face against the session's
    registered baseline, throttled to _IDENTITY_RECHECK_SECONDS since FaceNet
    inference is heavier than gaze/pose/count. Requires
    _IDENTITY_MISMATCH_CONFIRM_COUNT CONSECUTIVE mismatched checks (not one
    bad-angle/lighting frame) before reporting a confirmed mismatch — same
    confidence+persistence philosophy already used for gaze/head-pose
    anomalies, but here the consequence (immediate session lock) is severe
    enough that a lone bad frame must not be able to trigger it.

    Returns (confirmed: bool, confidence: float | None).
    """
    now = time.monotonic()
    with _lock:
        state = _identity_check_state.setdefault(
            session_id, {'last_check_at': 0.0, 'consecutive_mismatches': 0}
        )
        if now - state['last_check_at'] < _IDENTITY_RECHECK_SECONDS:
            return False, None
        state['last_check_at'] = now

    facenet = get_facenet()
    if facenet is None:
        return False, None

    student_id = _resolve_student_id(session_id)
    if student_id is None:
        return False, None

    face_crop, _ = detect_and_crop_face(img_bgr)
    if face_crop is None:
        return False, None

    try:
        match, confidence, error = match_face_crop_to_baseline(face_crop, student_id, facenet)
    except Exception:
        return False, None
    if match is None:
        print(f"[identity_debug] session={session_id} student_id={student_id} baseline unavailable: {error}", flush=True)
        return False, None

    print(
        f"[identity_debug] session={session_id} student_id={student_id} "
        f"match={match} confidence={confidence}",
        flush=True,
    )

    with _lock:
        state = _identity_check_state[session_id]
        if match:
            state['consecutive_mismatches'] = 0
            return False, confidence
        state['consecutive_mismatches'] += 1
        confirmed = state['consecutive_mismatches'] >= _IDENTITY_MISMATCH_CONFIRM_COUNT
        if confirmed:
            state['consecutive_mismatches'] = 0

    return confirmed, confidence


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

        # Only re-check identity when exactly one face is present - with zero
        # faces there's nothing to compare, and with multiple faces the
        # multiple_faces anomaly above already covers it and it's ambiguous
        # which face would even be compared.
        identity_mismatch_confirmed = False
        identity_confidence = None
        if face_count[0] == 1:
            identity_mismatch_confirmed, identity_confidence = _check_identity_mismatch(session_id, img_bgr)

        print(
            f"[gaze_debug] session={session_id} "
            f"direction={gaze.get('direction') if gaze else None} "
            f"confidence={gaze.get('confidence') if gaze else None} "
            f"model_available={gaze.get('model_available') if gaze else None} "
            f"face_count={face_count[0]}",
            flush=True,
        )
        with _lock:
            already_calibrated = _baseline_pose.get(session_id, {}).get('baseline_yaw') is not None

        # Default to "still calibrating" (not "done") when there's no pose to
        # calibrate from yet (e.g. face not detected), so the frontend keeps
        # waiting instead of assuming setup finished.
        head_alert, calibrating = (False, not already_calibrated)
        if pose is not None:
            head_alert, calibrating = _calibrated_head_alert(session_id, pose)

        print(
            f"[pose_debug] session={session_id} "
            f"yaw={pose.get('yaw') if pose else None} "
            f"pitch={pose.get('pitch') if pose else None} "
            f"roll={pose.get('roll') if pose else None} "
            f"raw_alert={pose.get('alert') if pose else None} "
            f"calibrated_alert={head_alert} calibrating={calibrating}",
            flush=True,
        )

        anomalies = []
        if gaze is None or face_count[0] == 0:
            anomalies.append('face_absent')
        elif gaze.get('direction') in _AWAY_DIRECTIONS and gaze.get('confidence', 0.0) >= _GAZE_CONFIDENCE_THRESHOLD:
            anomalies.append(f"gaze_away:{gaze['direction']}")

        if head_alert:
            anomalies.append('head_turned')

        if face_count[0] > 1:
            anomalies.append('multiple_faces')

        with _lock:
            warning_count = _warning_counts.get(session_id, 0)

        confirmed_anomalies = _confirmed_anomalies(session_id, anomalies)

        print(
            f"[anomaly_debug] session={session_id} "
            f"face_count={face_count[0]} gaze_is_none={gaze is None} "
            f"raw_anomalies={anomalies} confirmed={confirmed_anomalies}",
            flush=True,
        )

        # Forward confirmed anomalies to Derick's backend and track the returned warning_count
        headers = {'X-Internal-Token': _AI_SERVICE_TOKEN} if _AI_SERVICE_TOKEN else None
        for anomaly in confirmed_anomalies:
            event_type = _base_type(anomaly)
            try:
                resp = requests.post(
                    f"{_BACKEND_URL}/api/sessions/log",
                    headers=headers,
                    json={
                        'session_id': session_id,
                        'event_type': event_type,
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
                        f"session={session_id} event={event_type} status={resp.status_code}"
                    )
            except requests.exceptions.RequestException:
                pass  # Backend unreachable — don't crash the WebSocket handler

        if identity_mismatch_confirmed:
            print(f"[identity_debug] session={session_id} CONFIRMED MISMATCH - locking session", flush=True)
            try:
                requests.post(
                    f"{_BACKEND_URL}/api/sessions/verify",
                    headers=headers,
                    json={
                        'session_id': session_id,
                        'match': False,
                        'confidence_score': float(identity_confidence or 0.0),
                        'verification_method': 'periodic-recheck',
                    },
                    timeout=3,
                )
            except requests.exceptions.RequestException:
                pass
            try:
                resp = requests.post(
                    f"{_BACKEND_URL}/api/sessions/log",
                    headers=headers,
                    json={
                        'session_id': session_id,
                        'event_type': 'identity_mismatch',
                        'event_data': {'confidence_score': round(float(identity_confidence or 0.0), 4)},
                    },
                    timeout=3,
                )
                if resp.ok:
                    warning_count = resp.json().get('warning_count', warning_count)
            except requests.exceptions.RequestException:
                pass

        with _lock:
            _warning_counts[session_id] = warning_count

        gaze_direction = gaze.get('direction', 'Unknown') if gaze else 'Unknown'

        emit('anomaly_result', {
            'session_id':     session_id,
            'anomalies':      [_base_type(a) for a in anomalies],
            'confirmed_anomalies': [_base_type(a) for a in confirmed_anomalies],
            'warning_count':  warning_count,
            'gaze_direction': gaze_direction,
            'calibrating':    calibrating,
        })

        if identity_mismatch_confirmed or warning_count >= 3:
            emit('session_locked', {
                'session_id': session_id,
                'reason': 'identity_mismatch' if identity_mismatch_confirmed else 'warning_count_exceeded',
            })

    @socketio.on('connect')
    def handle_connect():
        pass  # Connection accepted; no special setup needed

    @socketio.on('disconnect')
    def handle_disconnect():
        pass  # Warning state naturally expires; no cleanup needed
