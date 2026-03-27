from flask import Flask

from app.extensions import db
from app.routes import register_blueprints
from config import Config


def create_app(config_class: type[Config] = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    register_blueprints(app)

    with app.app_context():
        db.create_all()

    return app
