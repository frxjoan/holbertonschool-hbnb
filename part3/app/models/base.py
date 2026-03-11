"""Base model definitions.

This module provides the common base entity used by domain models.
"""

import uuid
from datetime import datetime, UTC
from app import db

place_amenity = db.Table(
    "place_amenity",
    db.Column("place_id", db.String(36), db.ForeignKey("places.id"), primary_key=True),
    db.Column("amenity_id", db.String(36), db.ForeignKey("amenities.id"), primary_key=True),
)


class BaseModel(db.Model):
    """Amenity entity that can be linked to places."""

    __tablename__ = "amenities"

    name = db.Column(db.String(255), nullable=False, unique=True)

    places = db.relationship(
        "Place",
        secondary=place_amenity,
        lazy="subquery",
        backref=db.backref("amenities", lazy=True),
    )

    def __init__(self, name):
        self.name = self.validate_name(name)

    def validate_name(self, name):
        """Validate and normalize the amenity name."""
        if not isinstance(name, str) or not name.strip():
            raise ValueError("Amenity name must be a non-empty string")

        name = name.strip()

        if len(name) > 50:
            raise ValueError("Name must not exceed 50 characters")

        return name

    def update(self, data):
        """Update allowed amenity attributes and persist changes."""
        if not isinstance(data, dict):
            raise ValueError("Update data must be a dictionary")

        if "name" in data:
            self.name = self.validate_name(data["name"])

        self.save()
