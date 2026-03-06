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

from app.persistence import InMemoryRepository
from app.models.user import User
from app.models.amenity import AmenityModel
from app.models.place import Place
from app.models.review import Review


class HBnBFacade:
    """Central service layer for HBnB operations.

    This class provides high-level methods (create/get/update/list/delete)
    used by the API layer. It decouples controllers from persistence details
    and applies consistency rules across entities.

    Attributes:
        user_repo: In-memory repository for `User` objects.
        place_repo: In-memory repository for `Place` objects.
        review_repo: In-memory repository for `Review` objects.
        amenity_repo: In-memory repository for `AmenityModel` objects.
    """
    def __init__(self):
        """Initialize the facade and its repositories.

        Note:
            This implementation uses in-memory repositories. The facade remains
            storage-agnostic and can later be wired to a database-backed layer
            without changing its public interface.
        """
        self.user_repo = InMemoryRepository()
        self.place_repo = InMemoryRepository()
        self.review_repo = InMemoryRepository()
        self.amenity_repo = InMemoryRepository()

    # ---------------------------------------------------------------------
    # Users
    # ---------------------------------------------------------------------

    def create_user(self, user_data):
        """Create and persist a user.

        Args:
            user_data (dict): Data used to create the user.

        Returns:
            User: The newly created user instance.
        """
        user = User(**user_data)
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
        return self.user_repo.get_by_attribute("email", email)

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

    # ---------------------------------------------------------------------
    # Amenities
    # ---------------------------------------------------------------------

    def create_amenity(self, amenity_data):
        """Create a new amenity.

        Args:
            amenity_data (dict): Amenity creation payload.

        Returns:
            AmenityModel: Newly created amenity.
        """
        amenity = AmenityModel(**amenity_data)
        self.amenity_repo.add(amenity)
        return amenity

    def get_amenity(self, amenity_id):
        """Retrieve an amenity by ID.

        Args:
            amenity_id (str): Amenity identifier.

        Returns:
            AmenityModel | None: Matching amenity, or `None` if not found.
        """
        return self.amenity_repo.get(amenity_id)

    def get_amenity_by_name(self, amenity_name):
        """Retrieve an amenity by name.

        Args:
            amenity_name (str): Amenity name.

        Returns:
            AmenityModel | None: Matching amenity, or `None` if not found.
        """
        return self.amenity_repo.get_by_attribute("name", amenity_name)

    def get_all_amenities(self):
        """Retrieve all amenities.

        Returns:
            list[AmenityModel]: List of all amenities.
        """
        return self.amenity_repo.get_all()

    def update_amenity(self, amenity_id, amenity_data):
        """Update an existing amenity.

        Args:
            amenity_id (str): Amenity identifier.
            amenity_data (dict): Fields to update.

        Returns:
            AmenityModel | None: Updated amenity, or `None` if not found.
        """
        amenity = self.amenity_repo.get(amenity_id)
        if not amenity:
            return None
        amenity.update(amenity_data)
        amenity.save()
        return amenity

    # ---------------------------------------------------------------------
    # Places
    # ---------------------------------------------------------------------

    def create_place(self, place_data):
        """Create a `Place` after validating linked entities.

        Applied rules:
            - `place_data` must be a dictionary.
            - Required fields must be present.
            - `owner_id` must reference an existing user.
            - `amenities` must reference existing amenity IDs.

        Args:
            place_data (dict): Place creation payload.

        Returns:
            Place: The newly created place instance.

        Raises:
            TypeError: If input types are invalid.
            ValueError: If a required field is missing or a relation is invalid.
        """
        if not isinstance(place_data, dict):
            raise TypeError("place_data must be a dict")

        required = ["title", "price", "latitude", "longitude", "owner_id", "amenities"]
        for k in required:
            if k not in place_data:
                raise ValueError(f"{k} is required")

        owner_id = place_data.get("owner_id")
        owner = self.user_repo.get(owner_id)
        if owner is None:
            raise ValueError("Owner not found")

        amenity_ids = place_data.get("amenities", [])
        if not isinstance(amenity_ids, list):
            raise TypeError("amenities must be a list of amenity IDs")

        amenities = []
        for aid in amenity_ids:
            a = self.amenity_repo.get(aid)
            if a is None:
                raise ValueError("Amenity not found")
            amenities.append(a)

        place = Place(
            title=place_data.get("title"),
            description=place_data.get("description", ""),
            price=place_data.get("price"),
            latitude=place_data.get("latitude"),
            longitude=place_data.get("longitude"),
            owner=owner_id,
        )

        place.amenities = amenities
        place.reviews = []

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
        """Update an existing place with consistency checks.

        Applied rules:
            - The target place must exist.
            - `place_data` must be a dictionary.
            - `owner_id` (if provided) must exist.
            - `amenities` (if provided) must contain existing IDs.
            - Only allowed fields are applied to the model.

        Args:
            place_id (str): Identifier of the place to update.
            place_data (dict): Update payload.

        Returns:
            bool: `True` when updated, `False` if the place is not found.

        Raises:
            TypeError: If input types are invalid.
            ValueError: If owner/amenity relations are invalid.
        """
        place = self.place_repo.get(place_id)
        if place is None:
            return False

        if not isinstance(place_data, dict):
            raise TypeError("place_data must be a dict")

        if "owner_id" in place_data:
            new_owner = self.user_repo.get(place_data["owner_id"])
            if new_owner is None:
                raise ValueError("Owner not found")
            place_data = dict(place_data)
            place_data["owner"] = place_data.pop("owner_id")

        if "amenities" in place_data:
            amenity_ids = place_data["amenities"]
            if not isinstance(amenity_ids, list):
                raise TypeError("amenities must be a list of amenity IDs")

            new_amenities = []
            for aid in amenity_ids:
                a = self.amenity_repo.get(aid)
                if a is None:
                    raise ValueError("Amenity not found")
                new_amenities.append(a)
            place.amenities = new_amenities

        allowed_for_place = {k: v for k, v in place_data.items()
                             if k in {"title", "description", "price", "latitude", "longitude", "owner"}}
        if allowed_for_place:
            place.update(allowed_for_place)
            place.save()

        return True

    # ---------------------------------------------------------------------
    # Reviews
    # ---------------------------------------------------------------------

    def create_review(self, review_data):
        """Create a review linked to an existing user and place.

        Args:
            review_data (dict): Review creation payload.

        Returns:
            Review: The newly created review.

        Raises:
            TypeError: If `review_data` is not a dictionary.
            ValueError: If a required field is missing or user/place is not found.
        """
        if not isinstance(review_data, dict):
            raise TypeError("review_data must be a dict")

        for k in ("text", "rating", "user_id", "place_id"):
            if k not in review_data:
                raise ValueError(f"{k} is required")

        user = self.user_repo.get(review_data["user_id"])
        if user is None:
            raise ValueError("User not found")

        place = self.place_repo.get(review_data["place_id"])
        if place is None:
            raise ValueError("Place not found")

        existing_review_ids = getattr(place, "reviews", []) or []
        for rid in existing_review_ids:
            existing = self.review_repo.get(rid)
            if existing and getattr(existing, "user", None) and getattr(existing.user, "id", None) == user.id:
                raise ValueError("User has already reviewed this place")

        review = Review(
            text=review_data["text"],
            rating=review_data["rating"],
            place=place,
            user=user,
        )
        self.review_repo.add(review)

        if place.reviews is None:
            place.reviews = []
        place.reviews.append(review.id)
        place.save()

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
        """Return reviews for a given place in serialized form.

        Args:
            place_id (str): Place identifier.

        Returns:
            list[dict] | None: List `[{id, text, rating}, ...]`, or `None`
            if the place does not exist.
        """
        place = self.place_repo.get(place_id)
        if place is None:
            return None

        review_ids = getattr(place, "reviews", []) or []
        out = []
        for rid in review_ids:
            r = self.review_repo.get(rid)
            if r:
                out.append({"id": r.id, "text": r.text, "rating": r.rating})
        return out

    def update_review(self, review_id, review_data):
        """Update an existing review.

        Args:
            review_id (str): Review identifier.
            review_data (dict): Fields to update.

        Returns:
            bool: `True` if the update is applied, otherwise `False`.
        """
        review = self.review_repo.get(review_id)
        if review is None:
            return False
        review.update(review_data)
        return True

    def delete_review(self, review_id):
        """Delete a review and clean its reference from the place.

        Args:
            review_id (str): Identifier of the review to delete.

        Returns:
            bool: `True` if deleted, otherwise `False`.
        """
        review = self.review_repo.get(review_id)
        if review is None:
            return False

        place = review.place
        if place and getattr(place, "reviews", None):
            if review_id in place.reviews:
                place.reviews.remove(review_id)
                place.save()

        self.review_repo.delete(review_id)
        return True
