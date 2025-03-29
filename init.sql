DROP DATABASE IF EXISTS login_demo;
CREATE DATABASE login_demo;
USE login_demo;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE,
  password VARCHAR(100)
);

INSERT INTO users (name, password)
VALUES 
  ('annie', '1234'),
  ('john', 'password'),
  ('alice', 'letmein');

-- Login success
SELECT * FROM users WHERE name = 'annie' AND password = '1234';

-- Login fail
SELECT * FROM users WHERE name = 'annie' AND password = 'wrongpassword';

-- View all
SELECT * FROM users;
SELECT COUNT(*) FROM users;
SELECT DATABASE();


