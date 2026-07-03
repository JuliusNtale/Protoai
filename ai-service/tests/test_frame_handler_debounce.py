import sys
import os

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import sockets.frame_handler as fh


def _reset_state():
    fh._anomaly_states.clear()
    fh._warning_counts.clear()
    fh._baseline_pose.clear()


def _reset_identity_state():
    fh._session_student_id.clear()
    fh._identity_check_state.clear()


def test_base_type_strips_direction_qualifier():
    assert fh._base_type('gaze_away:Right') == 'gaze_away'
    assert fh._base_type('head_turned') == 'head_turned'


def test_direction_change_resets_persistence(monkeypatch):
    """Flip-flopping between different wrong directions must not accumulate
    toward a confirmed warning — only a SUSTAINED single direction should."""
    _reset_state()
    times = iter([0.0, 1.0, 2.0])
    monkeypatch.setattr(fh.time, 'monotonic', lambda: next(times))

    assert fh._confirmed_anomalies('s1', ['gaze_away:Right']) == []
    assert fh._confirmed_anomalies('s1', ['gaze_away:Down']) == []
    # Direction changed, so at t=2.0 the 'Down' key is brand new (started_at=2.0);
    # nowhere near the 5s gaze_away threshold yet.
    assert fh._confirmed_anomalies('s1', ['gaze_away:Down']) == []


def test_sustained_same_direction_confirms_after_threshold(monkeypatch):
    _reset_state()
    # Must clear both the persistence threshold (GAZE_AWAY_SECONDS, default 2s
    # from started_at) AND the cooldown (WARNING_COOLDOWN_SECONDS, default 15s
    # from last_logged_at, which starts at 0.0).
    times = iter([0.0, 1.0, 16.0])
    monkeypatch.setattr(fh.time, 'monotonic', lambda: next(times))

    assert fh._confirmed_anomalies('s2', ['gaze_away:Right']) == []
    assert fh._confirmed_anomalies('s2', ['gaze_away:Right']) == []
    assert fh._confirmed_anomalies('s2', ['gaze_away:Right']) == ['gaze_away:Right']


def _is_away(direction, confidence):
    return direction in fh._AWAY_DIRECTIONS and confidence >= fh._GAZE_CONFIDENCE_THRESHOLD


def test_low_confidence_reading_is_not_flagged_as_anomaly():
    """Below the confidence floor, an away-direction reading should be
    treated as inconclusive rather than a gaze_away candidate at all."""
    assert _is_away('Down', 0.1) is False


def test_left_right_are_not_treated_as_away():
    """The model's 'Center' class is a narrow ~6 degree yaw cone (per
    label_config.json), much narrower than the angle spanned by reading
    across a normal screen. Left/Right is normal reading behavior, not a
    gaze-away anomaly, even at high confidence."""
    assert _is_away('Left', 0.9) is False
    assert _is_away('Right', 0.9) is False


def test_down_up_are_treated_as_away_above_confidence_floor():
    assert _is_away('Down', 0.9) is True
    assert _is_away('Up', 0.9) is True
    assert _is_away('Down', 0.1) is False


def test_calibration_window_never_alerts_regardless_of_raw_pose():
    """The first N frames calibrate the session's own neutral pose - even an
    extreme raw pitch during calibration should not alert, since we don't
    yet know if it's this session's normal resting position."""
    _reset_state()
    extreme_pose = {'yaw': 0.0, 'pitch': -43.0, 'roll': 0.0}
    for _ in range(fh._HEAD_POSE_CALIBRATION_FRAMES):
        alert, calibrating = fh._calibrated_head_alert('s3', extreme_pose)
        assert alert is False
        assert calibrating is True


def test_returning_to_calibrated_baseline_does_not_alert():
    """A session whose natural resting pitch is -43 degrees (real production
    data) should NOT alert once calibrated and sitting normally, even though
    that would fail the old fixed +/-20 degree threshold."""
    _reset_state()
    resting_pose = {'yaw': -2.0, 'pitch': -43.5, 'roll': -4.0}
    for _ in range(fh._HEAD_POSE_CALIBRATION_FRAMES):
        fh._calibrated_head_alert('s4', resting_pose)

    alert, calibrating = fh._calibrated_head_alert('s4', {'yaw': -1.5, 'pitch': -44.0, 'roll': -3.5})
    assert calibrating is False
    assert alert is False


def test_real_deviation_from_baseline_still_alerts():
    """Once calibrated, a genuine large deviation from THIS session's
    baseline must still fire, regardless of what the baseline itself is."""
    _reset_state()
    resting_pose = {'yaw': -2.0, 'pitch': -43.5, 'roll': -4.0}
    for _ in range(fh._HEAD_POSE_CALIBRATION_FRAMES):
        fh._calibrated_head_alert('s5', resting_pose)

    # Real head turn: yaw jumps by ~56 degrees from baseline.
    alert, calibrating = fh._calibrated_head_alert('s5', {'yaw': -58.0, 'pitch': -43.0, 'roll': -4.0})
    assert calibrating is False
    assert alert is True


