"""Evaluate gaze predictions against labeled webcam clips.

Manifest format:

{
  "clips": [
    {
      "path": "fixtures/webcam/looking_left.mp4",
      "labels": [
        {"start_sec": 0.0, "end_sec": 2.5, "label": "Screen"},
        {"start_sec": 2.5, "end_sec": 5.0, "label": "Left"}
      ]
    }
  ]
}
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import cv2

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from services.gaze_estimator import estimate_gaze  # noqa: E402


VALID_LABELS = {"Screen", "Left", "Right", "Up", "Down", "Unknown"}


@dataclass(frozen=True)
class LabelRange:
    start_sec: float
    end_sec: float
    label: str


@dataclass(frozen=True)
class ClipSpec:
    path: Path
    labels: list[LabelRange]


def _load_manifest(manifest_path: Path) -> list[ClipSpec]:
    data = json.loads(manifest_path.read_text())
    clips = []
    for raw_clip in data.get("clips", []):
        clip_path = Path(raw_clip["path"])
        if not clip_path.is_absolute():
            clip_path = manifest_path.parent / clip_path

        labels = [
            LabelRange(
                start_sec=float(raw_label["start_sec"]),
                end_sec=float(raw_label["end_sec"]),
                label=str(raw_label["label"]),
            )
            for raw_label in raw_clip.get("labels", [])
        ]
        clips.append(ClipSpec(path=clip_path, labels=labels))
    return clips


def _expected_label_at(labels: list[LabelRange], timestamp_sec: float) -> str | None:
    for label_range in labels:
        if label_range.start_sec <= timestamp_sec < label_range.end_sec:
            return label_range.label
    return None


def _prediction_label(frame: Any) -> str:
    gaze = estimate_gaze(frame)
    if not gaze:
        return "Unknown"
    label = str(gaze.get("direction") or "Unknown")
    return label if label in VALID_LABELS else "Unknown"


def _evaluate_clip(clip: ClipSpec, sample_interval_ms: int) -> list[tuple[str, str]]:
    capture = cv2.VideoCapture(str(clip.path))
    if not capture.isOpened():
        raise RuntimeError(f"Unable to open clip: {clip.path}")

    fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
    frame_step = max(1, round(fps * sample_interval_ms / 1000))
    rows = []
    frame_index = 0

    try:
        while True:
            ok, frame = capture.read()
            if not ok:
                break

            if frame_index % frame_step == 0:
                timestamp_sec = frame_index / fps
                expected = _expected_label_at(clip.labels, timestamp_sec)
                if expected:
                    rows.append((expected, _prediction_label(frame)))

            frame_index += 1
    finally:
        capture.release()

    return rows


def _summarize(rows: list[tuple[str, str]]) -> dict[str, Any]:
    totals = Counter(expected for expected, _ in rows)
    correct = Counter(expected for expected, predicted in rows if expected == predicted)
    confusion: dict[str, Counter[str]] = defaultdict(Counter)
    for expected, predicted in rows:
        confusion[expected][predicted] += 1

    total_count = len(rows)
    correct_count = sum(correct.values())
    return {
        "samples": total_count,
        "accuracy": correct_count / total_count if total_count else 0.0,
        "per_label": {
            label: {
                "samples": count,
                "accuracy": correct[label] / count if count else 0.0,
                "false_negatives": count - correct[label],
            }
            for label, count in sorted(totals.items())
        },
        "confusion": {
            expected: dict(sorted(predictions.items()))
            for expected, predictions in sorted(confusion.items())
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate gaze predictions against recorded webcam clips.")
    parser.add_argument("manifest", type=Path, help="Path to the webcam clip manifest JSON.")
    parser.add_argument("--sample-interval-ms", type=int, default=1000, help="Frame sampling interval.")
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON.")
    args = parser.parse_args()

    clips = _load_manifest(args.manifest)
    rows: list[tuple[str, str]] = []
    for clip in clips:
        rows.extend(_evaluate_clip(clip, args.sample_interval_ms))

    summary = _summarize(rows)
    if args.json:
        print(json.dumps(summary, indent=2, sort_keys=True))
    else:
        print(f"Samples: {summary['samples']}")
        print(f"Accuracy: {summary['accuracy']:.2%}")
        print("Per label:")
        for label, metrics in summary["per_label"].items():
            print(
                f"  {label}: {metrics['accuracy']:.2%} "
                f"({metrics['samples']} samples, {metrics['false_negatives']} false negatives)"
            )
        print("Confusion:")
        for expected, predictions in summary["confusion"].items():
            print(f"  {expected}: {predictions}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
