import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, origins="*")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

from routes.health import health_bp
from routes.verify import verify_bp
from routes.monitor import monitor_bp

app.register_blueprint(health_bp)
app.register_blueprint(verify_bp)
app.register_blueprint(monitor_bp)

_AI_SERVICE_TOKEN = os.getenv('AI_SERVICE_TOKEN', '').strip()


@app.route('/internal/broadcast', methods=['POST'])
def internal_broadcast():
    """
    Lets the backend push a socket event to whichever browser client(s)
    hold a live connection for a given exam session - the backend has no
    websocket server of its own, so this is the only way an HTTP-triggered
    action there (a new behavioural log, a lecturer terminating a session)
    can reach a connected student or lecturer in real time. Delivery is
    scoped to the `str(session_id)` room, which both the student's frame
    loop (sockets/frame_handler.py) and any lecturer viewing that session
    (see the join_session_room handler) join.
    """
    provided_token = (request.headers.get('X-Internal-Token') or '').strip()
    if not _AI_SERVICE_TOKEN or provided_token != _AI_SERVICE_TOKEN:
        return jsonify({'error': {'message': 'Unauthorized internal request'}}), 401

    data = request.get_json(silent=True) or {}
    session_id = data.get('session_id')
    event = data.get('event')
    payload = data.get('payload') or {}
    if not session_id or not event:
        return jsonify({'error': {'message': 'session_id and event are required'}}), 400

    socketio.emit(event, payload, room=str(session_id))
    return jsonify({'delivered': True}), 200


from sockets.frame_handler import register_handlers
register_handlers(socketio)

from services.model_loader import load_models
load_models()

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=8000, debug=os.getenv('FLASK_ENV') == 'development')
