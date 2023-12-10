const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase');
const { emailRegex, passwordRegex, phoneRegex } = require('../utils/regex')
const { bcrypt } = require('../utils/encrypt')
const { jwt } = require('../utils/encrypt');

router.get('/currentUser', async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  //Authorization: 'Bearer TOKEN'
  if (!token) {
    res.status(200).json({ message: 'error! token was not provided' })
  }

  //Decode token
  const currentUser = jwt.verify(token, "secretkeyappearshere");

  const detailUser = await supabase.from('users').select('id, nickname, profile_image').eq('id', currentUser.id)
  res.status(200).json(detailUser.data);
})

router.post('/users', async (req, res) => {
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
    id: cleanedDataObject.id,
    email: cleanedDataObject.email,
    phone_number: cleanedDataObject.phone_number,
    created_at: cleanedDataObject.created_at
  }

  if (e) {
    res.status(500).json({ error: 'user not created' });
  }

  res.status(201).json({ message: 'registration success', cleanedDataOnly });
})

module.exports = router;