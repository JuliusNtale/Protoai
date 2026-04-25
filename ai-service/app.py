import os
from flask import Flask
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

from sockets.frame_handler import register_handlers
register_handlers(socketio)

from services.model_loader import load_models
load_models()

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=8000, debug=os.getenv('FLASK_ENV') == 'development')
