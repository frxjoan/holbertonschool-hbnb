"""Base model definitions.

This module provides the common base entity used by domain models.
"""

import uuid
from datetime import datetime


class BaseModel:
    """Represent a base entity with UUID and timestamps."""

    def __init__(self):
        """Initialize a new base entity state."""
        self.id = str(uuid.uuid4())
        self.created_at = datetime.now()
        self.updated_at = datetime.now()

    def save(self):
        """Refresh the update timestamp after a mutation."""
        self.updated_at = datetime.now()

    def update(self, data):
        """Update existing attributes from a mapping.

        Args:
            data (dict): Attribute values to apply.
        """
        for key, value in data.items():
            if hasattr(self, key):
                setattr(self, key, value)
        self.save()
