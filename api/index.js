require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");

const app = express();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const PORT = process.env.PORT || 3000;

const supabase = createClient(supabaseUrl, supabaseKey);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
const phoneRegex = /^\d{1,13}$/;

app.use(bodyParser.json());

// routes
app.get('/helloWorld', async (req, res) => {
  res.json({ message: 'HELLO WORLD!' })
})

// app.get('/users', async (req, res) => {
//   const { data, error } = await supabase.from('users').select('*');
//   res.json(data);
// })

app.post('/login', async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Check if the user exists in Supabase
    const { data, error } = await supabase.from('users').select('id, email, password, name, role').eq('email', email).single();
    const passwordMatch = await bcrypt.compare(password, data.password)

    if (passwordMatch) {
      let token;
      try {
        token = jwt.sign(
          { id: data.id, email: data.email, name: data.name, role: data.role },
          "secretkeyappearshere",
          { expiresIn: "1w" }
        );
        res.status(200).json({ message: 'success', data: { id: data.id, email: data.email, name: data.name, role: data.role, token: token } })
      } catch (err) {
        console.log(err);
        const error = new Error("Error! Something went wrong.");
        return next(error);
      }
    } else {
      res.status(401).json({ message: 'invalid credentials' })
    }

  } catch (error) {
    console.error('Supabase error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }

})

app.get('/accessResource', (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  //Authorization: 'Bearer TOKEN'
  if (!token) {
    res.status(200).json({ message: 'error! token was not provided' })
  }

  //Decode token
  const decodedToken = jwt.verify(token, "secretkeyappearshere");
  res.status(200).json({ message: 'success', data: { id: decodedToken.id, email: decodedToken.email, name: decodedToken.name, role: decodedToken.role } });
})


