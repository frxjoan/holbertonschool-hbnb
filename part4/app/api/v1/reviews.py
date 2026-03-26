"""Review API endpoints.

This module defines REST resources to create, list, retrieve, update,
and delete reviews.
"""

from flask_restx import Namespace, Resource, fields
from app.services import facade
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

api = Namespace("reviews", description="Review operations")

# Define the review model for input validation and API documentation.
review_model = api.model("Review", {
    "text": fields.String(required=True, description="Text of the review"),
    "rating": fields.Integer(required=True, min=1, max=5,
                              description="Rating of the place (1-5)"),
    "place_id": fields.String(required=True, description="ID of the place")
})

review_update_model = api.model("ReviewUpdate", {
    "text": fields.String(description="Text of the review"),
    "rating": fields.Integer(min=1, max=5,
                              description="Rating of the place (1-5)")
})


@api.route('/')
class ReviewList(Resource):
    """Resource for review collection operations."""

    @api.expect(review_model)
    @api.response(201, "Review successfully created")
    @api.response(400, "Invalid input data")
    @api.response(404, "Not found")
    @api.response(401, 'Missing or invalid JWT token')
    @api.doc(security='Bearer')
    @jwt_required()
    def post(self):
        """Create a new review.

        Returns:
            tuple[dict, int]: Created review payload and HTTP 201 status.
            tuple[dict, int]: Error payload and HTTP 400 status.
        """
        current_user_id = get_jwt_identity()
        review_data = api.payload
        place = facade.get_place(review_data["place_id"])
        current_user = facade.get_user(current_user_id)

        if not place:
            return {"error": "Place not found"}, 404
        if not current_user:
            return {"error": "User not found"}, 404

        owner_id = place.owner_id
        if owner_id == current_user_id:
            return {"error": "You cannot review your own place."}, 400

        reviews = facade.get_reviews_by_place(review_data["place_id"])
        for r in reviews:
            if r.owner_id == current_user_id:
                return {"error": "You have already reviewed this place."}, 400

        try:
            review_data_to_create = {
                "text": review_data["text"],
                "rating": review_data["rating"],
                "place_id": review_data["place_id"],
                "owner_id": current_user_id
            }
            new_review = facade.create_review(review_data_to_create)

        except (TypeError, ValueError) as e:
            return {"error": str(e)}, 400

        return {
            "id": new_review.id,
            "text": new_review.text,
            "rating": new_review.rating,
            "owner_id": new_review.owner_id,
            "place_id": new_review.place_id
        }, 201

    @api.response(200, "List of reviews retrieved successfully")
    def get(self):
        """Retrieve all reviews.

        Returns:
            tuple[list[dict], int]: List of reviews and HTTP 200 status.
        """
        reviews = facade.get_all_reviews()
        return [
            {
                "id": r.id,
                "text": r.text,
                "rating": r.rating
            }
            for r in reviews
        ], 200


@api.route('/<review_id>')
class ReviewResource(Resource):
    """Resource for single review operations."""

    @api.response(200, "Review details retrieved successfully")
    @api.response(404, "Review not found")
    def get(self, review_id):
        """Retrieve review details by ID.

        Args:
            review_id (str): Identifier of the review.

        Returns:
            tuple[dict, int]: Review payload and HTTP 200 status.
            tuple[dict, int]: Error payload and HTTP 404 status.
        """
        existing_review = facade.get_review(review_id)

        if not existing_review:
            return {"error": "Review not found"}, 404

        return {
            "id": existing_review.id,
            "text": existing_review.text,
            "rating": existing_review.rating,
            "owner_id": existing_review.owner_id,
            "place_id": existing_review.place_id
        }, 200

    @api.expect(review_update_model)
    @api.response(200, "Review updated successfully")
    @api.response(404, "Review not found")
    @api.response(400, "Invalid input data")
    @api.response(403, "Unauthorized action")
    @api.response(401, 'Missing or invalid JWT token')
    @api.doc(security='Bearer')
    @jwt_required()
    def put(self, review_id):
        """Update review information by ID.

        Args:
            review_id (str): Identifier of the review.

        Returns:
            tuple[dict, int]: Success payload and HTTP 200 status.
            tuple[dict, int]: Error payload and HTTP 404 status.
        """
        review_data = api.payload
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        is_admin = claims.get('is_admin', False)

        existing_review = facade.get_review(review_id)

        if not existing_review:
            return {"error": "Review not found"}, 404

        review_user_id = existing_review.owner_id

        if review_user_id != current_user_id and not is_admin:
            return {"error": "Unauthorized action"}, 403

        if not review_data:
            return {"error": "Invalid input data"}, 400

        if "text" not in review_data and "rating" not in review_data:
            return {"error": "Invalid input data"}, 400

        if "text" in review_data and (
            not isinstance(review_data["text"], str) or not review_data["text"].strip()
        ):
            return {"error": "Invalid input data"}, 400

        try:
            updated = facade.update_review(review_id, review_data)
        except (TypeError, ValueError) as e:
            return {"error": str(e)}, 400

        if not updated:
            return {"error": "Review not found"}, 404

        return {"message": "Review updated successfully"}, 200

    @api.response(200, "Review deleted successfully")
    @api.response(404, "Review not found")
    @api.response(403, "Unauthorized action")
    @api.response(401, 'Missing or invalid JWT token')
    @api.doc(security='Bearer')
    @jwt_required()
    def delete(self, review_id):
        """Delete a review by ID.

        Args:
            review_id (str): Identifier of the review.

        Returns:
            tuple[dict, int]: Success payload and HTTP 200 status.
            tuple[dict, int]: Error payload and HTTP 404 status.
        """
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        is_admin = claims.get('is_admin', False)

        existing_review = facade.get_review(review_id)

        if not existing_review:
            return {"error": "Review not found"}, 404

        review_user_id = existing_review.owner_id

        if review_user_id != current_user_id and not is_admin:
            return {"error": "Unauthorized action"}, 403

        deleted = facade.delete_review(review_id)
        if not deleted:
            return {"error": "Review not found"}, 404

        return {"message": "Review deleted successfully"}, 200
