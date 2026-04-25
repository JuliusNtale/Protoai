import threading
from flask import Blueprint, request, jsonify

from services.preprocessing import base64_to_numpy
from services.gaze_estimator import estimate_gaze
from services.head_pose import estimate_head_pose
from services.face_detector import count_faces

monitor_bp = Blueprint('monitor', __name__)


@monitor_bp.route('/monitor-frame', methods=['POST'])
def monitor_frame():
    data = request.get_json(silent=True)

    if not data or 'session_id' not in data or 'frame_base64' not in data:
        return jsonify({'error': 'Missing session_id or frame_base64'}), 400

    try:
        img_bgr = base64_to_numpy(data['frame_base64'])
    except Exception:
        return jsonify({'error': 'Invalid base64 frame'}), 400

    # Run gaze, head pose, and face count concurrently for <1s total latency
    gaze_result  = [None]
    pose_result  = [None]
    face_count   = [0]

    def run_gaze():
        gaze_result[0] = estimate_gaze(img_bgr)

    def run_pose():
        pose_result[0] = estimate_head_pose(img_bgr)

    def run_face_count():
        face_count[0] = count_faces(img_bgr)

    t1 = threading.Thread(target=run_gaze)
    t2 = threading.Thread(target=run_pose)
    t3 = threading.Thread(target=run_face_count)
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

    gaze_resp = gaze if gaze else {'direction': 'Unknown', 'confidence': 0.0}
    pose_resp = pose if pose else {'yaw': 0.0, 'pitch': 0.0, 'roll': 0.0, 'alert': False}

    return jsonify({
        'gaze':      gaze_resp,
        'head_pose': pose_resp,
        'anomalies': anomalies,
    }), 200
