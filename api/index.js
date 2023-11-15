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

app.get('/items/:id', (req, res) => {
  const itemId = parseInt(req.params.id);
  const item = items.find((item) => item.id === itemId);

  if (item) {
    res.json(item);
  } else {
    res.status(404).json({ message: 'Item not found' });
  }
})

app.post('/items', (req, res) => {
  const newItem = req.body;
  newItem.id = items.length + 1;
  items.push(newItem);
  res.status(201).json(newItem);
})

app.put('/items/:id', (req, res) => {
  const itemId = parseInt(req.params.id);
  const updatedItem = req.body;
  const index = items.findIndex((item) => item.id === itemId);

  if (index !== -1) {
    items[index] = { ...items[index], ...updatedItem };
    res.json(items[index]);
  } else {
    res.status(404).json({ message: 'Item not found' });
  }
})

app.delete('/items/:id', (req, res) => {
  const itemId = parseInt(req.params.id);
  items = items.filter((item) => item.id !== itemId);
  res.json({ message: 'Item deleted successfully' });
});

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