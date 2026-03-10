"""Base model definitions.

This module provides the common base entity used by domain models.
"""

import uuid
from datetime import datetime
from app import db


class BaseModel(db.Model):
    """Represent a base entity with UUID and timestamps."""

    def __init__(self):
        """Initialize a new base entity state."""
        __abstract__ = True
        id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
        created_at = db.Column(db.DateTime, default=datetime.now())
        updated_at = db.Column(db.DateTime, default=datetime.now(), onupdate=datetime.now())


    def update(self, data):
        """Update existing attributes from a mapping.

        Args:
            data (dict): Attribute values to apply.
        """
        for key, value in data.items():
            if hasattr(self, key):
                setattr(self, key, value)
