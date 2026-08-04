from app import create_app

app = create_app()


if __name__ == "__main__":
    # debug=True only affects this direct-run path (local dev, native or via
    # docker-compose) - production runs through gunicorn importing `run:app`,
    # which never executes this __main__ block.
    app.run(host="0.0.0.0", port=5000, debug=True)
