"""Place model representing a property listed in the HBnB application."""

from .base import BaseModel
from app import db
from .amenity import place_amenity


class Place(BaseModel):
    """Represent a place listed by a user."""

    __tablename__ = 'places'

    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(1000), default="")
    price = db.Column(db.Float, nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)

    owner_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)

    reviews = db.relationship(
        'Review',
        backref='place',
        lazy=True,
        cascade='all, delete-orphan'
    )

    amenities = db.relationship(
        'Amenity',
        secondary=place_amenity,
        lazy='subquery',
        backref=db.backref('places', lazy=True)
    )

    def __init__(self, title, description, price, latitude, longitude, owner_id):
        """Initialize a place instance with validated attributes."""
        super().__init__()
        self.title = self.validate_title(title)
        self.description = self.validate_description(description)
        self.price = self.validate_price(price)
        self.latitude = self.validate_latitude(latitude)
        self.longitude = self.validate_longitude(longitude)
        self.owner_id = self.validate_owner_id(owner_id)

    def validate_title(self, value):
        """Validate the place title."""
        if not isinstance(value, str):
            raise TypeError("title must be a string")
        value = value.strip()
        if not value:
            raise ValueError("title is required")
        if len(value) > 100:
            raise ValueError("title max length is 100")
        return value

    def validate_description(self, value):
        """Validate and normalize the place description."""
        if value is None:
            return ""
        if not isinstance(value, str):
            raise TypeError("description must be a string")
        value = value.strip()
        if len(value) > 1000:
            raise ValueError("description max length is 1000")
        return value

    def validate_price(self, value):
        """Validate the place nightly price."""
        if not isinstance(value, (float, int)):
            raise TypeError("price must be a number")
        value = float(value)
        if value < 0:
            raise ValueError("price must be >= 0")
        return value

    def validate_latitude(self, value):
        """Validate latitude bounds."""
        if not isinstance(value, (float, int)):
            raise TypeError("latitude must be a number")
        value = float(value)
        if value < -90 or value > 90:
            raise ValueError("latitude must be between -90 and 90")
        return value

    def validate_longitude(self, value):
        """Validate longitude bounds."""
        if not isinstance(value, (float, int)):
            raise TypeError("longitude must be a number")
        value = float(value)
        if value < -180 or value > 180:
            raise ValueError("longitude must be between -180 and 180")
        return value

    def validate_owner_id(self, value):
        """Validate owner identifier."""
        if not isinstance(value, str):
            raise TypeError("owner_id must be a string")
        value = value.strip()
        if not value:
            raise ValueError("owner_id is required")
        return value

    def update(self, data):
        """Update mutable place fields and persist changes when needed."""
        if not isinstance(data, dict):
            raise TypeError("data must be a dict")

        allowed = {"title", "description", "price", "latitude", "longitude", "owner_id"}
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
            elif key == "owner_id":
                self.owner_id = self.validate_owner_id(value)

            changed = True

        if changed:
            self.save()

    def add_review(self, review):
        """Attach a review to this place and persist the relation."""
        self.reviews.append(review)
        self.save()

    def add_amenity(self, amenity):
        """Attach an amenity to this place and persist the relation."""
        self.amenities.append(amenity)
        self.save()
