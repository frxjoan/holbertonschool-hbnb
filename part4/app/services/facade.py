"""Facade layer for the HBnB application.

This module exposes the `HBnBFacade` class, the main entry point of the
application service layer. The facade centralizes business operations
(create, read, update, delete) and delegates persistence to repositories.

Covered domains:
- Users
- Amenities
- Places
- Reviews

It also enforces basic relationship integrity rules (existing owner,
existing amenities) while relying on model-level validation.
"""

from app.models.user import User
from app.models.amenity import Amenity
from app.models.place import Place
from app.models.review import Review
from app.persistence.repository import SQLAlchemyRepository
from app.persistence.user_repository import UserRepository


class HBnBFacade:
    """Central service layer for HBnB operations.

    This class provides high-level methods used by the API layer and delegates
    persistence to repository classes backed by SQLAlchemy.

    Attributes:
        user_repo: SQLAlchemy repository for `User` objects.
        place_repo: SQLAlchemy repository for `Place` objects.
        review_repo: SQLAlchemy repository for `Review` objects.
        amenity_repo: SQLAlchemy repository for `Amenity` objects.
    """
    def __init__(self):
        """Initialize the facade and its repositories.

        Note:
            This implementation uses SQLAlchemy-backed repositories while
            preserving a storage-agnostic service interface.
        """
        self.user_repo = UserRepository()
        self.place_repo = SQLAlchemyRepository(Place)
        self.review_repo = SQLAlchemyRepository(Review)
        self.amenity_repo = SQLAlchemyRepository(Amenity)

    # User operations.

    def create_user(self, user_data):
        """Create and persist a user.

        Args:
            user_data (dict): Data used to create the user.

        Returns:
            User: The newly created user instance.
        """
        user = User(**user_data)
        user.hash_password(user_data['password'])
        self.user_repo.add(user)
        return user

    def get_user(self, user_id):
        """Retrieve a user by ID.

        Args:
            user_id (str): User identifier.

        Returns:
            User | None: Matching user, or `None` if not found.
        """
        return self.user_repo.get(user_id)

    def get_user_by_email(self, email):
        """Retrieve a user by email.

        Args:
            email (str): Email address to search.

        Returns:
            User | None: Matching user, or `None` if not found.
        """
        return self.user_repo.get_user_by_email(email)

    def get_all_users(self):
        """Retrieve the full list of users.

        Returns:
            list[User]: All users currently stored in the repository.
        """
        return self.user_repo.get_all()

    def update_user(self, user_id, user_data):
        """Update an existing user.

        Args:
            user_id (str): Identifier of the user to update.
            user_data (dict): Fields to update.

        Returns:
            User | None: Updated user, or `None` if not found.
        """
        self.user_repo.update(user_id, user_data)
        return self.get_user(user_id)

    # Amenity operations.

    def create_amenity(self, amenity_data):
        """Create a new amenity.

        Args:
            amenity_data (dict): Amenity creation payload.

        Returns:
            Amenity: Newly created amenity.
        """
        amenity = Amenity(**amenity_data)
        self.amenity_repo.add(amenity)
        return amenity

    def get_amenity(self, amenity_id):
        """Retrieve an amenity by ID.

        Args:
            amenity_id (str): Amenity identifier.

        Returns:
            Amenity | None: Matching amenity, or `None` if not found.
        """
        return self.amenity_repo.get(amenity_id)

    def get_amenity_by_name(self, amenity_name):
        """Retrieve an amenity by name.

        Args:
            amenity_name (str): Amenity name.

        Returns:
            Amenity | None: Matching amenity, or `None` if not found.
        """
        return self.amenity_repo.get_by_attribute("name", amenity_name)

    def get_all_amenities(self):
        """Retrieve all amenities.

        Returns:
            list[Amenity]: List of all amenities.
        """
        return self.amenity_repo.get_all()

    def update_amenity(self, amenity_id, amenity_data):
        """Update an existing amenity."""
        amenity = self.amenity_repo.get(amenity_id)
        if amenity is None:
            return None

        self.amenity_repo.update(amenity_id, amenity_data)
        return self.get_amenity(amenity_id)

    # Place operations.

    def create_place(self, place_data):
        """Create a new place."""
        data = dict(place_data)
        amenity_ids = data.pop("amenities", [])

        place = Place(**data)

        for amenity_id in amenity_ids:
            amenity = self.amenity_repo.get(amenity_id)
            if amenity is None:
                raise ValueError(f"Amenity not found: {amenity_id}")
            place.amenities.append(amenity)

        self.place_repo.add(place)
        return place

    def get_place(self, place_id):
        """Retrieve a place by ID.

        Args:
            place_id (str): Place identifier.

        Returns:
            Place | None: Matching place, or `None` if not found.
        """
        return self.place_repo.get(place_id)

    def get_all_places(self):
        """Retrieve all places.

        Returns:
            list[Place]: All places currently stored in the repository.
        """
        return self.place_repo.get_all()

    def update_place(self, place_id, place_data):
        """Update an existing place."""
        place = self.place_repo.get(place_id)
        if place is None:
            return None

        data = dict(place_data)
        amenity_ids = data.pop("amenities", None)

        if data:
            self.place_repo.update(place_id, data)

        if amenity_ids is not None:
            amenities = []
            for amenity_id in amenity_ids:
                amenity = self.amenity_repo.get(amenity_id)
                if amenity is None:
                    raise ValueError(f"Amenity not found: {amenity_id}")
                amenities.append(amenity)
            place.amenities = amenities
            place.save()

        return self.get_place(place_id)

    # Review operations.

    def create_review(self, review_data):
        """Create a new review."""
        review = Review(**review_data)
        self.review_repo.add(review)
        return review

    def get_review(self, review_id):
        """Retrieve a review by ID.

        Args:
            review_id (str): Review identifier.

        Returns:
            Review | None: Matching review, or `None` if not found.
        """
        return self.review_repo.get(review_id)

    def get_all_reviews(self):
        """Retrieve all reviews.

        Returns:
            list[Review]: All persisted reviews.
        """
        return self.review_repo.get_all()

    def get_reviews_by_place(self, place_id):
        """Return reviews for a given place.

        Args:
            place_id (str): Place identifier.

        Returns:
            list[Review] | None: Reviews list, or `None` if place not found.
        """
        place = self.place_repo.get(place_id)
        if place is None:
            return None
        return list(place.reviews or [])

    def update_review(self, review_id, review_data):
        """Update an existing review."""
        review = self.review_repo.get(review_id)
        if review is None:
            return None

        self.review_repo.update(review_id, review_data)
        return self.get_review(review_id)

    def delete_review(self, review_id):
        """Delete a review.

        Args:
            review_id (str): Identifier of the review to delete.

        Returns:
            bool: `True` if deleted, otherwise `False`.
        """
        review = self.review_repo.get(review_id)
        if review is None:
            return False

        self.review_repo.delete(review_id)
        return True
