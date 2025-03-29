const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '|hD369;V|x3.', // Replace with your password
  database: 'login_demo'
});

// Test API endpoint
app.get('/api/users', (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

app.listen(3006, () => {
  console.log('Backend running on http://localhost:3006');
});