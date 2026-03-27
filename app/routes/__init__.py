from flask import Flask

from .web import web_bp


def register_blueprints(app: Flask) -> None:
    app.register_blueprint(web_bp)


__all__ = ["web_bp", "register_blueprints"]
