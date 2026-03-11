-- Create place_amenity junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS place_amenity (
    place_id CHAR(36) NOT NULL,
    amenity_id CHAR(36) NOT NULL,
    PRIMARY KEY (place_id, amenity_id),
    CONSTRAINT fk_place_amenity_place
        FOREIGN KEY (place_id) REFERENCES places(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_place_amenity_amenity
        FOREIGN KEY (amenity_id) REFERENCES amenities(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);
