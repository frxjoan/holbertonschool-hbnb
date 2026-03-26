-- Create places table
CREATE TABLE IF NOT EXISTS places (
    id TEXT PRIMARY KEY,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    title TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    latitude REAL,
    longitude REAL,
    owner_id TEXT NOT NULL,
    CONSTRAINT fk_places_owner
        FOREIGN KEY (owner_id) REFERENCES users(id)
        ON DELETE CASCADE
);