app.post('/users', async (req, res) => {
  const { email, password, password_confirm, phone_number, role = 'patient' } = req.body;

  //email validation
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  //password validation
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ error: 'Invalid password format. Password must be at least 8 characters, with letters and numbers' });
  }

  //password_confirm check
  if (password !== password_confirm) {
    return res.status(400).json({ error: 'Password confirmation does not match password' })
  }
  //phone_number validation
  if (!phoneRegex.test(phone_number)) {
    return res.status(400).json({ error: 'Phone number must be less than 14 digits' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  //check if email exists
  const { data: existingEmail, error: selectError } = await supabase.from('users').select('email').eq('email', email);

  if (selectError) {
    console.error('Supabase Select Error:', selectError.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }

  if (existingEmail.length > 0) {
    return res.status(400).json({ error: 'Email is already taken' });
  }

  //insert to users table
  const { data, e } = await supabase.from('users').upsert([{ email, password: hashedPassword, phone_number, role }], { onConflict: ['email'] });

  //insert to patients table if role == patient and insert to psychologists table if role == psychologist
  const getUserRole = await supabase.from('users').select('role').order('created_at', { ascending: false }).limit(1);
  const getUserRoleOnly = getUserRole.data[0].role;
  const userId = await supabase.from('users').select('id').order('created_at', { ascending: false }).limit(1);
  const userIdOnly = userId.data[0].id;

  if (getUserRoleOnly == 'patient') {
    const { patient } = await supabase.from('patients').upsert([{ user_id: userIdOnly }])
  } else if (getUserRoleOnly == 'psychologist') {
    const { psychologist } = await supabase.from('psychologists').upsert([{ user_id: userIdOnly }])

  }

  //show user
  const createdUser = await supabase.from('users').select('*').order('created_at', { ascending: false }).limit(1);

  const { error, status, statusText, count, ...cleanedData } = createdUser;
  const cleanedDataObject = cleanedData.data[0];
  const cleanedDataOnly = {
    email: cleanedDataObject.email,
    phone_number: cleanedDataObject.phone_number,
    created_at: cleanedDataObject.created_at
  }

  if (e) {
    res.status(500).json({ error: 'user not created' });
  }

  res.status(201).json({ message: 'registration success', cleanedDataOnly });
})

app.post('/articles', async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  //Authorization: 'Bearer TOKEN'
  if (!token) {
    res.status(200).json({ message: 'error! token was not provided' })
  }

  //Decode token
  const currentUser = jwt.verify(token, "secretkeyappearshere");
  const psychologistId = await supabase.from('psychologists').select('id').eq('user_id', currentUser.id).single();

  if (currentUser.role !== "psychologist") {
    res.status(401).json({ message: 'create article can only be done by psychologist!' })
  }

  const { title, content, references } = req.body
  const { data, e } = await supabase.from('articles').upsert([{ psychologist_id: psychologistId.data.id, title, content, references }]);

  const createdArticle = await supabase.from('articles').select('psychologist_id, title, content, references').order('created_at', { ascending: false }).limit(1);
  res.status(201).json({ message: 'article create success', data: { author: currentUser.name, title: createdArticle.data[0].title, content: createdArticle.data[0].content, references: createdArticle.data[0].references } })

})

app.get('/articles', async (req, res) => {
  const { data, error } = await supabase.from('articles').select('id, title, content, created_at');
  res.json(data);
})

app.get('/articles/:id', async (req, res) => {
  const articleId = req.params.id;
  try {
    const { data, e } = await supabase.from('articles').select('*').eq('id', articleId);
    const psychologistData = data[0].psychologist_id;

    const psychologistName = await supabase.from('psychologists').select(`id, users (name)`).eq('id', psychologistData)
    const { error, status, statusText, count, ...cleanedData } = psychologistName;
    const nameOnlyObject = cleanedData.data[0].users.name;

    if (e) throw e;

    res.json({ data: { author: nameOnlyObject, title: data[0].title, content: data[0].content, references: data[0].references, created_at: data[0].created_at } });
  } catch (e) {
    console.error('Error fetching data from Supabase:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }

})

app.get('/psychologists', async (req, res) => {
  const { data, e } = await supabase.from('psychologists').select('user_id, topics, availability');
  const userIds = data.map(item => item.user_id)
  const { data: usersData, error } = await supabase.from('users').select('id, name').in('id', userIds);
  const usersMap = new Map(usersData.map(user => [user.id, user.name]));

  const updatedData = data.map(item => ({
    name: usersMap.get(item.user_id),
    topics: item.topics,
    availability: item.availability
  }));

  res.json({ updatedData });
})

app.get('/psychologists/:id', async (req, res) => {
  const psychologistId = req.params.id;
  const { data, e } = await supabase.from('psychologists').select('user_id, bio, topics, availability, experience').eq('id', psychologistId);
  const userId = data.map(item => item.user_id)
  const { data: usersData, error } = await supabase.from('users').select('id, name').in('id', userId);
  const usersMap = new Map(usersData.map(user => [user.id, user.name]));

  const reviews = await supabase.from('psychologists').select('id, counselings (review, patients (users (name)))').eq('id', psychologistId)

  const patientsReview = reviews.data[0].counselings.map(counseling => ({
    patient_name: counseling.patients?.users.name,
    review: counseling.review
  }))

  const updatedData = data.map(item => ({
    name: usersMap.get(item.user_id),
    bio: item.bio,
    topics: item.topics,
    availability: item.availability,
    experience: item.experience
  }));

  res.status(200).json({ data: { updatedData, patientsReview } })
})

app.post('/counselings/psychologists/:id', async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  //Authorization: 'Bearer TOKEN'
  if (!token) {
    res.status(200).json({ message: 'error! token was not provided' })
  }

  //Decode token
  const currentUser = jwt.verify(token, "secretkeyappearshere");

  if (currentUser.role !== "patient") {
    res.status(401).json({ message: 'create counseling can only be done by patient!' })
  }

  const currentPatient = await supabase.from('patients').select('id').eq('user_id', currentUser.id)

  const { full_name, nickname, birthdate, gender, phone_number, occupation, schedule_date, schedule_time, type, problem_description, hope_after } = req.body
  const { data, e } = await supabase.from('counselings').upsert([{ patient_id: currentPatient.data[0].id, psychologist_id: parseInt(req.params.id), full_name, nickname, birthdate, gender, phone_number, occupation, schedule_date, schedule_time, type, problem_description, hope_after }]);
  const createdCounseling = await supabase.from('counselings').select('full_name, nickname, birthdate, gender, phone_number, occupation, schedule_date, schedule_time, type, problem_description, hope_after').order('created_at', { ascending: false }).limit(1);

  res.status(201).json({ data: createdCounseling.data[0] })
})

app.get('/counselings/:id', async (req, res) => {
  const counselingId = parseInt(req.params.id);
  const createdCounseling = await supabase.from('counselings').select('full_name, nickname, phone_number, schedule_date, schedule_time, type').eq('id', counselingId).single();

  res.json(createdCounseling.data)
})

app.get('/history', async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  //Authorization: 'Bearer TOKEN'
  if (!token) {
    res.status(200).json({ message: 'error! token was not provided' })
  }

  //Decode token
  const currentUser = jwt.verify(token, "secretkeyappearshere");

  if (currentUser.role !== "patient") {
    res.status(401).json({ message: 'check counseling history can only be done by patient!' })
  }

  const currentPatient = await supabase.from('patients').select('*').eq('user_id', currentUser.id)
  const currentPatientData = currentPatient.data[0]


  const history = await supabase.from('counselings').select('*').eq('patient_id', currentPatientData.id);

  const { data, error } = await supabase.from('counselings').select(`schedule_date, schedule_time, type, status, psychologists (users(name))`).eq('patient_id', currentPatientData.id)

  const counselingData = data.map(counseling => ({
    psychologist_name: counseling.psychologists?.users?.name,
    schedule_date: counseling.schedule_date,
    schedule_time: counseling.schedule_time,
    type: counseling.type,
    status: counseling.status,
  }));

  res.json(counselingData)

})

app.post('/history/counselings/:id', async (req, res) => {
  const counselingId = req.params.id;
  const { review } = req.body;

  const data = await supabase.from('counselings').update({ review: review }).eq('id', counselingId)
  const addedReview = await supabase.from('counselings').select('*').eq('id', counselingId)

  res.json({data: {review: addedReview.data[0].review}})
})

app.get('/counselings/psychologist/:id', async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  //Authorization: 'Bearer TOKEN'
  if (!token) {
    res.status(200).json({ message: 'error! token was not provided' })
  }

  //Decode token
  const currentUser = jwt.verify(token, "secretkeyappearshere");

  if (currentUser.role !== "psychologist") {
    res.status(401).json({ message: 'dashboard psychologist can only be seen by psychologist!' })
  }

  const psychologistId = req.params.id;
  const data = await supabase.from('counselings').select('patients (users (name)), schedule_date, schedule_time, type, status').eq('psychologist_id', psychologistId)

  const counselingData = data.data.map(counseling => ({
    patient_name: counseling.patients?.users?.name,
    schedule_date: counseling.schedule_date,
    schedule_time: counseling.schedule_time,
    type: counseling.type,
    status: counseling.status,
  }));


  res.json(counselingData)
})

