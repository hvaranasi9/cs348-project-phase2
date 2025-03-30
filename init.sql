-- Database initialization
CREATE DATABASE IF NOT EXISTS user_allergy_tracker;
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- UserAllergies junction table
CREATE TABLE IF NOT EXISTS user_allergies (
    user_allergy_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    allergy_id INT NOT NULL,
    notes TEXT,
    diagnosed_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (allergy_id) REFERENCES allergies(allergy_id) ON DELETE CASCADE,
    UNIQUE KEY (user_id, allergy_id) -- Prevent duplicate allergy entries
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indexes for performance
CREATE INDEX idx_user_age ON users(age);
CREATE INDEX idx_allergy_severity ON allergies(severity);

-- Sample data (optional)
INSERT INTO users (name, age, email) VALUES
('John Doe', 25, 'john@example.com'),
('Jane Smith', 30, 'jane@example.com'),
('Mike Johnson', 22, 'mike@example.com');

INSERT INTO allergies (name, description, severity) VALUES
('Peanuts', 'Allergic to peanuts and tree nuts', 'severe'),
('Dust Mites', 'Mild allergic reaction to dust', 'mild'),
('Pollen', 'Seasonal allergy', 'moderate'),
('Shellfish', 'Crustacean allergy', 'severe');

INSERT INTO user_allergies (user_id, allergy_id, notes, diagnosed_date) VALUES
(1, 1, 'Carries epinephrine pen', '2015-06-10'),
(1, 3, 'Worse in spring months', '2018-03-15'),
(2, 2, 'Uses air purifier at home', '2020-01-20'),
(3, 4, 'No shrimp or lobster', '2019-11-05');