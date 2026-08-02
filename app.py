"""Flask application entry point."""

from pathlib import Path

from flask import Flask, jsonify

from resume_upload import register_resume_upload_routes


def create_app(test_config: dict | None = None) -> Flask:
    """Create and configure the JobPilot web application."""
    app = Flask(__name__)
    app.config.from_mapping(
        UPLOAD_FOLDER=Path(app.root_path) / "uploads",
        MAX_CONTENT_LENGTH=10 * 1024 * 1024,  # 10 MiB
    )

    if test_config:
        app.config.update(test_config)

    register_resume_upload_routes(app)

    @app.errorhandler(413)
    def request_too_large(_error):
        return jsonify(error="File is too large. Maximum size is 10 MiB."), 413

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
