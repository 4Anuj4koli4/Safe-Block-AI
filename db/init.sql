CREATE DATABASE IF NOT EXISTS crime_db;
USE crime_db;

CREATE TABLE IF NOT EXISTS crimes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    city VARCHAR(100),
    block_lat DECIMAL(6,3),
    block_lon DECIMAL(6,3),
    crime_type VARCHAR(100),
    severity_weight INT,
    is_night_crime BOOLEAN,
    incident_date DATETIME,
    description TEXT,
    -- Composite index for fast grid-based lookups
    INDEX idx_spatial_grid (block_lat, block_lon)
);
