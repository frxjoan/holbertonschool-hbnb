"""Authentication API endpoints.

This module provides login and token validation endpoints.
"""

from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import create_access_token
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from flask_jwt_extended.exceptions import JWTExtendedException, NoAuthorizationError
from app.services import facade

api = Namespace('auth', description='Authentication operations')

login_model = api.model('Login', {
    'email': fields.String(required=True, description='User email'),
    'password': fields.String(required=True, description='User password')
})

@api.route('/login')
@api.response(401, 'Invalid credentials')
class Login(Resource):
    @api.expect(login_model, validate=True)
    def post(self):
        """Authenticate a user and return a JWT access token."""
        credentials = api.payload
        
        user = facade.get_user_by_email(credentials['email'])
        
        if not user or not user.verify_password(credentials['password']):
            return {'error': 'Invalid credentials'}, 401

        access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"is_admin": user.is_admin}
        )
        
        return {'access_token': access_token}, 200

@api.route('/protected')
class ProtectedResource(Resource):
    @api.doc(security='Bearer')
    def get(self):
        """Validate the provided JWT and return the current user identity."""
        try:
            verify_jwt_in_request()
            current_user = get_jwt_identity()
            return {'message': f'Hello, user {current_user}'}, 200

        except NoAuthorizationError as err:
            return {'error': str(err)}, 401

        except JWTExtendedException as err:
            return {'error': str(err)}, 422

        except Exception:
            return {'error': 'Invalid token'}, 422
