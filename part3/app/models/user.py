"""User model definitions.

This module defines the user entity and validation helpers.
"""

import re
from .base import BaseModel
from app import bcrypt, db


class User(BaseModel):
    """Represent a user in the HBnB business layer."""

    __tablename__ = 'users'

    # Basic email pattern for common cases.
    EMAIL_PATTERN = r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"

    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(120), nullable=False, unique=True)
    password = db.Column(db.String(128), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)

    # Relationships to places and reviews tables.
    places = db.relationship(
        'Place',
        backref='owner',
        lazy=True,
        cascade='all, delete-orphan'
    )

    reviews = db.relationship(
        'Review',
        backref='owner',
        lazy=True,
    )

    def __init__(self, first_name, last_name, email, password, is_admin=False):
        """Initialize a user instance with validated fields.

        Args:
            first_name (str): User first name.
            last_name (str): User last name.
            email (str): User email address.
            is_admin (bool): Administrative flag.

        Raises:
            TypeError: If a provided value has an invalid type.
            ValueError: If a provided value violates validation rules.
        """
        super().__init__()

        self.first_name = self.validate_first_name(first_name)
        self.last_name = self.validate_last_name(last_name)
        self.email = self.validate_email(email)
        self.is_admin = self.validate_is_admin(is_admin)
        self.hash_password(password)

    def hash_password(self, password):
        """Hash the password using bcrypt.

            Args:
            password (str): Plain text password.
        """
        self.password = bcrypt.generate_password_hash(password).decode('utf-8')

    def verify_password(self, password):
        """Verify the provided password against the hashed password.

        Args:
            password (str): Plain text password.

        Returns:
            bool: True if the password is correct, False otherwise.
        """
        return bcrypt.check_password_hash(self.password, password)

    def validate_first_name(self, value):
        """Validate first-name rules.

        Args:
            value (str): Candidate first name.

        Returns:
            str: Validated first name.
        """
        if not isinstance(value, str):
            raise TypeError("first name must be a string")
        value = value.strip()
        if not value:
            raise ValueError("first name is required")
        if len(value) > 50:
            raise ValueError("first name max length is 50")
        return value

    def validate_last_name(self, value):
        """Validate last-name rules.

        Args:
            value (str): Candidate last name.

        Returns:
            str: Validated last name.
        """
        if not isinstance(value, str):
            raise TypeError("last name must be a string")
        # Remove leading and trailing spaces.
        value = value.strip()
        if not value:
            raise ValueError("last name is required")
        if len(value) > 50:
            raise ValueError("last name max length is 50")
        return value

    def validate_email(self, value):
        """Validate the email format.

        Args:
            value (str): Candidate email.

        Returns:
            str: Normalized and validated email.
        """
        if not isinstance(value, str):
            raise TypeError("email must be a string")
        value = value.strip().lower()
        if not value:
            raise ValueError("email is required")
        if " " in value:
            raise ValueError("email must not contain spaces")

        # Reject invalid email formats.
        if re.fullmatch(self.EMAIL_PATTERN, value) is None:
            raise ValueError("email format must be like john.doe@example.com")
        return value

    def validate_is_admin(self, value):
        """Validate the `is_admin` value type.

        Args:
            value (bool): Candidate admin flag.

        Returns:
            bool: Validated admin flag.
        """
        if not isinstance(value, bool):
            raise TypeError("is_admin must be a boolean")
        return value

    def update(self, data):
        """Update user fields with validation.

        Args:
            data (dict): Fields to update.
        """
        if not isinstance(data, dict):
            raise TypeError("data must be a dict")

        changed = False

        for key, value in data.items():

            if key == "first_name":
                self.first_name = self.validate_first_name(value)
                changed = True

            elif key == "last_name":
                self.last_name = self.validate_last_name(value)
                changed = True

            elif key == "email":
                self.email = self.validate_email(value)
                changed = True

            elif key == "is_admin":
                self.is_admin = self.validate_is_admin(value)
                changed = True

            elif key == "password":
                self.hash_password(value)
                changed = True

        # Update the timestamp only if something changed.
        if changed:
            self.save()
