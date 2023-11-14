const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello, Vercel and Express.js!');
});

app.get('/api', (req, res) => {
  res.send('Hello, this is API changed');
});

app.get('/user', (req, res) => {
  res.send('Hello, this is for showing all Users');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});