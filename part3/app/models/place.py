"""Place model representing a property listed in the HBnB application."""

from .base import BaseModel


class Place(BaseModel):
    """Represent a place listed by a user.

    A place is owned by a user and can contain amenities and reviews.
    It inherits from `BaseModel`, which provides:
        - id (UUID as string)
        - created_at timestamp
        - updated_at timestamp

    Attributes:
        title (str): Title of the place.
        description (str): Detailed description of the place.
        price (float): Price per stay.
        latitude (float): Geographic latitude (-90 to 90).
        longitude (float): Geographic longitude (-180 to 180).
        owner (str | User): Owner identifier or user object.
        reviews (list): List of associated reviews.
        amenities (list): List of associated amenities.
    """
    def __init__(self, title, description, price, latitude, longitude, owner):
        """Initialize a place instance with validated attributes.

        Args:
            title (str): Title of the place.
            description (str): Description of the place.
            price (float | int): Price value (must be >= 0).
            latitude (float | int): Latitude coordinate.
            longitude (float | int): Longitude coordinate.
            owner (str | User): Owner ID or User object.

        Raises:
            TypeError: If a value has an invalid type.
            ValueError: If a value does not meet validation rules.
        """
        super().__init__()
        self.title = self.validate_title(title)
        self.description = self.validate_description(description)
        self.price = self.validate_price(price)
        self.latitude = self.validate_latitude(latitude)
        self.longitude = self.validate_longitude(longitude)
        self.owner = self.validate_owner(owner)

        self.reviews = []
        self.amenities = []

    def validate_title(self, value):
        """Validate the place title value.

        Args:
            value (str): Candidate title.

        Returns:
            str: Validated title.
        """
        if not isinstance(value, str):
            raise TypeError("title must be a string")
        value = value.strip()
        if not value:
            raise ValueError("title is required")
        if len(value) > 100:
            raise ValueError("title max length is 100")
        return value

    def validate_description(self, value):
        """Validate the place description value.

        Args:
            value (str | None): Candidate description.

        Returns:
            str: Validated description.
        """
        if value is None:
            return ""
        if not isinstance(value, str):
            raise TypeError("description must be a string")
        value = value.strip()
        if len(value) > 1000:
            raise ValueError("description max length is 1000")
        return value

    def validate_price(self, value):
        """Validate the place price value.

        Args:
            value (int | float): Candidate price.

        Returns:
            float: Validated price.
        """
        if not isinstance(value, (float, int)):
            raise TypeError("price must be a number")
        value = float(value)
        if value < 0:
            raise ValueError("price must be >= 0")
        return value

    def validate_latitude(self, value):
        """Validate the latitude range (-90 to 90).

        Args:
            value (int | float): Candidate latitude.

        Returns:
            float: Validated latitude.
        """
        if not isinstance(value, (float, int)):
            raise TypeError("latitude must be a number")
        value = float(value)
        if value < -90 or value > 90:
            raise ValueError("latitude must be between -90 and 90")
        return value

    def validate_longitude(self, value):
        """Validate the longitude range (-180 to 180).

        Args:
            value (int | float): Candidate longitude.

        Returns:
            float: Validated longitude.
        """
        if not isinstance(value, (float, int)):
            raise TypeError("longitude must be a number")
        value = float(value)
        if value < -180 or value > 180:
            raise ValueError("longitude must be between -180 and 180")
        return value

    def  validate_owner(self, value):
        """Validate the owner reference.

        Owner can be:
            - a user ID (string)
            - a User object (must have an 'id' attribute)

        Args:
            value (str | User): Candidate owner reference.

        Returns:
            str | User: Validated owner reference.
        """
        if value is None:
            raise ValueError("owner is required")

        if isinstance(value, str):
            value = value.strip()
            if not value:
                raise ValueError("owner is required")
            return value

        if hasattr(value, "id"):
            return value

        raise TypeError("owner must be a user id (str) or a User object")

    def update(self, data):
        """Update place attributes using validated values.

        Args:
            data (dict): Dictionary containing fields to update.

        Only allowed fields can be modified:
            title, description, price, latitude, longitude, owner.
        """
        if not isinstance(data, dict):
            raise TypeError("data must be a dict")
        
        allowed = {"title", "description", "price", "latitude", "longitude", "owner"}
        changed = False

        for key, value in data.items():
            if key not in allowed:
                continue
            
            if key == "title":
                self.title = self.validate_title(value)
            elif key == "description":
                self.description = self.validate_description(value)
            elif key == "price":
                self.price = self.validate_price(value)
            elif key == "latitude":
                self.latitude = self.validate_latitude(value)
            elif key == "longitude":
                self.longitude = self.validate_longitude(value)
            elif key == "owner":
                self.owner = self.validate_owner(value)
            
            changed = True

    def add_review(self, review):
        """Attach a review to this place and persist the change.

        Args:
            review: Review object to attach.
        """
        self.reviews.append(review)
        self.save()

    def add_amenity(self, amenity):
        """Attach an amenity to this place and persist the change.

        Args:
            amenity: Amenity object to attach.
        """
        self.amenities.append(amenity)
        self.save()
