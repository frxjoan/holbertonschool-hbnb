"""Base model definitions.

This module provides the common base entity used by domain models.
"""

import uuid
from datetime import datetime, UTC
from app import db


class BaseModel(db.Model):
    """Represent a base entity with UUID and timestamps."""

    __abstract__ = True

    id = db.Column(
        db.String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(UTC),
        nullable=False
    )
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False
    )

    def save(self):
        """Persist the current object."""
        db.session.add(self)
        db.session.commit()

    def update(self, data):
        """Update existing attributes from a mapping.

        Args:
            data (dict): Attribute values to apply.
        """
        for key, value in data.items():
            if hasattr(self, key):
                setattr(self, key, value)
