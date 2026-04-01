-- Insert initial data into the database

-- Insert Administrator User
INSERT INTO users (id, first_name, last_name, email, password, is_admin)
VALUES (
    '36c9050e-ddd3-4c3b-9731-9f487208bbc1',
    'Admin',
    'HBnB',
    'admin@hbnb.io',
    '$2b$12$6AbdYb1WWkL2T0LyPNaw9uamxMR90ck0MD0ZAFHn3ewDk8Ynqc4H6',
    1
)
ON CONFLICT(id) DO UPDATE SET
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    email = excluded.email,
    password = excluded.password,
    is_admin = excluded.is_admin;

-- Insert Initial Amenities
INSERT INTO amenities (id, name)
VALUES 
    ('2767d121-c1b4-4d16-a816-0f5113ab06d0', 'WiFi'),
    ('bcf813cf-1fd0-4a7f-b69d-d4167331aaa1', 'Swimming Pool'),
    ('32561383-c728-4ba3-9fd2-cb7ceab79fca', 'Air Conditioning')
ON CONFLICT(id) DO UPDATE SET
    name = excluded.name;

-- Insert Demo Places (aligned with index filter values 10/50/100)
INSERT INTO places (id, title, description, price, latitude, longitude, owner_id)
VALUES
    (
        'a77c1fc5-11a5-4f4d-a4c0-dfbd7473f560',
        'Budget Studio',
        'Small studio in city center, perfect for short stays.',
        10.0,
        48.8566,
        2.3522,
        '36c9050e-ddd3-4c3b-9731-9f487208bbc1'
    ),
    (
        'f5f4f20e-f9f3-4ad1-b95a-99d4b033de73',
        'Comfort Apartment',
        'Quiet apartment with balcony and fast WiFi.',
        50.0,
        43.2965,
        5.3698,
        '36c9050e-ddd3-4c3b-9731-9f487208bbc1'
    ),
    (
        '23d96ca7-37b7-4637-a71e-796f2e977f7e',
        'Premium Loft',
        'Spacious loft with full amenities and great view.',
        100.0,
        45.7640,
        4.8357,
        '36c9050e-ddd3-4c3b-9731-9f487208bbc1'
    )
ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    description = excluded.description,
    price = excluded.price,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    owner_id = excluded.owner_id,
    updated_at = CURRENT_TIMESTAMP;

-- Insert Demo Place/Amenity relations
INSERT INTO place_amenity (place_id, amenity_id)
VALUES
    ('a77c1fc5-11a5-4f4d-a4c0-dfbd7473f560', '2767d121-c1b4-4d16-a816-0f5113ab06d0'),
    ('f5f4f20e-f9f3-4ad1-b95a-99d4b033de73', '2767d121-c1b4-4d16-a816-0f5113ab06d0'),
    ('23d96ca7-37b7-4637-a71e-796f2e977f7e', '2767d121-c1b4-4d16-a816-0f5113ab06d0'),
    ('23d96ca7-37b7-4637-a71e-796f2e977f7e', 'bcf813cf-1fd0-4a7f-b69d-d4167331aaa1'),
    ('23d96ca7-37b7-4637-a71e-796f2e977f7e', '32561383-c728-4ba3-9fd2-cb7ceab79fca')
ON CONFLICT(place_id, amenity_id) DO NOTHING;
