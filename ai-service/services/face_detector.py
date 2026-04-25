import mediapipe as mp
import cv2
import numpy as np

_mp_face_detection = mp.solutions.face_detection


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
