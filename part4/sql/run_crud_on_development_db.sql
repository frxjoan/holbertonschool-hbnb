-- Run CRUD tests against Flask development SQLite database
-- Run from part3/sql with: sqlite3 < run_crud_on_development_db.sql

.open ../instance/development.db
.bail on
PRAGMA foreign_keys = ON;

.read crud_tests.sql