app.get('/dashboard/counseling/:id', async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  //Authorization: 'Bearer TOKEN'
  if (!token) {
    res.status(200).json({ message: 'error! token was not provided' })
  }

  //Decode token
  const currentUser = jwt.verify(token, "secretkeyappearshere");

  if (currentUser.role !== "psychologist") {
    res.status(401).json({ message: 'counseling detail can only be seen by psychologist!' })
  }

  const counselingId = req.params.id;

  const data = await supabase.from('counselings').select('patients (users(name)), schedule_date, schedule_time, type, problem_description, hope_after, status').eq('id', counselingId)

  const counselingData = data.data.map(counseling => ({
    patient_name: counseling.patients?.users?.name,
    schedule_date: counseling.schedule_date,
    schedule_time: counseling.schedule_time,
    type: counseling.type,
    problem_description: counseling.problem_description,
    hope_after: counseling.hope_after,
    status: counseling.status,
  }));

  res.json(counselingData)
})

app.put('/dashboard/counseling/:id', async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  //Authorization: 'Bearer TOKEN'
  if (!token) {
    res.status(200).json({ message: 'error! token was not provided' })
  }

  //Decode token
  const currentUser = jwt.verify(token, "secretkeyappearshere");

  if (currentUser.role !== "psychologist") {
    res.status(401).json({ message: 'changing counseling status to done can only be seen by psychologist!' })
  }

  const counselingId = req.params.id;
  const { newStatus } = req.body;

  const { data, error } = await supabase.from('counselings').update({ status: newStatus }).eq('id', counselingId);

  const viewData = await supabase.from('counselings').select('status').eq('id', counselingId);


  res.json(viewData.data)
})

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});