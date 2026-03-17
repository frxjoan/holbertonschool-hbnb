"""User API endpoints.

This module defines REST resources used to create, list, retrieve,
and update users.
"""

from flask_restx import Namespace, Resource, fields
from app.services import facade
from app import bcrypt
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

api = Namespace('users', description='User operations')

# Define the user model for input validation and API documentation.
user_model = api.model('User', {
    'first_name': fields.String(required=True,
                                description='First name of the user'),
    'last_name': fields.String(required=True,
                               description='Last name of the user'),
    'email': fields.String(required=True,
                           description='Email of the user'),
    'password': fields.String(required=True, description='Password of the user'),
    'is_admin': fields.Boolean(required=False, description='Role of the user')
})

user_update_model = api.model('UserUpdate', {
    'first_name': fields.String(required=False,
                                description='First name of the user'),
    'last_name': fields.String(required=False,
                               description='Last name of the user'),
    'email': fields.String(required=False,
                           description='Email of the user'),
    'password': fields.String(required=False,
                              description='Password of the user'),
    'is_admin': fields.Boolean(required=False,
                               description='Admin status of the user')
})


@api.route('/')
class UserList(Resource):
    """Resource for user collection operations."""

    @api.expect(user_model, validate=True)
    @api.response(201, 'User successfully created')
    @api.response(400, 'Email already registered')
    @api.response(400, 'Invalid input data')
    def post(self):
        """Create a new user.

        Returns:
            tuple[dict, int]: Created user payload and HTTP 201 status.
            tuple[dict, int]: Error payload and HTTP 400 status.
        """
        user_data = api.payload

        # Check email uniqueness.
        existing_user = facade.get_user_by_email(user_data['email'])
        if existing_user:
            return {'error': 'Email already registered'}, 400
        
        try:
            user_data_to_create = {
                'first_name': user_data['first_name'],
                'last_name': user_data['last_name'],
                'email': user_data['email'],
                'password': user_data['password'],
                'is_admin': user_data.get('is_admin', False)
            }

            new_user = facade.create_user(user_data_to_create)

        except (TypeError, ValueError) as e:
            return {"error": str(e)}, 400

        return {
            'id': new_user.id, 
            'first_name': new_user.first_name, 
            'last_name': new_user.last_name, 
            'email': new_user.email,
            'is_admin': new_user.is_admin
        }, 201


    @api.response(200, "Users retrieved successfully")
    def get(self):
        """Retrieve all users.

        Returns:
            tuple[list[dict], int]: List of users and HTTP 200 status.
        """
        users = facade.get_all_users()
        return [
            {
                "id": u.id,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "email": u.email,
                "is_admin": u.is_admin,
            }
            for u in users
        ], 200


@api.route('/<user_id>')
class UserResource(Resource):
    """Resource for single-user operations."""

    @api.response(200, 'User details retrieved successfully')
    @api.response(404, 'User not found')
    def get(self, user_id):
        """Retrieve user details by ID.

        Args:
            user_id (str): Identifier of the user.

        Returns:
            tuple[dict, int]: User payload and HTTP 200 status.
            tuple[dict, int]: Error payload and HTTP 404 status.
        """
        user = facade.get_user(user_id)
        if not user:
            return {'error': 'User not found'}, 404

        return {'id': user.id, 
                'first_name': user.first_name,
                'last_name': user.last_name, 
                'email': user.email,
                'is_admin': user.is_admin}, 200


    @api.expect(user_update_model, validate=True)
    @api.response(200, "User updated successfully")
    @api.response(404, "User not found")
    @api.response(400, "Email already registered")
    @api.response(401, 'Missing or invalid JWT token')
    @api.doc(security='Bearer')
    @jwt_required()
    def put(self, user_id):
        """Update a user by ID.

        Args:
            user_id (str): Identifier of the user.

        Returns:
            tuple[dict, int]: Updated user payload and HTTP 200 status.
            tuple[dict, int]: Error payload and HTTP 404/400 status.
        """
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        is_admin = claims.get('is_admin', False)

        if user_id != current_user_id and not is_admin:
            return {"error": "Unauthorized action"}, 403

        user = facade.get_user(user_id)
        if not user:
            return {"error": "User not found"}, 404

        user_data = api.payload

        if not user_data:
            return {"error": "Invalid input data"}, 400

        allowed_fields = {"first_name", "last_name", "email", "password", "is_admin"} if is_admin else {"first_name", "last_name"}
        if not any(field in user_data for field in allowed_fields):
            return {"error": "Invalid input data"}, 400

        try:
            updated_user = facade.update_user(user_id, user_data)
        except (TypeError, ValueError) as e:
            return {"error": str(e)}, 400

        if not updated_user:
            return {"error": "User not found"}, 404

        return {
            "id": updated_user.id,
            "first_name": updated_user.first_name,
            "last_name": updated_user.last_name,
            "email": updated_user.email,
            "is_admin": updated_user.is_admin
        }, 200
