"""User-specific repository implementation."""

from app.models.user import User
from app import db
from app.persistence.repository import SQLAlchemyRepository

class UserRepository(SQLAlchemyRepository):
    """Repository specialized for ``User`` queries."""

    def __init__(self):
        """Initialize the repository with the ``User`` model."""
        super().__init__(User)

    def get_user_by_email(self, email):
        """Return a user by email address, or ``None`` if not found."""
        return self.model.query.filter_by(email=email).first()
