from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt, jwt_required


def roles_required(*allowed_roles):
    normalized = set(allowed_roles)

    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            role = get_jwt().get("role")
            if role not in normalized:
                return jsonify({"error": {"message": "Forbidden"}}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator
