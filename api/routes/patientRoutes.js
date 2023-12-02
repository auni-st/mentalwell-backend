const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase');
const { jwt } = require('../utils/encrypt');
const { upload } = require('../utils/multer');

router.get('/patient/:id', async (req, res) => {
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

router.put('/patient/:id', upload.single('profile_image'), async (req, res) => {
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

  if (!req.file) {
    const editPatientData = await supabase.from('users').update({ phone_number: newPhone_number, birthdate: newBirthdate, gender: newGender }).eq('id', currentUser.id)

    const data = await supabase.from('users').select('phone_number, birthdate, gender, profile_image').eq('id', currentUser.id).single();

    res.json(data.data);
  }

})

router.get('/counselings/patient/:id', async (req, res) => {
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
  res.json(getData.data[0])
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

  const { full_name, nickname, occupation, schedule_date, schedule_time, type, problem_description, hope_after } = req.body
  const getData = await supabase.from('patients').select('id, users (phone_number, birthdate, gender)').eq('user_id', currentUser.id)
  const phone_number = getData.data[0].users.phone_number;
  // res.json(phone_number)
  const birthdate = getData.data[0].users.birthdate;
  const gender = getData.data[0].users.gender;
  const { data, e } = await supabase.from('counselings').upsert([{ patient_id: currentPatient.data[0].id, psychologist_id: parseInt(req.params.id), full_name, nickname, occupation, schedule_date, schedule_time, type, problem_description, hope_after }]);
  const createdCounseling = await supabase.from('counselings').select('id, full_name, nickname, occupation, schedule_date, schedule_time, type, problem_description, hope_after').order('created_at', { ascending: false }).limit(1);

  const cleanedResponse = {
    id: createdCounseling.data[0]?.id,
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

router.get('/counselings/:id', async (req, res) => {
  const counselingId = parseInt(req.params.id);
  const getPatientData = await supabase.from('counselings').select('id, patient_id, patients (users (phone_number))').eq('id', counselingId).single()
  const createdCounseling = await supabase.from('counselings').select('id, full_name, nickname, schedule_date, schedule_time, type').eq('id', counselingId).single();

  cleanedResponse = {
    id: createdCounseling.data.id,
    full_name: createdCounseling.data.full_name,
    nickname: createdCounseling.data.nickname,
    phone_number: getPatientData.data.patients.users.phone_number,
    schedule_date: createdCounseling.data.schedule_date,
    schedule_time: createdCounseling.data.schedule_time,
    type: createdCounseling.data.type
  }
  res.json(cleanedResponse)
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

  res.json(counselingData)
})

router.post('/history/counselings/:id', async (req, res) => {
  const counselingId = req.params.id;
  const { review } = req.body;

  const data = await supabase.from('counselings').update({ review: review }).eq('id', counselingId)
  const addedReview = await supabase.from('counselings').select('*').eq('id', counselingId)

  res.json({ data: { review: addedReview.data[0].review } })
})

module.exports = router