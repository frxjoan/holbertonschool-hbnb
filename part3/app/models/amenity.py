"""Amenity domain model.

This module defines `AmenityModel`, an entity representing a feature or
service that can be attached to places.
"""

from .base import BaseModel


class AmenityModel(BaseModel):
    """Amenity entity that can be linked to places.

    Attributes:
        name (str): Human-readable amenity name.
    """

    def __init__(self, name):
        """Initialize an amenity instance.

        Args:
            name (str): Amenity label.

        Raises:
            ValueError: If `name` is invalid.
        """
        super().__init__()
        self.name = self.validate_name(name)

    # Validation helpers
    def validate_name(self, name):
        """Validate and normalize the amenity name.

        Args:
            name (str): Raw amenity name.

        Returns:
            str: Trimmed and validated amenity name.

        Raises:
            ValueError: If name is not a non-empty string or exceeds 50 chars.
        """
        if not isinstance(name, str) or not name.strip():
            raise ValueError("Amenity name must be a non-empty string")

        name = name.strip()

        if len(name) > 50:
            raise ValueError("Name must not exceed 50 characters")

        return name

    # Mutation methods
    def update(self, data):
        """Update allowed amenity attributes and persist changes.

        Args:
            data (dict): Partial payload containing updatable fields.

        Raises:
            ValueError: If `data` is not a dictionary.
        """
        if not isinstance(data, dict):
            raise ValueError("Update data must be a dictionary")

        allowed = {"name"}
        changed = False

        for key, value in data.items():
            if key not in allowed:
                continue

            if key == "name":
                self.name = self.validate_name(value)

            changed = True

        if changed:
            self.save()
