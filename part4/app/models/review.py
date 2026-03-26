"""Review model definitions.

This module provides the review entity and its validation helpers.
"""

from app import db
from .base import BaseModel


class Review(BaseModel):
    """Represent a review written by a user for a place."""

    __tablename__ = "reviews"

    text = db.Column(db.String(1024), nullable=False)
    rating = db.Column(db.Integer, nullable=False)

    owner_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    place_id = db.Column(db.String(36), db.ForeignKey("places.id"), nullable=False)

    __table_args__ = (
        db.UniqueConstraint("owner_id", "place_id", name="unique_owner_place_review"),
    )

    def __init__(self, text, rating, place_id, owner_id):
        """Initialize a review instance with validated fields."""
        super().__init__()
        self.text = self.validate_text(text)
        self.rating = self.validate_rating(rating)
        self.place_id = self.validate_fk_id(place_id, "place_id")
        self.owner_id = self.validate_fk_id(owner_id, "owner_id")

    def validate_text(self, value):
        """Validate the review text value."""
        if not isinstance(value, str):
            raise TypeError("text must be a string")
        value = value.strip()
        if not value:
            raise ValueError("text cannot be empty")
        return value

    def validate_rating(self, value):
        """Validate the review rating value."""
        if not isinstance(value, int):
            raise TypeError("rating must be an integer")
        if value < 1 or value > 5:
            raise ValueError("rating must be between 1 and 5")
        return value

    def validate_fk_id(self, value, field_name):
        """Validate a foreign-key identifier string."""
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"{field_name} must be a valid id")
        return value.strip()

    def update(self, data):
        """Update mutable review fields and persist changes when needed."""
        if not isinstance(data, dict):
            raise TypeError("data must be a dict")

        changed = False

        if "text" in data:
            self.text = self.validate_text(data["text"])
            changed = True

        if "rating" in data:
            self.rating = self.validate_rating(data["rating"])
            changed = True

        if changed:
            self.save()
