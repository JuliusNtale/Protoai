import mediapipe as mp
import cv2
import numpy as np
import os

_mp_face_mesh = mp.solutions.face_mesh

# 3D canonical face model points (face-centred coordinate system, mm scale)
_FACE_3D_POINTS = np.array([
    [0.0,     0.0,     0.0  ],   # Nose tip         (landmark 1)
    [0.0,    -330.0,  -65.0 ],   # Chin             (landmark 152)
    [-225.0,  170.0,  -135.0],   # Left eye corner  (landmark 226)
    [225.0,   170.0,  -135.0],   # Right eye corner (landmark 446)
    [-150.0, -150.0,  -125.0],   # Left mouth       (landmark 57)
    [150.0,  -150.0,  -125.0],   # Right mouth      (landmark 287)
], dtype=np.float64)

_LANDMARK_INDICES = [1, 152, 226, 446, 57, 287]

_YAW_THRESHOLD   = float(os.getenv('HEAD_YAW_THRESHOLD',   '30'))
_PITCH_THRESHOLD = float(os.getenv('HEAD_PITCH_THRESHOLD', '20'))


def estimate_head_pose(img_bgr: np.ndarray):
    """
    Estimate yaw, pitch, roll from MediaPipe face landmarks + OpenCV solvePnP.
    Returns dict {yaw, pitch, roll, alert} or None if no face found.
    No trained model required — pure geometry.
    """
    h, w = img_bgr.shape[:2]

    with _mp_face_mesh.FaceMesh(
        max_num_faces=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    ) as face_mesh:
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(img_rgb)

        if not results.multi_face_landmarks:
            return None

        landmarks = results.multi_face_landmarks[0].landmark

        face_2d = np.array([
            [landmarks[idx].x * w, landmarks[idx].y * h]
            for idx in _LANDMARK_INDICES
        ], dtype=np.float64)

        focal_length = w
        cam_matrix = np.array([
            [focal_length, 0,            w / 2],
            [0,            focal_length, h / 2],
            [0,            0,            1    ],
        ], dtype=np.float64)
        dist_coeffs = np.zeros((4, 1))

        success, rot_vec, _ = cv2.solvePnP(
            _FACE_3D_POINTS, face_2d, cam_matrix, dist_coeffs
        )
        if not success:
            return None

        rot_matrix, _ = cv2.Rodrigues(rot_vec)
        angles, _, _, _, _, _ = cv2.RQDecomp3x3(rot_matrix)

        yaw   = angles[1] * 360
        pitch = angles[0] * 360
        roll  = angles[2] * 360

        alert = abs(yaw) > _YAW_THRESHOLD or abs(pitch) > _PITCH_THRESHOLD

        return {
            'yaw':   round(float(yaw), 2),
            'pitch': round(float(pitch), 2),
            'roll':  round(float(roll), 2),
            'alert': bool(alert),
        }
