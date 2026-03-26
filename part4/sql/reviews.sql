-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    text TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    owner_id TEXT NOT NULL,
    place_id TEXT NOT NULL,
    CONSTRAINT uq_reviews_owner_place UNIQUE (owner_id, place_id),
    CONSTRAINT fk_reviews_user
        FOREIGN KEY (owner_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_reviews_place
        FOREIGN KEY (place_id) REFERENCES places(id)
        ON DELETE CASCADE
);