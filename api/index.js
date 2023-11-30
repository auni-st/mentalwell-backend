require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const app = express();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
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

app.get('/helloExpress', async (req, res) => {
  res.json({ message: 'HELLO WORLD!' })
})

app.get('/users/:id', async (req, res) => {
  const { id } = req.params
  const data = await supabase.from('users').select('*').eq('id', id).single()
  res.json(data.data)
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

//forgot password
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  const { data: user } = await supabase.from('users').select('id, email').eq('email', email).single();

  if (user) {
    const resetToken = uuidv4();

    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); //24 hour
    const insert = await supabase.from('password_reset_tokens').upsert([
      {
        user_id: user.id,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
      },
    ]);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      secure: true,
      tls: {
        rejectUnauthorized: false,
      },
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      }
    });

    const mailOptions = {
      from: 'mentalwell.app@gmail.com',
      to: email,
      subject: 'Ubah Sandi',
      // text: `Klik link berikut untuk mengubah password anda: https://mentalwell-backend.vercel.app/reset-password?token=${resetToken}`
      text: `Klik link berikut untuk mengubah password anda: https://mentalwell.vercel.app/ubah-sandi?token=${resetToken}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Email error:', error);
        res.status(500).json({ message: 'Error sending email' });
      } else {
        console.log('Email sent:', info.response);
        res.status(200).json({ message: 'Password reset email sent successfully' });
      }
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
})

app.put('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword, newPasswordConfirmation } = req.body;

  if (newPassword !== newPasswordConfirmation) {
    return res.status(400).json({ message: 'New password and confirmation do not match' });
  }

  const { data: resetTokenData, error: tokenError } = await supabase.from('password_reset_tokens').select('user_id, expires_at').eq('token', token).single()

  if (tokenError) {
    res.json({ message: 'Error fetching reset token' })
  }

  if (!resetTokenData) {
    res.json({ message: 'Reset token has expired' })
  }

  const { user_id, expires_at } = resetTokenData;

  if (new Date(expires_at) < new Date()) {
    return res.status(400).json({ message: 'Reset token has expired' });
  }

  const saltRounds = 10; // You can adjust this based on your security requirements
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  const updatePassword = await supabase.from('users').update({ password: hashedPassword }).eq('id', user_id)

  await supabase.from('password_reset_tokens').delete().eq('token', token);

  res.json({ message: 'Password reset successful!' })
})

app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  const { data: user } = await supabase.from('users').select('id, email').eq('email', email).single();

  if (user) {
    const resetToken = uuidv4();

    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); //24 hour
    const insert = await supabase.from('password_reset_tokens').upsert([
      {
        user_id: user.id,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
      },
    ]);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      }
    });

    const mailOptions = {
      from: 'mentalwell.app@gmail.com',
      to: email,
      subject: 'Ubah Sandi',
      // text: `Klik link berikut untuk mengubah password anda: https://mentalwell-backend.vercel.app/reset-password?token=${resetToken}`
      text: `Klik link berikut untuk mengubah password anda: https://mentalwell.vercel.app/ubah-sandi?token=${resetToken}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Email error:', error);
        res.status(500).json({ message: 'Error sending email' });
      } else {
        console.log('Email sent:', info.response);
        res.status(200).json({ message: 'Password reset email sent successfully' });
      }
    })
    res.json({ message: 'Password reset email has been sent!' })
  }
})

app.put('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword, newPasswordConfirmation } = req.body;

  if (newPassword !== newPasswordConfirmation) {
    return res.status(400).json({ message: 'New password and confirmation do not match' });
  }

  const { data: resetTokenData, error: tokenError } = await supabase.from('password_reset_tokens').select('user_id, expires_at').eq('token', token).single()

  if (tokenError) {
    res.json({ message: 'Error fetching reset token' })
  }

  if (!resetTokenData) {
    res.json({ message: 'Reset token has expired' })
  }

  const { user_id, expires_at } = resetTokenData;

  if (new Date(expires_at) < new Date()) {
    return res.status(400).json({ message: 'Reset token has expired' });
  }

  const saltRounds = 10; // You can adjust this based on your security requirements
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  const updatePassword = await supabase.from('users').update({ password: hashedPassword }).eq('id', user_id)

  await supabase.from('password_reset_tokens').delete().eq('token', token);

  res.json({ message: 'Password reset successful!' })
})

app.get('/patient/:id', async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  //Authorization: 'Bearer TOKEN'
  if (!token) {
    res.status(200).json({ message: 'error! token was not provided' })
  }

  //Decode token
  const currentUser = jwt.verify(token, "secretkeyappearshere");

  if (currentUser.role !== "patient") {
    res.status(401).json({ message: 'profile patient can only be done by patient!' })
  }

  const patientData = await supabase.from('patients').select('id, users (email, phone_number, birthdate, gender, profile_image)').eq('user_id', currentUser.id).single();

  res.json(patientData.data)
})

app.put('/patient/:id', upload.single('profile_image'), async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  //Authorization: 'Bearer TOKEN'
  if (!token) {
    res.status(200).json({ message: 'error! token was not provided' })
  }

  //Decode token
  const currentUser = jwt.verify(token, "secretkeyappearshere");

  if (currentUser.role !== "patient") {
    res.status(401).json({ message: 'update patient profile can only be done by patient!' })
  }

  const { newPhone_number, newBirthdate, newGender } = req.body;

  const allowedMimeTypes = ['image/jpeg']
  //for profile_image
  if (req.file) {
    // Check if the MIME type is allowed
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ message: 'Invalid file type. Only JPEG files are allowed.' });
    }

    const { data: image, error } = await supabase.storage.from('mentalwell-profileimage').upload(`profile_image/${currentUser.id}_${req.file.originalname}`, req.file.buffer, {
      contentType: req.file.mimetype,
    });

    const { data: publicUrl } = await supabase.storage.from('mentalwell-profileimage').getPublicUrl(`profile_image/${currentUser.id}_${req.file.originalname}`)

    const editPatientData = await supabase.from('users').update({ phone_number: newPhone_number, birthdate: newBirthdate, gender: newGender, profile_image: publicUrl.publicUrl }).eq('id', currentUser.id)

    const data = await supabase.from('users').select('phone_number, birthdate, gender, profile_image').eq('id', currentUser.id).single();

    res.json(data.data);

  }

  const editPatientData = await supabase.from('users').update({ phone_number: newPhone_number, birthdate: newBirthdate, gender: newGender }).eq('id', currentUser.id)

  const data = await supabase.from('users').select('phone_number, birthdate, gender, profile_image').eq('id', currentUser.id).single();

  res.json(data.data);
})


app.get('/psychologist/profile/:id', async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  //Authorization: 'Bearer TOKEN'
  if (!token) {
    res.status(200).json({ message: 'error! token was not provided' })
  }

  //Decode token
  const currentUser = jwt.verify(token, "secretkeyappearshere");

  if (currentUser.role !== "psychologist") {
    res.status(401).json({ message: 'profile psychologist can only be done by psychologist!' })
  }

  const psychologistData = await supabase.from('psychologists').select('id, bio, experience, users (name, email, phone_number, birthdate, gender, profile_image), psychologists_topics(topics(name))').eq('user_id', currentUser.id).single();

  const cleanedResponse = {
    id: psychologistData.data.id,
    bio: psychologistData.data.bio,
    experience: psychologistData.data.experience,
    name: psychologistData.data.users.name,
    email: psychologistData.data.users.email,
    phone_number: psychologistData.data.users.phone_number,
    birthdate: psychologistData.data.users.birthdate,
    gender: psychologistData.data.users.gender,
    profile_image: psychologistData.data.users.profile_image,
    topics: psychologistData.data.psychologists_topics.data,
    psychologists_topics: psychologistData.data.psychologists_topics.map(item => ({
      topic_name: item.topics.name
    }))
  }
  res.json(cleanedResponse)
})


app.put('/psychologist/:id', upload.single('profile_image'), async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  //Authorization: 'Bearer TOKEN'
  if (!token) {
    res.status(200).json({ message: 'error! token was not provided' })
  }

  //Decode token
  const currentUser = jwt.verify(token, "secretkeyappearshere");
  const psychologistId = await supabase.from('psychologists').select('id').eq('user_id', currentUser.id).single();

  if (currentUser.role !== "psychologist") {
    res.status(401).json({ message: 'edit psychologist profile can only be done by psychologist!' })
  }

  // res.json(psychologistId.data.id)

  const { newName, newPhone_number, newBirthdate, newGender, newBio, newExperience, newTopics } = req.body

  const allowedMimeTypes = ['image/jpeg']
  //for profile_image
  if (req.file) {
    // Check if the MIME type is allowed
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ message: 'Invalid file type. Only JPEG files are allowed.' });
    }

    const { data: image, error } = await supabase.storage.from('mentalwell-profileimage').upload(`profile_image/${currentUser.id}_${req.file.originalname}`, req.file.buffer, {
      contentType: req.file.mimetype,
    });

    const { data: publicUrl } = await supabase.storage.from('mentalwell-profileimage').getPublicUrl(`profile_image/${currentUser.id}_${req.file.originalname}`)

    const editPsychologistData1 = await supabase.from('users').update({ name: newName, phone_number: newPhone_number, birthdate: newBirthdate, gender: newGender, profile_image: publicUrl.publicUrl }).eq('id', currentUser.id)
    const editPsychologistData2 = await supabase.from('psychologists').update({ bio: newBio, experience: newExperience }).eq('user_id', currentUser.id)

    if (newTopics) {
      const deletePreviousTopics = await supabase.from('psychologists_topics').delete().eq('psychologist_id', psychologistId.data.id)
      const editPsychologistData3 = await supabase.from('psychologists_topics').upsert(newTopics.map(topic_id => ({
        psychologist_id: psychologistId.data.id,
        topic_id
      })))
    }

    const updatedData = await supabase.from('users').select('id, name, phone_number, birthdate, gender, profile_image, psychologists (bio, experience, psychologists_topics (psychologist_id, topic_id, topics (id, name)))').eq('id', currentUser.id).single();

    const cleanedResponse = {
      id: updatedData.data.id,
      name: updatedData.data.name,
      phone_number: updatedData.data.phone_number,
      birthdate: updatedData.data.birthdate,
      gender: updatedData.data.gender,
      profile_image: updatedData.data.profile_image,
      psychologist: updatedData.data.psychologists.map(item => ({
        bio: item.bio,
        experience: item.experience,
        topics: item.psychologists_topics.filter((topic, index, self) => {
          const isUnique = index === self.findIndex(t => t.topics.id === topic.topics.id && t.topics.name === topic.topics.name);
          return isUnique;
        }).map(topic => ({
          topic_id: topic.topics.id,
          topic_name: topic.topics.name
        }))
      }))

    }
    res.json(cleanedResponse);

  }

  const editPsychologistData1 = await supabase.from('users').update({ name: newName, phone_number: newPhone_number, birthdate: newBirthdate, gender: newGender }).eq('id', currentUser.id)
  const editPsychologistData2 = await supabase.from('psychologists').update({ bio: newBio, experience: newExperience }).eq('user_id', currentUser.id)

  if (newTopics) {
    const deletePreviousTopics = await supabase.from('psychologists_topics').delete().eq('psychologist_id', psychologistId.data.id)
    const editPsychologistData3 = await supabase.from('psychologists_topics').upsert(newTopics.map(topic_id => ({
      psychologist_id: psychologistId.data.id,
      topic_id
    })))
  }

  const updatedData = await supabase.from('users').select('id, name, phone_number, birthdate, gender, profile_image, psychologists (bio, experience, psychologists_topics (psychologist_id, topic_id, topics (id, name)))').eq('id', currentUser.id).single();

  const cleanedResponse = {
    id: updatedData.data.id,
    name: updatedData.data.name,
    phone_number: updatedData.data.phone_number,
    birthdate: updatedData.data.birthdate,
    gender: updatedData.data.gender,
    profile_image: updatedData.data.profile_image,
    psychologist: updatedData.data.psychologists.map(item => ({
      bio: item.bio,
      experience: item.experience,
      topics: item.psychologists_topics.filter((topic, index, self) => {
        const isUnique = index === self.findIndex(t => t.topics.id === topic.topics.id && t.topics.name === topic.topics.name);
        return isUnique;
      }).map(topic => ({
        topic_id: topic.topics.id,
        topic_name: topic.topics.name
      }))
    }))

  }
  res.json(cleanedResponse);
})

app.post('/articles', upload.single('image'), async (req, res) => {
  const { title, content, references } = req.body

  const allowedMimeTypes = ['image/jpeg']
  //for profile_image
  if (req.file) {
    // Check if the MIME type is allowed
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ message: 'Invalid file type. Only JPEG files are allowed.' });
    }

    const { data: image, error } = await supabase.storage.from('mentalwell-profileimage').upload(`image/${req.file.originalname}`, req.file.buffer, {
      contentType: req.file.mimetype,
    });

    const { data: publicUrl } = await supabase.storage.from('mentalwell-profileimage').getPublicUrl(`image/${req.file.originalname}`)

    const { data, e } = await supabase.from('articles').upsert([{ title, content, references, image: publicUrl.publicUrl }]);

    const createdArticle = await supabase.from('articles').select('id, image, title, content, references').order('created_at', { ascending: false }).limit(1);

    res.status(201).json({ message: 'article create success', data: { image: createdArticle.data[0].image, title: createdArticle.data[0].title, content: createdArticle.data[0].content, references: createdArticle.data[0].references } })
  }

  if (!req.file) {
    const { data, e } = await supabase.from('articles').upsert([{ title, content, references }]);

    const createdArticle = await supabase.from('articles').select('title, image, content, references').order('created_at', { ascending: false }).limit(1);
    res.status(201).json({ message: 'article create success', data: { image: createdArticle.data[0].image, title: createdArticle.data[0].title, content: createdArticle.data[0].content, references: createdArticle.data[0].references } })
  }
})

app.get('/articles', async (req, res) => {
  const { title } = req.query;

  if (!title) {
    const { data, error } = await supabase.from('articles').select('id, image, title, content, created_at');
    return res.json(data);
  }

  // const { data, error } = await supabase.from('articles').select('id, title, content, created_at').ilike('title', title);
  const { data, error } = await supabase.from('articles').select('id, image, title, content, created_at').ilike('title', `%${title}%`);
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

app.get('/psychologists_index', async (req, res) => {
  const { data, e } = await supabase.from('psychologists').select('id, users(name, profile_image)')

  const names = data.map(item => ({
    profile_image: item.users?.profile_image,
    name: item.users?.name
  }));
  res.json({ data: names });
})

app.get('/psychologists', async (req, res) => {
  const { topics, name } = req.query;

  if (!topics && !name) {
    const joinManytoMany = await supabase.from('psychologists').select('id, bio, experience, availability, users (name), counselings (review)')

    const psychologistsWithReviewCount = joinManytoMany.data.map(psychologist => {
      const reviewCount = psychologist.counselings.filter(counseling => counseling.review !== null).length;
      return {
        id: psychologist.id,
        bio: psychologist.bio,
        experience: psychologist.experience,
        availability: psychologist.availability,
        name: psychologist.users.name,
        counselings: { review: { count: reviewCount } }
      };
    });

    res.json(psychologistsWithReviewCount)
  }

  if (name && topics) {
    // res.json({message: 'works!'})
    const arrayTopics = [topics]
    const joinedIds = `(${arrayTopics.join(',')})`;

    const joinManytoMany = await supabase.from('psychologists').select('id, bio, experience, availability, users (name), counselings (review), psychologists_topics (topics (id, name))').ilike('users.name', `%${name}%`).not('users', 'is', null).filter('psychologists_topics.topics.id', 'in', joinedIds).not('psychologists_topics.topics', 'is', null).order('id', { ascending: true })
    const psychologistsWithReviewCount = joinManytoMany.data.map(psychologist => {
      const reviewCount = psychologist.counselings.filter(counseling => counseling.review !== null).length;
      return {
        id: psychologist.id,
        bio: psychologist.bio,
        experience: psychologist.experience,
        availability: psychologist.availability,
        name: psychologist.users.name,
        counselings: { review: { count: reviewCount } },
      };
    });
    res.json(psychologistsWithReviewCount)
  }

  if (name) {
    const joinManytoMany = await supabase.from('psychologists').select('id, bio, experience, availability, users (name), counselings (review)').ilike('users.name', `%${name}%`).not('users', 'is', null)

    const psychologistsWithReviewCount = joinManytoMany.data.map(psychologist => {
      const reviewCount = psychologist.counselings.filter(counseling => counseling.review !== null).length;
      return {
        id: psychologist.id,
        bio: psychologist.bio,
        experience: psychologist.experience,
        availability: psychologist.availability,
        name: psychologist.users.name,
        counselings: { review: { count: reviewCount } }
      };
    });

    res.json(psychologistsWithReviewCount)

  }

  if (topics) {
    const arrayTopics = [topics]
    const joinedIds = `(${arrayTopics.join(',')})`;
    const joinManytoMany = await supabase.from('psychologists').select('id, bio, experience, availability, users (name), counselings (review), psychologists_topics(topics (id, name))').filter('psychologists_topics.topics.id', 'in', joinedIds).not('psychologists_topics.topics', 'is', null).order('id', { ascending: true })

    const psychologistsWithReviewCount = joinManytoMany.data.filter(item => item.psychologists_topics.length > 0).map(psychologist => {
      const reviewCount = psychologist.counselings.filter(counseling => counseling.review !== null).length;
      return {
        id: psychologist.id,
        bio: psychologist.bio,
        experience: psychologist.experience,
        availability: psychologist.availability,
        name: psychologist.users.name,
        counselings: { review: { count: reviewCount } }
      };
    });

    res.json(psychologistsWithReviewCount)
  }

})

app.get('/psychologists/:id', async (req, res) => {
  const psychologistId = req.params.id;

  const joinManytoMany = await supabase.from('psychologists').select('id, bio, experience, users(name), psychologists_topics (id, psychologist_id, topic_id, topics (id, name)), counselings (review, patients(users(name)))').eq('id', psychologistId).single()

  const cleanedResponse = {
    id: joinManytoMany.data.id,
    name: joinManytoMany.data.users.name,
    bio: joinManytoMany.data.bio,
    experience: joinManytoMany.data.experience,
    psychologist_topics: joinManytoMany.data.psychologists_topics.map(item => ({
      topic_id: item.topics.id,
      topic_name: item.topics.name
    })),
    counselings: joinManytoMany.data.counselings.filter(item => item.review !== null).map(item => ({
      patients: item.patients.users.name,
      review: item.review,
    }))
  }

  res.json(cleanedResponse)

})

app.get('/couselings/patient/:id', async (req, res) => {
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

  const getData = await supabase.from('patients').select('id, users (phone_number, birthdate, gender)').eq('user_id', currentUser.id)
  res.json(getData.data[0].users)
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

  const { full_name, nickname, occupation, schedule_date, schedule_time, type, problem_description, hope_after } = req.body
  const getData = await supabase.from('patients').select('id, users (phone_number, birthdate, gender)').eq('user_id', currentUser.id)
  const phone_number = getData.data[0].users.phone_number;
  // res.json(phone_number)
  const birthdate = getData.data[0].users.birthdate;
  const gender = getData.data[0].users.gender;
  const { data, e } = await supabase.from('counselings').upsert([{ patient_id: currentPatient.data[0].id, psychologist_id: parseInt(req.params.id), full_name, nickname, occupation, schedule_date, schedule_time, type, problem_description, hope_after }]);
  const createdCounseling = await supabase.from('counselings').select('full_name, nickname, occupation, schedule_date, schedule_time, type, problem_description, hope_after').order('created_at', { ascending: false }).limit(1);

  const cleanedResponse = {
    full_name: createdCounseling.data[0]?.full_name,
    birthdate,
    gender,
    phone_number,
    nickname: createdCounseling.data[0]?.nickname,
    occupation: createdCounseling.data[0]?.occupation,
    schedule_date: createdCounseling.data[0]?.schedule_date,
    schedule_time: createdCounseling.data[0]?.schedule_time,
    type: createdCounseling.data[0]?.type,
    problem_description: createdCounseling.data[0]?.problem_description,
    hope_after: createdCounseling.data[0]?.hope_after,
  }

  res.status(201).json({ data: cleanedResponse })
})

app.get('/counselings/:id', async (req, res) => {
  const counselingId = parseInt(req.params.id);
  // res.json(counselingId)
  //get phone_number
  const getPatientData = await supabase.from('counselings').select('id, patient_id, patients (users (phone_number))').eq('id', counselingId).single()

  // const getData = await supabase.from('patients').select('id, users (phone_number)').eq('user_id', getPatientData.data.patient_id)
  // res.json(getData);
  // const phone_number = getData.data[0].users.phone_number;

  const createdCounseling = await supabase.from('counselings').select('full_name, nickname, schedule_date, schedule_time, type').eq('id', counselingId).single();

  cleanedResponse = {
    full_name: createdCounseling.data.full_name,
    nickname: createdCounseling.data.nickname,
    phone_number: getPatientData.data.patients.users.phone_number,
    schedule_date: createdCounseling.data.schedule_date,
    schedule_time: createdCounseling.data.schedule_time,
    type: createdCounseling.data.type
  }
  res.json(cleanedResponse)
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

  const { data, error } = await supabase.from('counselings').select(`id, schedule_date, schedule_time, type, status, psychologists (users(name))`).eq('patient_id', currentPatientData.id).order('status', { ascending: true })

  const counselingData = data.map(counseling => ({
    id: counseling.id,
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

  res.json({ data: { review: addedReview.data[0].review } })
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
  const psychologistAvailability = await supabase.from('psychologists').select('availability').eq('id', psychologistId).single();

  const counselingData = await supabase.from('counselings').select('id, patients (users (name)), schedule_date, schedule_time, type, status').eq('psychologist_id', psychologistId).order('status', { ascending: true })
  const counselingList = counselingData.data

  const cleanedResponse = {
    psychologistAvailability: psychologistAvailability.data.availability,
    counselingList: counselingList.map(counseling => ({
      id: counseling.id,
      patientName: counseling.patients.users.name,
      scheduleDate: counseling.schedule_date,
      scheduleTime: counseling.schedule_time,
      type: counseling.type,
      status: counseling.status,
    })),
  };

  res.json(cleanedResponse)
})

app.put('/counselings/psychologist/:id', async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  //Authorization: 'Bearer TOKEN'
  if (!token) {
    res.status(200).json({ message: 'error! token was not provided' })
  }

  //Decode token
  const currentUser = jwt.verify(token, "secretkeyappearshere");

  if (currentUser.role !== "psychologist") {
    res.status(401).json({ message: 'edit psychologist availability can only be done by psychologist!' })
  }

  const psychologistId = req.params.id;
  const { newAvailability } = req.body;

  const { data, error } = await supabase.from('psychologists').update({ availability: newAvailability }).eq('id', psychologistId);

  const viewData = await supabase.from('psychologists').select('availability').eq('id', psychologistId).single();
  res.json(viewData.data)

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

  const data = await supabase.from('counselings').select('patients (users(birthdate, gender, phone_number)), full_name, nickname, occupation, schedule_date, schedule_time, type, problem_description, hope_after, status').eq('id', counselingId)

  const counselingData = data.data.map(counseling => ({
    full_name: counseling.full_name,
    nickname: counseling.nickname,
    birthdate: counseling.patients.users.birthdate,
    gender: counseling.patients.users.gender,
    phone_number: counseling.patients.users.phone_number,
    occupation: counseling.occupation,
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