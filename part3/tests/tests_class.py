import unittest
from datetime import datetime

from app import create_app, db
from app.models.base import BaseModel
from app.models.user import User
from app.models.place import Place
from app.models.review import Review
from app.models.amenity import Amenity
from app.persistence.repository import SQLAlchemyRepository
from app.persistence.user_repository import UserRepository
from app.services.facade import HBnBFacade
import json


class DummyModel(BaseModel):
    __tablename__ = "dummy_model"

    name = db.Column(db.String(50), nullable=False)


class TestBaseModel(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        self.app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_base_model_has_id(self):
        obj = DummyModel(name="test")
        db.session.add(obj)
        db.session.commit()

        self.assertIsNotNone(obj.id)
        self.assertIsInstance(obj.id, str)

    def test_base_model_has_created_at(self):
        obj = DummyModel(name="test")
        db.session.add(obj)
        db.session.commit()

        self.assertIsNotNone(obj.created_at)
        self.assertIsInstance(obj.created_at, datetime)

    def test_base_model_has_updated_at(self):
        obj = DummyModel(name="test")
        db.session.add(obj)
        db.session.commit()

        self.assertIsNotNone(obj.updated_at)
        self.assertIsInstance(obj.updated_at, datetime)

    def test_save_persists_object(self):
        obj = DummyModel(name="persisted")
        obj.save()

        found = DummyModel.query.filter_by(name="persisted").first()
        self.assertIsNotNone(found)
        self.assertEqual(found.name, "persisted")

    def test_update_changes_attributes(self):
        obj = DummyModel(name="before")
        obj.save()

        obj.update({"name": "after"})
        db.session.commit()

        refreshed = DummyModel.query.get(obj.id)
        self.assertEqual(refreshed.name, "after")

# USER TEST


class TestUserModel(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        self.app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_create_user_valid(self):
        user = User(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            password="password123"
        )
        db.session.add(user)
        db.session.commit()

        self.assertEqual(user.first_name, "John")
        self.assertEqual(user.last_name, "Doe")
        self.assertEqual(user.email, "john@example.com")
        self.assertFalse(user.is_admin)

    def test_email_is_normalized(self):
        user = User(
            first_name="John",
            last_name="Doe",
            email="  JOHN@EXAMPLE.COM ",
            password="password123"
        )
        self.assertEqual(user.email, "john@example.com")

    def test_password_is_hashed(self):
        user = User(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            password="password123"
        )
        self.assertNotEqual(user.password, "password123")
        self.assertTrue(user.password.startswith("$2"))

    def test_verify_password_true(self):
        user = User(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            password="password123"
        )
        self.assertTrue(user.verify_password("password123"))

    def test_verify_password_false(self):
        user = User(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            password="password123"
        )
        self.assertFalse(user.verify_password("wrongpassword"))

    def test_invalid_first_name_type_raises(self):
        with self.assertRaises(TypeError):
            User(
                first_name=123,
                last_name="Doe",
                email="john@example.com",
                password="password123"
            )

    def test_empty_first_name_raises(self):
        with self.assertRaises(ValueError):
            User(
                first_name="   ",
                last_name="Doe",
                email="john@example.com",
                password="password123"
            )

    def test_invalid_last_name_type_raises(self):
        with self.assertRaises(TypeError):
            User(
                first_name="John",
                last_name=123,
                email="john@example.com",
                password="password123"
            )

    def test_invalid_email_type_raises(self):
        with self.assertRaises(TypeError):
            User(
                first_name="John",
                last_name="Doe",
                email=123,
                password="password123"
            )

    def test_invalid_email_format_raises(self):
        with self.assertRaises(ValueError):
            User(
                first_name="John",
                last_name="Doe",
                email="bad-email",
                password="password123"
            )

    def test_invalid_is_admin_type_raises(self):
        with self.assertRaises(TypeError):
            User(
                first_name="John",
                last_name="Doe",
                email="john@example.com",
                password="password123",
                is_admin="yes"
            )

    def test_update_first_name(self):
        user = User(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            password="password123"
        )
        user.save()

        user.update({"first_name": "Jane"})
        self.assertEqual(user.first_name, "Jane")

    def test_update_last_name(self):
        user = User(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            password="password123"
        )
        user.save()

        user.update({"last_name": "Smith"})
        self.assertEqual(user.last_name, "Smith")

    def test_update_email(self):
        user = User(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            password="password123"
        )
        user.save()

        user.update({"email": "new@example.com"})
        self.assertEqual(user.email, "new@example.com")

    def test_update_is_admin(self):
        user = User(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            password="password123"
        )
        user.save()

        user.update({"is_admin": True})
        self.assertTrue(user.is_admin)



# PLACE TEST

class TestPlaceModel(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        self.app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        self.user = User(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            password="password123"
        )
        db.session.add(self.user)
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_create_place_valid(self):
        place = Place(
            title="Cozy Apartment",
            description="Nice place",
            price=100,
            latitude=43.4,
            longitude=6.7,
            owner_id=self.user.id
        )
        db.session.add(place)
        db.session.commit()

        self.assertEqual(place.title, "Cozy Apartment")
        self.assertEqual(place.owner_id, self.user.id)

    def test_invalid_title_type_raises(self):
        with self.assertRaises(TypeError):
            Place(
                title=123,
                description="Nice place",
                price=100,
                latitude=43.4,
                longitude=6.7,
                owner_id=self.user.id
            )

    def test_empty_title_raises(self):
        with self.assertRaises(ValueError):
            Place(
                title="   ",
                description="Nice place",
                price=100,
                latitude=43.4,
                longitude=6.7,
                owner_id=self.user.id
            )

    def test_negative_price_raises(self):
        with self.assertRaises(ValueError):
            Place(
                title="Cozy Apartment",
                description="Nice place",
                price=-10,
                latitude=43.4,
                longitude=6.7,
                owner_id=self.user.id
            )

    def test_invalid_latitude_raises(self):
        with self.assertRaises(ValueError):
            Place(
                title="Cozy Apartment",
                description="Nice place",
                price=100,
                latitude=100,
                longitude=6.7,
                owner_id=self.user.id
            )

    def test_invalid_longitude_raises(self):
        with self.assertRaises(ValueError):
            Place(
                title="Cozy Apartment",
                description="Nice place",
                price=100,
                latitude=43.4,
                longitude=200,
                owner_id=self.user.id
            )

    def test_update_place(self):
        place = Place(
            title="Old title",
            description="Old desc",
            price=50,
            latitude=43.4,
            longitude=6.7,
            owner_id=self.user.id
        )
        place.save()

        place.update({
            "title": "New title",
            "price": 120
        })

        self.assertEqual(place.title, "New title")
        self.assertEqual(place.price, 120.0)


# REVIEW TEST

class TestReviewModel(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        self.app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        self.user = User(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            password="password123"
        )
        db.session.add(self.user)
        db.session.commit()

        self.place = Place(
            title="Cozy Apartment",
            description="Nice place",
            price=100,
            latitude=43.4,
            longitude=6.7,
            owner_id=self.user.id
        )
        db.session.add(self.place)
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_create_review_valid(self):
        review = Review(
            text="Great place",
            rating=5,
            place_id=self.place.id,
            owner_id=self.user.id
        )
        db.session.add(review)
        db.session.commit()

        self.assertEqual(review.text, "Great place")
        self.assertEqual(review.rating, 5)
        self.assertEqual(review.place_id, self.place.id)
        self.assertEqual(review.owner_id, self.user.id)

    def test_invalid_text_type_raises(self):
        with self.assertRaises(TypeError):
            Review(
                text=123,
                rating=5,
                place_id=self.place.id,
                owner_id=self.user.id
            )

    def test_empty_text_raises(self):
        with self.assertRaises(ValueError):
            Review(
                text="   ",
                rating=5,
                place_id=self.place.id,
                owner_id=self.user.id
            )

    def test_invalid_rating_type_raises(self):
        with self.assertRaises(TypeError):
            Review(
                text="Good",
                rating="5",
                place_id=self.place.id,
                owner_id=self.user.id
            )

    def test_rating_out_of_range_raises(self):
        with self.assertRaises(ValueError):
            Review(
                text="Good",
                rating=10,
                place_id=self.place.id,
                owner_id=self.user.id
            )

    def test_update_review(self):
        review = Review(
            text="Good",
            rating=4,
            place_id=self.place.id,
            owner_id=self.user.id
        )
        review.save()

        review.update({"text": "Excellent", "rating": 5})

        self.assertEqual(review.text, "Excellent")
        self.assertEqual(review.rating, 5)


# AMENITY TEST


class TestAmenityModel(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        self.app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_create_amenity_valid(self):
        amenity = Amenity(name="WiFi")
        db.session.add(amenity)
        db.session.commit()

        self.assertEqual(amenity.name, "WiFi")

    def test_empty_name_raises(self):
        with self.assertRaises(ValueError):
            Amenity(name="   ")

    def test_invalid_name_type_raises(self):
        with self.assertRaises(ValueError):
            Amenity(name=123)

    def test_update_name(self):
        amenity = Amenity(name="Pool")
        amenity.save()

        amenity.update({"name": "Swimming Pool"})

        self.assertEqual(amenity.name, "Swimming Pool")


# TEST REPOSITORY


class TestSQLAlchemyRepository(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        self.app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        self.repo = SQLAlchemyRepository(User)

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_add(self):
        user = User(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            password="password123"
        )
        self.repo.add(user)

        found = self.repo.get(user.id)
        self.assertIsNotNone(found)

    def test_get(self):
        user = User(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            password="password123"
        )
        self.repo.add(user)

        found = self.repo.get(user.id)
        self.assertEqual(found.email, "john@example.com")

    def test_get_all(self):
        user1 = User(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            password="password123"
        )
        user2 = User(
            first_name="Jane",
            last_name="Doe",
            email="jane@example.com",
            password="password123"
        )
        self.repo.add(user1)
        self.repo.add(user2)

        users = self.repo.get_all()
        self.assertEqual(len(users), 2)

    def test_update(self):
        user = User(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            password="password123"
        )
        self.repo.add(user)

        self.repo.update(user.id, {"first_name": "Updated"})
        updated = self.repo.get(user.id)

        self.assertEqual(updated.first_name, "Updated")

    def test_delete(self):
        user = User(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            password="password123"
        )
        self.repo.add(user)

        self.repo.delete(user.id)
        deleted = self.repo.get(user.id)

        self.assertIsNone(deleted)

    def test_get_by_attribute(self):
        user = User(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            password="password123"
        )
        self.repo.add(user)

        found = self.repo.get_by_attribute("email", "john@example.com")
        self.assertIsNotNone(found)
        self.assertEqual(found.first_name, "John")


# USER REPOSITORY TEST


class TestUserRepository(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        self.app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        self.repo = UserRepository()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_get_user_by_email(self):
        user = User(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            password="password123"
        )
        self.repo.add(user)

        found = self.repo.get_user_by_email("john@example.com")
        self.assertIsNotNone(found)
        self.assertEqual(found.email, "john@example.com")

    def test_get_user_by_email_returns_none(self):
        found = self.repo.get_user_by_email("missing@example.com")
        self.assertIsNone(found)


# TEST FACADE USER


class TestFacadeUsers(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        self.app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        self.facade = HBnBFacade()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_create_user(self):
        user = self.facade.create_user({
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "password": "password123"
        })

        self.assertIsNotNone(user.id)
        self.assertEqual(user.email, "john@example.com")
        self.assertNotEqual(user.password, "password123")

    def test_get_user(self):
        user = self.facade.create_user({
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "password": "password123"
        })

        found = self.facade.get_user(user.id)
        self.assertEqual(found.id, user.id)

    def test_get_user_by_email(self):
        self.facade.create_user({
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "password": "password123"
        })

        found = self.facade.get_user_by_email("john@example.com")
        self.assertIsNotNone(found)
        self.assertEqual(found.email, "john@example.com")

    def test_get_all_users(self):
        self.facade.create_user({
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "password": "password123"
        })
        self.facade.create_user({
            "first_name": "Jane",
            "last_name": "Doe",
            "email": "jane@example.com",
            "password": "password123"
        })

        users = self.facade.get_all_users()
        self.assertEqual(len(users), 2)

    def test_update_user(self):
        user = self.facade.create_user({
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "password": "password123"
        })

        updated = self.facade.update_user(user.id, {
            "first_name": "Updated"
        })

        self.assertEqual(updated.first_name, "Updated")

    def test_create_admin_user(self):
        user = self.facade.create_user({
            "first_name": "Admin",
            "last_name": "User",
            "email": "admin@example.com",
            "password": "admin123",
            "is_admin": True
        })

        self.assertIsNotNone(user.id)
        self.assertEqual(user.email, "admin@example.com")
        self.assertTrue(user.is_admin)


# TEST USER ENDPOINT


class TestAPIUsers(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        self.app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_create_user(self):
        payload = {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "password": "password123"
        }

        response = self.client.post(
            "/api/v1/users/",
            data=json.dumps(payload),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 201)
        data = response.get_json()
        self.assertIn("id", data)
        self.assertIn("is_admin", data)
        self.assertFalse(data["is_admin"])

    def test_create_user_duplicate_email(self):
        payload = {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "password": "password123"
        }

        self.client.post(
            "/api/v1/users/",
            data=json.dumps(payload),
            content_type="application/json"
        )

        response = self.client.post(
            "/api/v1/users/",
            data=json.dumps(payload),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "Email already registered")

    def test_create_admin_user(self):
        payload = {
            "first_name": "Admin",
            "last_name": "User",
            "email": "admin@example.com",
            "password": "admin123",
            "is_admin": True
        }

        response = self.client.post(
            "/api/v1/users/",
            data=json.dumps(payload),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 201)
        data = response.get_json()
        self.assertIn("id", data)
        self.assertIn("is_admin", data)
        self.assertTrue(data["is_admin"])

    def test_get_user(self):
        payload = {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "password": "password123"
        }

        create_response = self.client.post(
            "/api/v1/users/",
            data=json.dumps(payload),
            content_type="application/json"
        )
        user_id = create_response.get_json()["id"]

        response = self.client.get(f"/api/v1/users/{user_id}")
        self.assertEqual(response.status_code, 200)

        data = response.get_json()
        self.assertEqual(data["email"], "john@example.com")
        self.assertIn("is_admin", data)
        self.assertFalse(data["is_admin"])

    def test_get_user_not_found(self):
        response = self.client.get("/api/v1/users/not-found-id")
        self.assertEqual(response.status_code, 404)


# TEST API AUTH


class TestAPIAuth(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        self.app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        self.user_payload = {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "password": "password123"
        }

        self.client.post(
            "/api/v1/users/",
            data=json.dumps(self.user_payload),
            content_type="application/json"
        )

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_login_success(self):
        payload = {
            "email": "john@example.com",
            "password": "password123"
        }

        response = self.client.post(
            "/api/v1/auth/login",
            data=json.dumps(payload),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("access_token", data)

    def test_login_invalid_password(self):
        payload = {
            "email": "john@example.com",
            "password": "wrongpassword"
        }

        response = self.client.post(
            "/api/v1/auth/login",
            data=json.dumps(payload),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json()["error"], "Invalid credentials")

    def test_login_unknown_email(self):
        payload = {
            "email": "unknown@example.com",
            "password": "password123"
        }

        response = self.client.post(
            "/api/v1/auth/login",
            data=json.dumps(payload),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json()["error"], "Invalid credentials")
