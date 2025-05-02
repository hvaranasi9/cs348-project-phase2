-- Database initialization (force fresh start)
DROP DATABASE IF EXISTS user_allergy_tracker;
CREATE DATABASE user_allergy_tracker;
USE user_allergy_tracker;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    age INT NOT NULL CHECK (age BETWEEN 0 AND 120),
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Allergies table
CREATE TABLE IF NOT EXISTS allergies (
    allergy_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    severity ENUM('mild', 'moderate', 'severe') NOT NULL DEFAULT 'mild',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- UserAllergies junction table
CREATE TABLE IF NOT EXISTS user_allergies (
    user_allergy_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    allergy_id INT NOT NULL,
    notes TEXT,
    diagnosed_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    FOREIGN KEY (allergy_id) REFERENCES allergies(allergy_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    UNIQUE KEY (user_id, allergy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indexes
--CREATE INDEX idx_user_age ON users(age);
--CREATE INDEX idx_allergy_severity ON allergies(severity);



-- 1. Allows filtering and sorting users by age, useful for age-range searches and reports
CREATE INDEX idx_user_age ON users(age);

-- 2. Speeds up filtering allergies by severity in dropdowns and reports
CREATE INDEX idx_allergy_severity ON allergies(severity);

-- 3. Enables quick lookup of all allergies assigned to a specific user (e.g., user detail page)
CREATE INDEX idx_user_allergies_user_id ON user_allergies(user_id);

-- 4. Enables fast retrieval of all users sharing a specific allergy (e.g., for analytics or reports)
CREATE INDEX idx_user_allergies_allergy_id ON user_allergies(allergy_id);

-- 5. Allows sorting/filtering by diagnosed date, important for generating historical reports
CREATE INDEX idx_diagnosed_date ON user_allergies(diagnosed_date);

-- 6. Improves performance when sorting users by account creation date (e.g., in admin views)
CREATE INDEX idx_users_created_at ON users(created_at);

-- 7. Composite index to optimize queries that filter by both user and allergy (e.g., by severity via JOIN)
CREATE INDEX idx_user_allergies_user_severity ON user_allergies(user_id, allergy_id);


-- Sample data
INSERT INTO users (name, age, email) VALUES
('John Doe', 25, 'john@example.com'),
('Jane Smith', 30, 'jane@example.com');

INSERT INTO allergies (name, description, severity) VALUES
('Peanuts', 'Allergic to peanuts and tree nuts', 'severe'),
('Dust Mites', 'Mild allergic reaction to dust', 'mild');

INSERT INTO user_allergies (user_id, allergy_id, notes, diagnosed_date) VALUES
(1, 1, 'Carries epinephrine pen', '2015-06-10'),
(2, 2, 'Uses air purifier', '2020-01-20');