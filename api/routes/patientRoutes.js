const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase');
const { jwt } = require('../utils/encrypt');
const { upload } = require('../utils/multer');

router.get('/patient', async (req, res) => {
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

  const patientData = await supabase.from('patients').select('id, users (name, nickname, email, phone_number, birthdate, gender, profile_image)').eq('user_id', currentUser.id).single();

  res.status(200).json(patientData.data)
})

router.put('/patient', upload.single('profile_image'), async (req, res) => {
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

  const { newName, newNickname, newPhone_number, newBirthdate, newGender } = req.body;

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

    const editPatientData = await supabase.from('users').update({ name: newName, nickname: newNickname, phone_number: newPhone_number, birthdate: newBirthdate, gender: newGender, profile_image: publicUrl.publicUrl }).eq('id', currentUser.id)

    const data = await supabase.from('users').select('name, nickname, phone_number, birthdate, gender, profile_image').eq('id', currentUser.id).single();

    res.status(200).json(data.data);

  }

  if (!req.file) {
    const editPatientData = await supabase.from('users').update({ name: newName, nickname: newNickname, phone_number: newPhone_number, birthdate: newBirthdate, gender: newGender }).eq('id', currentUser.id)

    const data = await supabase.from('users').select('name, nickname, phone_number, birthdate, gender, profile_image').eq('id', currentUser.id).single();

    res.status(200).json(data.data);
  }

})

router.get('/counselings/patient', async (req, res) => {
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

  const getData = await supabase.from('patients').select('id, users (name, nickname, phone_number, birthdate, gender)').eq('user_id', currentUser.id)
  res.status(200).json(getData.data[0])
})

router.post('/counselings/psychologists/:id', async (req, res) => {
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

  const { occupation, schedule_date, schedule_time, type, problem_description, hope_after } = req.body
  const getData = await supabase.from('patients').select('id, users (name, nickname, phone_number, birthdate, gender)').eq('user_id', currentUser.id)
  const name = getData.data[0].users.name;
  const nickname = getData.data[0].users.nickname;
  const phone_number = getData.data[0].users.phone_number;
  const birthdate = getData.data[0].users.birthdate;
  const gender = getData.data[0].users.gender;
  const { data, e } = await supabase.from('counselings').upsert([{ patient_id: currentPatient.data[0].id, psychologist_id: parseInt(req.params.id), occupation, schedule_date, schedule_time, type, problem_description, hope_after }]);
  const createdCounseling = await supabase.from('counselings').select('id, occupation, schedule_date, schedule_time, type, problem_description, hope_after').order('created_at', { ascending: false }).limit(1);

  const cleanedResponse = {
    id: createdCounseling.data[0]?.id,
    name,
    nickname,
    birthdate,
    gender,
    phone_number,
    occupation: createdCounseling.data[0]?.occupation,
    schedule_date: createdCounseling.data[0]?.schedule_date,
    schedule_time: createdCounseling.data[0]?.schedule_time,
    type: createdCounseling.data[0]?.type,
    problem_description: createdCounseling.data[0]?.problem_description,
    hope_after: createdCounseling.data[0]?.hope_after,
  }

  res.status(201).json({ data: cleanedResponse })
})

router.get('/confirmedCounseling/', async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  //Authorization: 'Bearer TOKEN'
  if (!token) {
    res.status(200).json({ message: 'error! token was not provided' })
  }

  //Decode token
  const currentUser = jwt.verify(token, "secretkeyappearshere");

  if (currentUser.role !== "patient") {
    res.status(401).json({ message: 'confirmed counseling can only be seen by patient!' })
  }

  const patientId = await supabase.from('users').select('patients(id)').eq('id', currentUser.id).single()

  const counselings = await supabase.from('counselings').select('id, schedule_date, schedule_time, type, patients(users (name, nickname, phone_number))').eq('patient_id', patientId.data.patients[0].id).order('created_at', { ascending: false }).limit(1).single();

  cleanedResponse = {
    id: counselings.data.id,
    full_name: counselings.data.patients.users.name,
    nickname: counselings.data.patients.users.nickname,
    phone_number: counselings.data.patients.users.phone_number,
    schedule_date: counselings.data.schedule_date,
    schedule_time: counselings.data.schedule_time,
    type: counselings.data.type
  }
  res.status(200).json(cleanedResponse)
})

router.get('/history', async (req, res) => {
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

  res.status(200).json(counselingData)
})

router.post('/history/counselings/:id', async (req, res) => {
  const counselingId = req.params.id;
  const { review } = req.body;

  const data = await supabase.from('counselings').update({ review: review }).eq('id', counselingId)
  const addedReview = await supabase.from('counselings').select('*').eq('id', counselingId)

  res.json({ data: { review: addedReview.data[0].review } })
})

router.get('/schedule/psychologist/:id', async (req, res) => {
  const psychologistId = req.params.id;

  const data = await supabase.from('psychologists').select('id, users(name), counselings (schedule_date, schedule_time, status)').eq('id', psychologistId).single()

  const cleanedResponse = {
    id: data.data.id,
    name: data.data.users.name,
    counselings: data.data.counselings.map(counseling => ({
      schedule_date: counseling.schedule_date,
      schedule_time: counseling.schedule_time,
      status: counseling.status,
    })),
  }
  res.status(201).json(cleanedResponse)
})

router.get('/availability/psychologist/:id', async (req, res) => {
  const psychologistId = req.params.id;

  const data = await supabase.from('psychologists').select('id, users(name), availability').eq('id', psychologistId).single();
  
  const cleanedResponse = {
    id: data.data.id,
    name: data.data.users.name,
    availability: data.data.availability
  }
  
  res.status(200).json(cleanedResponse)
})

module.exports = router