"""Review API endpoints.

This module defines REST resources to create, list, retrieve, update,
and delete reviews.
"""

from flask_restx import Namespace, Resource, fields
from app.services import facade

api = Namespace("reviews", description="Review operations")

# Define the review model for input validation and documentation
review_model = api.model("Review", {
    "text": fields.String(required=True, description="Text of the review"),
    "rating": fields.Integer(required=True, description="Rating of the place (1-5)"),
    "user_id": fields.String(required=True, description="ID of the user"),
    "place_id": fields.String(required=True, description="ID of the place")
})


@api.route('/')
class ReviewList(Resource):
    """Resource for review collection operations."""

    @api.expect(review_model)
    @api.response(201, "Review successfully created")
    @api.response(400, "Invalid input data")
    @api.response(404, "Not found")
    def post(self):
        """Create a new review.

        Returns:
            tuple[dict, int]: Created review payload and HTTP 201 status.
            tuple[dict, int]: Error payload and HTTP 400 status.
        """
        review_data = api.payload
        existing_place = facade.get_place(review_data["place_id"])
        existing_user = facade.get_user(review_data["user_id"])

        if not existing_place:
            return {"error": "Place doesn\'t exists"}, 400
        if not existing_user:
            return {"error": "User doesn\'t exists"}, 400

        owner_id = existing_place.owner.id if hasattr(existing_place.owner, "id") else existing_place.owner
        if owner_id == existing_user.id:
            return {"error": "Owner cannot review own place"}, 400

        try:
            new_review = facade.create_review(review_data)
        except (TypeError, ValueError) as e:
            return {"error": str(e)}, 400

        return {
            "id": new_review.id,
            "text": new_review.text,
            "rating": new_review.rating,
            "user_id": new_review.user.id,
            "place_id": new_review.place.id
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
            "user_id": existing_review.user.id,
            "place_id": existing_review.place.id
        }, 200

    @api.expect(review_model)
    @api.response(200, "Review updated successfully")
    @api.response(404, "Review not found")
    @api.response(400, "Invalid input data")
    def put(self, review_id):
        """Update review information by ID.

        Args:
            review_id (str): Identifier of the review.

        Returns:
            tuple[dict, int]: Success payload and HTTP 200 status.
            tuple[dict, int]: Error payload and HTTP 404 status.
        """
        review_data = api.payload

        if not review_data:
            return {"error": "Invalid input data"}, 400

        if "text" not in review_data and "rating" not in review_data:
            return {"error": "Invalid input data"}, 400

        if "text" in review_data and (not isinstance(review_data["text"], str) or not review_data["text"].strip()):
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
    def delete(self, review_id):
        """Delete a review by ID.

        Args:
            review_id (str): Identifier of the review.

        Returns:
            tuple[dict, int]: Success payload and HTTP 200 status.
            tuple[dict, int]: Error payload and HTTP 404 status.
        """
        deleted = facade.delete_review(review_id)
        if not deleted:
            return {"error": "Review not found"}, 404

        return {"message": "Review deleted successfully"}, 200
