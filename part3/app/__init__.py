#!/usr/bin/python3
"""Application factory for HBnB API."""

from flask import Flask
from flask_restx import Api
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

bcrypt = Bcrypt()
jwt = JWTManager()
db = SQLAlchemy()

from app.api.v1.users import api as users_ns
from app.api.v1.places import api as places_ns
from app.api.v1.amenities import api as amenities_ns
from app.api.v1.reviews import api as reviews_ns
from app.api.v1.auth import api as auth_ns


def create_app(config_class="config.DevelopmentConfig"):
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.config.from_object(config_class)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    authorizations = {
        "Bearer": {
            "type": "apiKey",
            "in": "header",
            "name": "Authorization",
            "description": "JWT Authorization header using: Bearer <token>",
        }
    }

    api = Api(
        app,
        version="1.0",
        title="HBnB API",
        description="HBnB Application API",
        doc="/api/v1/",
        authorizations=authorizations,
        security="Bearer",
    )

    api.add_namespace(users_ns, path="/api/v1/users")
    api.add_namespace(places_ns, path="/api/v1/places")
    api.add_namespace(amenities_ns, path="/api/v1/amenities")
    api.add_namespace(reviews_ns, path="/api/v1/reviews")
    api.add_namespace(auth_ns, path="/api/v1/auth")

    bcrypt.init_app(app)
    jwt.init_app(app)
    db.init_app(app)

    return app

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return {"error": "Session expired. Please sign in again."}, 401


@jwt.invalid_token_loader
def invalid_token_callback(error):
    return {"error": "Invalid token. Please sign in again."}, 401


@jwt.unauthorized_loader
def missing_token_callback(error):
    return {"error": "Authentication required."}, 401

@jwt.needs_fresh_token_loader
def needs_fresh_token_callback(_jwt_header, _jwt_payload):
    return {"error": "Fresh token required"}, 401

@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    return {"error": "Token has been revoked."}, 401
