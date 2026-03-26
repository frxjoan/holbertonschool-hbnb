-- CRUD smoke tests for HBnB schema
-- Run after table creation scripts and insert_data.sql

-- ========== READ base data ==========
SELECT id, email, is_admin FROM users WHERE email = 'admin@hbnb.io';
SELECT id, name FROM amenities ORDER BY name;

-- ========== CREATE ==========
INSERT INTO places (id, title, description, price, latitude, longitude, owner_id)
VALUES (
    '5be7d947-f95f-4b9f-a34f-f6f11f0dbf39',
    'Test Place',
    'Place created by CRUD test',
    99.99,
    48.8566,
    2.3522,
    '36c9050e-ddd3-4c3b-9731-9f487208bbc1'
);

INSERT INTO reviews (id, text, rating, owner_id, place_id)
VALUES (
    '97cb86db-18f7-4698-8976-26872f62f8ca',
    'Great stay',
    5,
    '36c9050e-ddd3-4c3b-9731-9f487208bbc1',
    '5be7d947-f95f-4b9f-a34f-f6f11f0dbf39'
);

INSERT INTO place_amenity (place_id, amenity_id)
VALUES (
    '5be7d947-f95f-4b9f-a34f-f6f11f0dbf39',
    '2767d121-c1b4-4d16-a816-0f5113ab06d0'
);

-- ========== READ ==========
SELECT p.id, p.title, p.owner_id, a.name AS amenity_name
FROM places p
LEFT JOIN place_amenity pa ON pa.place_id = p.id
LEFT JOIN amenities a ON a.id = pa.amenity_id
WHERE p.id = '5be7d947-f95f-4b9f-a34f-f6f11f0dbf39';

SELECT r.id, r.text, r.rating, r.owner_id, r.place_id
FROM reviews r
WHERE r.place_id = '5be7d947-f95f-4b9f-a34f-f6f11f0dbf39';

-- ========== UPDATE ==========
UPDATE places
SET price = 109.50,
    description = 'Updated by CRUD test'
WHERE id = '5be7d947-f95f-4b9f-a34f-f6f11f0dbf39';

UPDATE reviews
SET text = 'Updated review text',
    rating = 4
WHERE id = '97cb86db-18f7-4698-8976-26872f62f8ca';

SELECT id, title, price, description
FROM places
WHERE id = '5be7d947-f95f-4b9f-a34f-f6f11f0dbf39';

SELECT id, text, rating
FROM reviews
WHERE id = '97cb86db-18f7-4698-8976-26872f62f8ca';

-- ========== CONSTRAINT CHECKS (expected errors if executed) ==========
-- Duplicate review for same user/place should fail:
-- INSERT INTO reviews (id, text, rating, owner_id, place_id)
-- VALUES ('e5667cc4-9adb-4042-85c7-df9bf4c1e4b7', 'Second review same user/place', 3,
--         '36c9050e-ddd3-4c3b-9731-9f487208bbc1', '5be7d947-f95f-4b9f-a34f-f6f11f0dbf39');

-- Rating out of range should fail:
-- INSERT INTO reviews (id, text, rating, owner_id, place_id)
-- VALUES ('8cdfd21b-5f06-43ec-ae8e-eb8b7a85f4fd', 'Invalid rating', 6,
--         '36c9050e-ddd3-4c3b-9731-9f487208bbc1', '5be7d947-f95f-4b9f-a34f-f6f11f0dbf39');

-- ========== DELETE ==========
DELETE FROM place_amenity
WHERE place_id = '5be7d947-f95f-4b9f-a34f-f6f11f0dbf39';

DELETE FROM reviews
WHERE id = '97cb86db-18f7-4698-8976-26872f62f8ca';

DELETE FROM places
WHERE id = '5be7d947-f95f-4b9f-a34f-f6f11f0dbf39';

SELECT id FROM places WHERE id = '5be7d947-f95f-4b9f-a34f-f6f11f0dbf39';
SELECT id FROM reviews WHERE id = '97cb86db-18f7-4698-8976-26872f62f8ca';
