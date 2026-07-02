import cv2
import numpy as np
import mediapipe as mp

from services.head_pose import _FACE_3D_POINTS, _LANDMARK_INDICES

_mp_face_mesh = mp.solutions.face_mesh

# MediaPipe Face Mesh (outer corner, inner corner) landmark indices per eye,
# used to pick which eye has the larger (less-foreshortened) 2D span and to
# locate its precise 2D pixel position.
_EYE_CORNER_INDICES = {
    'a': (33, 133),
    'b': (263, 362),
}

_PATCH_W, _PATCH_H = 60, 36

# Neutral base focal length for the first (unscaled) warp pass. Its exact
# value doesn't matter — the second pass corrects for whatever zoom it
# produces based on the eye's actually-measured size, so this never needs
# tuning against real camera calibration data we don't have.
_BASE_FOCAL_LENGTH = 150.0

# Target eye width in the final patch, as a fraction of patch width. MPIIGaze
# eye patches typically show the palpebral fissure spanning roughly half the
# 60px width — this is the one deliberately-chosen constant left in the
# pipeline, and it's a directly-reasoned target, not a fitted parameter.
_TARGET_EYE_SPAN_PX = _PATCH_W * 0.5


def _camera_matrix(w, h):
    focal_length = w
    return np.array([
        [focal_length, 0, w / 2],
        [0, focal_length, h / 2],
        [0, 0, 1],
    ], dtype=np.float64)


def _build_rotation(landmarks, w, h, cam_matrix, dist_coeffs):
    """Solve head pose and pick the best eye. Returns (Rn, best_outer_2d,
    best_inner_2d) or None if pose/eye can't be determined."""
    face_2d = np.array([
        [landmarks[idx].x * w, landmarks[idx].y * h]
        for idx in _LANDMARK_INDICES
    ], dtype=np.float64)

    success, rvec, tvec = cv2.solvePnP(_FACE_3D_POINTS, face_2d, cam_matrix, dist_coeffs)
    if not success:
        return None

    best_span = -1.0
    best_outer = best_inner = None
    for outer_idx, inner_idx in _EYE_CORNER_INDICES.values():
        outer = np.array([landmarks[outer_idx].x * w, landmarks[outer_idx].y * h])
        inner = np.array([landmarks[inner_idx].x * w, landmarks[inner_idx].y * h])
        span = float(np.linalg.norm(inner - outer))
        if span > best_span:
            best_span = span
            best_outer, best_inner = outer, inner

    if best_outer is None or best_span < 1e-3:
        return None

    eye_center_2d = (best_outer + best_inner) / 2.0

    # Forward direction: the camera-space ray through the observed eye
    # pixel, back-projected via the inverse intrinsic matrix. Guarantees
    # the eye lands exactly at the patch center after warping, since by
    # construction it lies on the new virtual camera's z-axis.
    eye_ray = np.linalg.inv(cam_matrix) @ np.array([eye_center_2d[0], eye_center_2d[1], 1.0])
    ray_norm = np.linalg.norm(eye_ray)
    if ray_norm < 1e-9:
        return None
    forward = eye_ray / ray_norm

    R, _ = cv2.Rodrigues(rvec)
    head_up = R @ np.array([0.0, 1.0, 0.0])
    right = np.cross(head_up, forward)
    right_norm = np.linalg.norm(right)
    if right_norm < 1e-6:
        return None
    right = right / right_norm
    up = np.cross(forward, right)
    Rn = np.stack([right, up, forward], axis=0)

    return Rn, best_outer, best_inner


def _warp(img_bgr, cam_matrix, Rn, scale_z, focal_length):
    cam_n = np.array([
        [focal_length, 0, _PATCH_W / 2],
        [0, focal_length, _PATCH_H / 2],
        [0, 0, 1],
    ], dtype=np.float64)
    S = np.diag([1.0, 1.0, scale_z])
    warp_matrix = cam_n @ S @ Rn @ np.linalg.inv(cam_matrix)
    warped = cv2.warpPerspective(img_bgr, warp_matrix, (_PATCH_W, _PATCH_H))
    return warped, warp_matrix


def normalize_eye_patch(img_bgr: np.ndarray):
    """
    Full MPIIGaze-style data normalization (Zhang et al., "Revisiting Data
    Normalization for Appearance-Based Gaze Estimation", ETRA 2018):
    estimate 3D head pose, build a virtual camera that looks directly at the
    observed eye pixel with head roll cancelled, then perspective-warp the
    frame into the model's expected 60x36 eye patch.

    Zoom is self-calibrating per frame: we warp once at a neutral scale,
    measure how wide the eye actually ended up (by transforming its known
    2D corner points through the same warp), then re-warp with the exact
    correction needed to hit the target eye width. This avoids depending on
    absolute distance in our 3D face model's arbitrary (non-metric) units,
    which proved unstable to hand-tune against a handful of test photos.

    Returns a BGR patch of shape (36, 60, 3), or None if no face/pose found.
    """
    h, w = img_bgr.shape[:2]

    with _mp_face_mesh.FaceMesh(
        max_num_faces=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as face_mesh:
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(img_rgb)

        if not results.multi_face_landmarks:
            return None

        landmarks = results.multi_face_landmarks[0].landmark
        cam_matrix = _camera_matrix(w, h)
        dist_coeffs = np.zeros((4, 1))

        built = _build_rotation(landmarks, w, h, cam_matrix, dist_coeffs)
        if built is None:
            return None
        Rn, outer_2d, inner_2d = built

        # Pass 1: neutral zoom, just to measure how big the eye comes out.
        _, warp_matrix_0 = _warp(img_bgr, cam_matrix, Rn, scale_z=1.0, focal_length=_BASE_FOCAL_LENGTH)

        def _project(point_2d):
            homog = warp_matrix_0 @ np.array([point_2d[0], point_2d[1], 1.0])
            if abs(homog[2]) < 1e-9:
                return None
            return homog[:2] / homog[2]

        outer_warped = _project(outer_2d)
        inner_warped = _project(inner_2d)
        if outer_warped is None or inner_warped is None:
            return None

        measured_span = float(np.linalg.norm(inner_warped - outer_warped))
        if measured_span < 1e-6:
            return None

        # Pass 2: re-warp with the correction that makes the measured span
        # match our target. Increasing scale_z shrinks apparent size (it
        # divides x/y after the final perspective divide), so the correction
        # is a direct ratio, not an inverse one.
        scale_correction = measured_span / _TARGET_EYE_SPAN_PX
        warped, _ = _warp(img_bgr, cam_matrix, Rn, scale_z=scale_correction, focal_length=_BASE_FOCAL_LENGTH)

        return warped
