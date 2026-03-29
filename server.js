const express = require('express');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve entire client folder as static files
app.use(express.static(path.join(__dirname, 'client')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'pages', 'index', 'index.html'));
});

app.listen(3000, () => console.log('Server running at http://localhost:3000'));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'pages', 'adminSide', 'dashboard.html'));
});

// http://localhost:3000/pages/adminSide/dashboard.html

app.use('/api/assessments', require('./routes/assessments'));