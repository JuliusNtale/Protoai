# AI Service

## Webcam Clip Evaluation

Use the offline clip harness to compare gaze predictions against recorded webcam scenarios before changing thresholds or smoothing rules:

```bash
python tools/evaluate_webcam_clips.py tools/sample_webcam_clip_manifest.json --sample-interval-ms 1000
```

The manifest points to local video files and labels the expected gaze direction over time. Valid labels are `Screen`, `Left`, `Right`, `Up`, `Down`, and `Unknown`.

```json
{
  "clips": [
    {
      "path": "fixtures/webcam/example.mp4",
      "labels": [
        { "start_sec": 0.0, "end_sec": 2.0, "label": "Screen" },
        { "start_sec": 2.0, "end_sec": 4.0, "label": "Left" }
      ]
    }
  ]
}
```

The command reports total accuracy, per-label accuracy, false negatives, and a confusion table. Add real webcam clips under an ignored fixture directory or another local path; the videos themselves do not need to be committed.
