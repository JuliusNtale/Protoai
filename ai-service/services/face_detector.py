import mediapipe as mp
import cv2
import numpy as np

_mp_face_detection = mp.solutions.face_detection
_mp_face_mesh = mp.solutions.face_mesh

# MediaPipe Face Mesh landmark indices: (outer corner, inner corner) per eye.
# The eye with the larger corner-to-corner span is picked as the less-foreshortened one.
_EYE_CORNER_INDICES = {
    'right': (33, 133),   # subject's right eye (screen-left side)
    'left': (263, 362),   # subject's left eye (screen-right side)
}

# MPIIGaze canonical eye patch aspect ratio (width x height = 60 x 36).
_EYE_PATCH_SIZE = (60, 36)
_EYE_CROP_PADDING = 1.8  # crop width = inter-corner distance * padding


def detect_and_crop_face(img_bgr: np.ndarray, padding: float = 0.2):
    """
    Detect the largest face in the image and return the cropped BGR array.
    Returns (face_crop, confidence) or (None, 0) if no face detected.
    padding: fractional expansion around the bounding box for context.
    """
    with _mp_face_detection.FaceDetection(
        model_selection=1,  # full-range model — better for varied distances
        min_detection_confidence=0.5
    ) as detector:
        h, w = img_bgr.shape[:2]
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        results = detector.process(img_rgb)

        if not results.detections:
            return None, 0.0

        best = max(results.detections, key=lambda d: d.score[0])
        bb = best.location_data.relative_bounding_box

        x1 = max(0, int((bb.xmin - padding * bb.width) * w))
        y1 = max(0, int((bb.ymin - padding * bb.height) * h))
        x2 = min(w, int((bb.xmin + (1 + padding) * bb.width) * w))
        y2 = min(h, int((bb.ymin + (1 + padding) * bb.height) * h))

        face_crop = img_bgr[y1:y2, x1:x2]
        confidence = float(best.score[0])
        return face_crop, confidence


def detect_and_crop_eye(img_bgr: np.ndarray):
    """
    Locate facial landmarks, pick the less-foreshortened eye, and return a
    roll-corrected crop of that eye region (BGR, not yet resized/grayscaled).
    Returns (eye_crop, confidence) or (None, 0.0) if no face/landmarks found.

    This approximates — but does not replace — full MPIIGaze-style geometric
    normalization (virtual camera reprojection). It only corrects in-plane
    roll and crops to a fixed multiple of the eye's corner-to-corner width;
    pitch/yaw induced perspective distortion is not corrected.
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
            return None, 0.0

        landmarks = results.multi_face_landmarks[0].landmark

        best_eye = None
        best_span = -1.0
        for outer_idx, inner_idx in _EYE_CORNER_INDICES.values():
            outer = np.array([landmarks[outer_idx].x * w, landmarks[outer_idx].y * h])
            inner = np.array([landmarks[inner_idx].x * w, landmarks[inner_idx].y * h])
            span = float(np.linalg.norm(inner - outer))
            if span > best_span:
                best_span = span
                best_eye = (outer, inner)

        if best_eye is None or best_span < 1e-3:
            return None, 0.0

        outer, inner = best_eye
        eye_center = (outer + inner) / 2.0
        angle_deg = np.degrees(np.arctan2(inner[1] - outer[1], inner[0] - outer[0]))

        rot_matrix = cv2.getRotationMatrix2D(tuple(eye_center), angle_deg, 1.0)
        rotated = cv2.warpAffine(img_bgr, rot_matrix, (w, h))

        crop_w = best_span * _EYE_CROP_PADDING
        crop_h = crop_w * (_EYE_PATCH_SIZE[1] / _EYE_PATCH_SIZE[0])

        x1 = max(0, int(eye_center[0] - crop_w / 2))
        y1 = max(0, int(eye_center[1] - crop_h / 2))
        x2 = min(w, int(eye_center[0] + crop_w / 2))
        y2 = min(h, int(eye_center[1] + crop_h / 2))

        eye_crop = rotated[y1:y2, x1:x2]
        if eye_crop.size == 0:
            return None, 0.0

        return eye_crop, 1.0


def count_faces(img_bgr: np.ndarray) -> int:
    """Return number of faces detected in the image."""
    with _mp_face_detection.FaceDetection(
        model_selection=1,
        min_detection_confidence=0.4
    ) as detector:
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        results = detector.process(img_rgb)
        if not results.detections:
            return 0
        return len(results.detections)
