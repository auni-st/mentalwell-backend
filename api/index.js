const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

let items = [
  {id: 1, name: 'Item 1'},
  {id: 2, name: 'Item 2'},
];

app.get('/items', (req, res) => {
  res.json(items);
})

// app.get('/', (req, res) => {
//   res.send('Hello, Vercel and Express.js!');
// });

// app.get('/api', (req, res) => {
//   res.send('Hello, this is API changed againnn');
// });

// app.get('/user', (req, res) => {
//   res.send('Hello, this is for showing all changed 12345600000 I CHANGED SOMETHING');
// });

// app.get('/auni', (req, res) => {
//   res.send('Hello, this is auni. ADA YANG BERUBAH');
// });

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});