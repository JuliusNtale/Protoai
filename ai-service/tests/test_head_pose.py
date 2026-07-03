import sys
import os
import pytest
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services.head_pose import _normalize_angle, estimate_head_pose


def test_normalize_angle_leaves_small_angles_unchanged():
    assert _normalize_angle(2.66) == 2.66
    assert _normalize_angle(-24.63) == -24.63
    assert _normalize_angle(0.0) == 0.0


def test_normalize_angle_folds_flipped_branch():
    """cv2.RQDecomp3x3's ambiguous decomposition lands pitch/roll on a
    ~180-degree-flipped branch for this face model; values with magnitude
    > 90 should fold back to the sensible small-angle branch. These exact
    numbers are real values observed during the 2026-07-03 head-pose bug
    investigation."""
    assert _normalize_angle(139.29) == pytest.approx(-40.71)
    assert _normalize_angle(-154.58) == pytest.approx(25.42)
    assert _normalize_angle(172.21) == pytest.approx(-7.79)


def test_estimate_head_pose_returns_none_for_blank_image():
    blank = np.zeros((480, 640, 3), dtype=np.uint8)
    assert estimate_head_pose(blank) is None