def test_resolve_student_id_caches_after_first_lookup(monkeypatch):
    """The AI service must resolve session_id -> student_id from the backend
    (never trust a client-supplied user_id, or an impostor could simply
    claim their own account and match their own face). This should only hit
    the network once per session, not on every frame."""
    fh._session_student_id.clear()
    calls = []

    class FakeResponse:
        ok = True

        def json(self):
            return {'student_id': 55}

    def fake_get(url, headers=None, timeout=None):
        calls.append(url)
        return FakeResponse()

    monkeypatch.setattr(fh.requests, 'get', fake_get)

    first = fh._resolve_student_id('sA')
    second = fh._resolve_student_id('sA')

    assert first == 55
    assert second == 55
    assert len(calls) == 1


def test_identity_check_throttled_within_recheck_interval(monkeypatch):
    """FaceNet inference is heavier than gaze/pose/count, so the periodic
    identity re-check must not run on every single frame."""
    _reset_identity_state()
    fh._session_student_id['sX'] = 7
    monkeypatch.setattr(fh, 'get_facenet', lambda: object())
    monkeypatch.setattr(fh, 'detect_and_crop_face', lambda img: (np.zeros((10, 10, 3)), 0.9))

    calls = []

    def fake_match(face_crop, student_id, facenet):
        calls.append(student_id)
        return False, 0.1, None

    monkeypatch.setattr(fh, 'match_face_crop_to_baseline', fake_match)

    times = iter([100.0, 101.0])  # second call only 1s later, inside the 8s window
    monkeypatch.setattr(fh.time, 'monotonic', lambda: next(times))

    confirmed1, _ = fh._check_identity_mismatch('sX', np.zeros((10, 10, 3)))
    confirmed2, _ = fh._check_identity_mismatch('sX', np.zeros((10, 10, 3)))

    assert confirmed1 is False
    assert confirmed2 is False
    assert len(calls) == 1  # second call was throttled before ever reaching the match check


def test_identity_mismatch_confirmed_after_consecutive_mismatches(monkeypatch):
    """A single bad-angle/lighting frame must not lock the session - only
    IDENTITY_MISMATCH_CONFIRM_COUNT consecutive mismatched checks should."""
    _reset_identity_state()
    fh._session_student_id['sY'] = 9
    monkeypatch.setattr(fh, 'get_facenet', lambda: object())
    monkeypatch.setattr(fh, 'detect_and_crop_face', lambda img: (np.zeros((10, 10, 3)), 0.9))
    monkeypatch.setattr(fh, 'match_face_crop_to_baseline', lambda face_crop, student_id, facenet: (False, 0.1, None))

    times = iter([100.0, 200.0])  # spaced well beyond the 8s throttle window
    monkeypatch.setattr(fh.time, 'monotonic', lambda: next(times))

    confirmed1, _ = fh._check_identity_mismatch('sY', np.zeros((10, 10, 3)))
    confirmed2, _ = fh._check_identity_mismatch('sY', np.zeros((10, 10, 3)))

    assert confirmed1 is False
    assert confirmed2 is True


def test_identity_mismatch_counter_resets_on_a_matching_check(monkeypatch):
    """A single matching check in between two mismatches must reset the
    consecutive-mismatch counter, not just decrement it."""
    _reset_identity_state()
    fh._session_student_id['sZ'] = 11
    monkeypatch.setattr(fh, 'get_facenet', lambda: object())
    monkeypatch.setattr(fh, 'detect_and_crop_face', lambda img: (np.zeros((10, 10, 3)), 0.9))

    results = iter([(False, 0.2, None), (True, 0.95, None), (False, 0.15, None)])
    monkeypatch.setattr(fh, 'match_face_crop_to_baseline', lambda face_crop, student_id, facenet: next(results))

    times = iter([100.0, 200.0, 300.0])
    monkeypatch.setattr(fh.time, 'monotonic', lambda: next(times))

    confirmed1, _ = fh._check_identity_mismatch('sZ', np.zeros((10, 10, 3)))  # mismatch #1
    confirmed2, _ = fh._check_identity_mismatch('sZ', np.zeros((10, 10, 3)))  # match -> resets counter
    confirmed3, _ = fh._check_identity_mismatch('sZ', np.zeros((10, 10, 3)))  # mismatch #1 again, not #2

    assert confirmed1 is False
    assert confirmed2 is False
    assert confirmed3 is False
