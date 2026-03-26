-- Initialize Flask development SQLite database used by config.py
-- Run from part3/sql with: sqlite3 < init_development_db.sql

.open ../instance/development.db
.bail on

PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS place_amenity;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS places;
DROP TABLE IF EXISTS amenities;
DROP TABLE IF EXISTS users;

PRAGMA foreign_keys = ON;

.read users.sql
.read amenities.sql
.read places.sql
.read reviews.sql
.read place_amenity.sql
.read insert_data.sql

-- Quick smoke output
SELECT id, email, is_admin FROM users WHERE email = 'admin@hbnb.io';
SELECT COUNT(*) AS places_count FROM places;
SELECT COUNT(*) AS reviews_count FROM reviews;
