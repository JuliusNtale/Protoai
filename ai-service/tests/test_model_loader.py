import pytest
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

_MODELS_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'models'))
_GAZE_MODEL_PATH = os.path.join(_MODELS_DIR, 'gaze_model.onnx')

# gaze_model.onnx is gitignored (see ai-service/.gitignore) so CI checkouts
# won't have it; these tests only run where the binary has been placed
# manually (local dev machine, or the VPS).
pytestmark = pytest.mark.skipif(
    not os.path.exists(_GAZE_MODEL_PATH),
    reason="gaze_model.onnx not present in this environment (binary is gitignored)",
)


def test_gaze_model_file_exists():
    assert os.path.getsize(_GAZE_MODEL_PATH) > 0


def test_gaze_model_loads_via_onnxruntime(monkeypatch):
    monkeypatch.setenv('MODELS_DIR', _MODELS_DIR)
    monkeypatch.setenv('GAZE_MODEL_VERSION', 'gaze_model.onnx')

    import services.model_loader as ml
    ml._gaze_session = None
    ml._gaze_path_loaded = None

    session = ml.get_gaze_model()

    assert session is not None
    assert ml.get_loaded_model_paths()['gaze'] == os.path.join(_MODELS_DIR, 'gaze_model.onnx')


def test_gaze_model_io_signature(monkeypatch):
    monkeypatch.setenv('MODELS_DIR', _MODELS_DIR)
    monkeypatch.setenv('GAZE_MODEL_VERSION', 'gaze_model.onnx')

    import services.model_loader as ml
    ml._gaze_session = None
    ml._gaze_path_loaded = None

    session = ml.get_gaze_model()
    inputs = session.get_inputs()
    outputs = session.get_outputs()

    assert inputs[0].name == 'eye_image'
    assert list(inputs[0].shape[1:]) == [1, 36, 60]
    assert outputs[0].name == 'gaze_logits'
    assert outputs[0].shape[1] == 5


def test_gaze_model_version_env_var_is_configurable(monkeypatch):
    monkeypatch.setenv('MODELS_DIR', _MODELS_DIR)
    monkeypatch.setenv('GAZE_MODEL_VERSION', 'does_not_exist.onnx')

    import services.model_loader as ml
    ml._gaze_session = None
    ml._gaze_path_loaded = None

    # Falls back to the gaze_model.onnx candidate when the configured name is missing.
    session = ml.get_gaze_model()
    assert session is not None
    assert ml.get_loaded_model_paths()['gaze'] == os.path.join(_MODELS_DIR, 'gaze_model.onnx')
