const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello, World!123');
});

app.get('/api', (req, res) => {
  res.send(`Hello, It's me`);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`this is working!`);
  console.log(`I pushed again! it's working!`);
  console.log(`WORKING!!!!`);
  console.log(`Bla bla`);
  console.log('123456')
});