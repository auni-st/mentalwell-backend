require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

//import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const patientRoutes = require('./routes/patientRoutes');
const psychologistRoutes = require('./routes/psychologistRoutes');
const articleRoutes = require('./routes/articleRoutes');

//set CORS
// Use CORS middleware with the desired options
app.use(cors({
  origin: '*',
}));

//use routes
app.use('/', authRoutes);
app.use('/', userRoutes);
app.use('/', patientRoutes);
app.use('/', psychologistRoutes);
app.use('/', articleRoutes);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
