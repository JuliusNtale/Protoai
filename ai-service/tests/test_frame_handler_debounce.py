import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import sockets.frame_handler as fh


def _reset_state():
    fh._anomaly_states.clear()
    fh._warning_counts.clear()


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
    # Must clear both the persistence threshold (GAZE_AWAY_SECONDS, default 5s
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
