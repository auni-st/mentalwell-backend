const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const supabaseUrl = 'https://xobmwlomdcnugqxqcwzq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvYm13bG9tZGNudWdxeHFjd3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMjY4MzcsImV4cCI6MjAxNTYwMjgzN30.dw6wBFFtXJBZZDvW5W_qNHzRL-B7pm6-HQOCy1ABoK8';
const PORT = process.env.PORT || 3000;

const supabase = createClient(supabaseUrl, supabaseKey);

app.use(bodyParser.json());

let items = [
  {id: 1, name: 'Item 1'},
  {id: 2, name: 'Item 2'},
];

app.get('/data', async (req, res) => {
  try {
    const { data, error } = await supabase.from('items').select('*');
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching data from Supabase:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

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