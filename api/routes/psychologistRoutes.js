const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase');
const { jwt } = require('../utils/encrypt');
const { upload } = require('../utils/multer');

router.get('/psychologist/profile', async (req, res) => {
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

router.put('/psychologist', upload.single('profile_image'), async (req, res) => {
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

  if (!req.file) {
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
  }
})

router.get('/psychologists_index', async (req, res) => {
  const { data, e } = await supabase.from('psychologists').select('id, users(name, profile_image)')

  const names = data.map(item => ({
    id: item.id,
    profile_image: item.users?.profile_image,
    name: item.users?.name
  }));
  res.json(names);
})

router.get('/psychologists', async (req, res) => {
  const { topics, name } = req.query;

  if (!topics && !name) {
    const joinManytoMany = await supabase.from('psychologists').select('id, bio, experience, availability, users (name, profile_image), counselings (review)')

    const psychologistsWithReviewCount = joinManytoMany.data.map(psychologist => {
      const reviewCount = psychologist.counselings.filter(counseling => counseling.review !== null).length;
      return {
        id: psychologist.id,
        bio: psychologist.bio,
        experience: psychologist.experience,
        availability: psychologist.availability,
        name: psychologist.users.name,
        profile_image: psychologist.users.profile_image,
        counselings: { review: { count: reviewCount } }
      };
    });

    res.json(psychologistsWithReviewCount)
  } else if (name && topics) {
    // res.json({message: 'works!'})
    const arrayTopics = [topics]
    const joinedIds = `(${arrayTopics.join(',')})`;

    const joinManytoMany = await supabase.from('psychologists').select('id, bio, experience, availability, users (name, profile_image), counselings (review), psychologists_topics (topics (id, name))').ilike('users.name', `%${name}%`).not('users', 'is', null).filter('psychologists_topics.topics.id', 'in', joinedIds).not('psychologists_topics.topics', 'is', null).order('id', { ascending: true })
    const psychologistsWithReviewCount = joinManytoMany.data.map(psychologist => {
      const reviewCount = psychologist.counselings.filter(counseling => counseling.review !== null).length;
      return {
        id: psychologist.id,
        bio: psychologist.bio,
        experience: psychologist.experience,
        availability: psychologist.availability,
        name: psychologist.users.name,
        profile_image: psychologist.users.profile_image,
        counselings: { review: { count: reviewCount } },
      };
    });
    res.json(psychologistsWithReviewCount)
  } else if (name) {
    const joinManytoMany = await supabase.from('psychologists').select('id, bio, experience, availability, users (name, profile_image), counselings (review)').ilike('users.name', `%${name}%`).not('users', 'is', null)

    const psychologistsWithReviewCount = joinManytoMany.data.map(psychologist => {
      const reviewCount = psychologist.counselings.filter(counseling => counseling.review !== null).length;
      return {
        id: psychologist.id,
        bio: psychologist.bio,
        experience: psychologist.experience,
        availability: psychologist.availability,
        name: psychologist.users.name,
        profile_image: psychologist.users.profile_image,
        counselings: { review: { count: reviewCount } }
      };
    });

    res.json(psychologistsWithReviewCount)
  } else if (topics) {
    const arrayTopics = [topics]
    const joinedIds = `(${arrayTopics.join(',')})`;
    const joinManytoMany = await supabase.from('psychologists').select('id, bio, experience, availability, users (name, profile_image), counselings (review), psychologists_topics(topics (id, name))').filter('psychologists_topics.topics.id', 'in', joinedIds).not('psychologists_topics.topics', 'is', null).order('id', { ascending: true })

    const psychologistsWithReviewCount = joinManytoMany.data.filter(item => item.psychologists_topics.length > 0).map(psychologist => {
      const reviewCount = psychologist.counselings.filter(counseling => counseling.review !== null).length;
      return {
        id: psychologist.id,
        bio: psychologist.bio,
        experience: psychologist.experience,
        availability: psychologist.availability,
        name: psychologist.users.name,
        profile_image: psychologist.users.profile_image,
        counselings: { review: { count: reviewCount } }
      };
    });

    res.json(psychologistsWithReviewCount)
  }

})

router.get('/psychologists/:id', async (req, res) => {
  const psychologistId = req.params.id;

  const joinManytoMany = await supabase.from('psychologists').select('id, bio, experience, users(name), psychologists_topics (id, psychologist_id, topic_id, topics (id, name)), counselings (id, review, patients(users(name)))').eq('id', psychologistId).single()

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
      id: item.id,
      patients: item.patients.users.name,
      review: item.review,
    }))
  }
  res.json(cleanedResponse)
})

router.get('/dashboard/psychologist', async (req, res) => {
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

  const userId = currentUser.id;
  const psychologistIdRaw = await supabase.from('psychologists').select('id').eq('user_id', userId).single();
  const psychologistId = psychologistIdRaw.data.id;
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

router.put('/counselings/psychologist', async (req, res) => {
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

  const userId = currentUser.id;
  const psychologistIdRaw = await supabase.from('psychologists').select('id').eq('user_id', userId).single();
  const psychologistId = psychologistIdRaw.data.id;

  const { newAvailability } = req.body;

  const { data, error } = await supabase.from('psychologists').update({ availability: newAvailability }).eq('id', psychologistId);

  const viewData = await supabase.from('psychologists').select('availability').eq('id', psychologistId).single();
  res.json(viewData.data)

})

router.get('/dashboard/counseling/:id', async (req, res) => {
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

  const data = await supabase.from('counselings').select('id, patients (users(birthdate, gender, phone_number)), full_name, nickname, occupation, schedule_date, schedule_time, type, problem_description, hope_after, status').eq('id', counselingId)

  const counselingData = data.data.map(counseling => ({
    id: counseling.id,
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

router.put('/dashboard/counseling/:id', async (req, res) => {
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

module.exports = router 