"""Amenity endpoints for HBnB API (create, list, retrieve, update)."""

from flask_restx import Namespace, Resource, fields
from app.services import facade

api = Namespace("amenities", description="Amenity operations")

# Define the amenity model for input validation and documentation
amenity_model = api.model("Amenity", {
    "name": fields.String(required=True, description="Name of the amenity")
})

@api.route('/')
class AmenityList(Resource):
    """Handle creation and listing of amenities."""

    @api.expect(amenity_model)
    @api.response(201, "Amenity successfully created")
    @api.response(400, "Invalid input data")
    def post(self):
        """Create a new amenity."""
        data = api.payload

        try:
            amenity = facade.create_amenity(data)
        except (TypeError, ValueError) as e:
            return {"error": str(e)}, 400

        return {"id": amenity.id, "name": amenity.name}, 201

    @api.response(200, "List of amenities retrieved successfully")
    def get(self):
        """Return a list of all amenities."""
        amenities = facade.get_all_amenities()
        return [{"id": a.id, "name": a.name} for a in amenities], 200


@api.route('/<amenity_id>')
class AmenityResource(Resource):
    """Handle operations on a single amenity."""

    @api.response(200, "Amenity details retrieved successfully")
    @api.response(404, "Amenity not found")
    def get(self, amenity_id):
        """Get amenity by its ID."""
        amenity = facade.get_amenity(amenity_id)

        if not amenity:
            return {"error": "Amenity not found"}, 404

        return {"id": amenity.id, "name": amenity.name}, 200

    @api.expect(amenity_model)
    @api.response(200, "Amenity updated successfully")
    @api.response(404, "Amenity not found")
    @api.response(400, "Invalid input data")
    def put(self, amenity_id):
        """Update an amenity by ID."""
        data = api.payload

        if not data or "name" not in data or data["name"] == "":
            return {"error": "Invalid input data"}, 400

        try:
            updated = facade.update_amenity(amenity_id, data)
        except (TypeError, ValueError) as e:
            return {"error": str(e)}, 400

        if not updated:
            return {"error": "Amenity not found"}, 404
        return {"message": "Amenity updated successfully"}, 200
