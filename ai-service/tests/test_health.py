import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import app


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as c:
        yield c


def test_health_returns_ok(client):
    resp = client.get('/health')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['status'] == 'ok'
    assert 'models_loaded' in data
    assert 'facenet' in data['models_loaded']
    assert 'l2cs' in data['models_loaded']


def test_health_models_loaded_is_bool(client):
    resp = client.get('/health')
    data = resp.get_json()
    assert isinstance(data['models_loaded']['facenet'], bool)
    assert isinstance(data['models_loaded']['l2cs'], bool)
