const supertest = require('supertest');
const app = require('../api/index'); // Adjust the path accordingly
const { supabase } = require('../api/utils/supabase');
const { jwt } = require('../api/utils/encrypt');
const { upload } = require('../api/utils/multer');
const expect = require('chai').expect;


describe('Psychologist Routes', () => {
  it('should get details of the current psychologist', async () => {
    // If test failed, it's possible that token is expired. Get new token by login as psychologist
    const mockPsychologistToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTcxLCJlbWFpbCI6ImJhbWJhbmdAZ21haWwuY29tIiwibmFtZSI6IkJhbWJhbmcsIFMuUHNpIiwicm9sZSI6InBzeWNob2xvZ2lzdCIsImlhdCI6MTcwMjEyMDk4NSwiZXhwIjoxNzAyNzI1Nzg1fQ.4auVq4XG0b9UOAMcvW3dLgeQL4DkJiik7wYIryK0M2s';

    const response = await supertest(app)
      .get('/currentPsychologist')
      .set('Authorization', `Bearer ${mockPsychologistToken}`);

    expect(response.status).to.equal(200);
    expect(response.body).to.be.an('array');
    expect(response.body.length).to.be.greaterThan(0);
    const psychologistDetails = response.body[0];
    expect(psychologistDetails).to.have.property('id');
    expect(psychologistDetails).to.have.property('name');
    expect(psychologistDetails).to.have.property('profile_image');

  });

  it('should get the profile of the current psychologist', async () => {
    // If test failed, it's possible that token is expired. Get new token by login as psychologist
    const mockPsychologistToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTcxLCJlbWFpbCI6ImJhbWJhbmdAZ21haWwuY29tIiwibmFtZSI6IkJhbWJhbmcsIFMuUHNpIiwicm9sZSI6InBzeWNob2xvZ2lzdCIsImlhdCI6MTcwMjEyMDk4NSwiZXhwIjoxNzAyNzI1Nzg1fQ.4auVq4XG0b9UOAMcvW3dLgeQL4DkJiik7wYIryK0M2s';

    const response = await supertest(app)
      .get('/psychologist/profile')
      .set('Authorization', `Bearer ${mockPsychologistToken}`);

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('id');
    expect(response.body).to.have.property('bio');
    expect(response.body).to.have.property('experience');
    expect(response.body).to.have.property('name');
    expect(response.body).to.have.property('email');
    expect(response.body).to.have.property('phone_number');
    expect(response.body).to.have.property('birthdate');
    expect(response.body).to.have.property('gender');
    expect(response.body).to.have.property('profile_image');
    expect(response.body).to.have.property('psychologists_topics');
    expect(response.body.psychologists_topics).to.be.an('array');
  });

  it('should update psychologist profile with profile image', async () => {
    // If test failed, it's possible that token is expired. Get new token by login as psychologist
    const mockPsychologistToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTcxLCJlbWFpbCI6ImJhbWJhbmdAZ21haWwuY29tIiwibmFtZSI6IkJhbWJhbmcsIFMuUHNpIiwicm9sZSI6InBzeWNob2xvZ2lzdCIsImlhdCI6MTcwMjEyMDk4NSwiZXhwIjoxNzAyNzI1Nzg1fQ.4auVq4XG0b9UOAMcvW3dLgeQL4DkJiik7wYIryK0M2s';

    const response = await supertest(app)
      .put('/psychologist')
      .set('Authorization', `Bearer ${mockPsychologistToken}`)
      .field('newName', 'Bambang Updated')
      .attach('profile_image', 'test/articles/cat2.jpg');

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('id');
    expect(response.body).to.have.property('name', 'Bambang Updated');
    expect(response.body).to.have.property('profile_image');

  });

  it('should get a list of psychologists with their names and profile images', async () => {
    // Make a request to get the list of psychologists
    const response = await supertest(app)
      .get('/psychologists_index');

    expect(response.status).to.equal(200);
    expect(response.body).to.be.an('array');

    const psychologist = response.body[0];

    expect(psychologist).to.have.property('id');
    expect(psychologist).to.have.property('profile_image');
    expect(psychologist).to.have.property('name');

  });

  it('should get a list of psychologists with review counts when no filters are applied', async () => {
    // Make a request to get the list of psychologists without any filters
    const response = await supertest(app)
      .get('/psychologists');

    expect(response.status).to.equal(200);
    expect(response.body).to.be.an('array');

    const psychologist = response.body[0];

    expect(psychologist).to.have.property('id');
    expect(psychologist).to.have.property('bio');
    expect(psychologist).to.have.property('experience');
    expect(psychologist).to.have.property('availability');
    expect(psychologist).to.have.property('name');
    expect(psychologist).to.have.property('profile_image');
    expect(psychologist).to.have.property('counselings');
    expect(psychologist.counselings).to.have.property('review');
    expect(psychologist.counselings.review).to.have.property('count');

  });

  it('should get a filtered list of psychologists with review counts based on name and topics', async () => {
    const response = await supertest(app)
      .get('/psychologists')
      .query({ name: 'bambang', topics: '1,2,3,4,5,6' });

    expect(response.status).to.equal(200);
    expect(response.body).to.be.an('array');

  });

  it('should get details of a psychologist', async () => {
    const response = await supertest(app)
      .get(`/psychologists/5`);

    expect(response.status).to.equal(200);
    expect(response.body).to.be.an('object');

    const cleanedResponse = response.body;

    expect(cleanedResponse).to.have.property('id');
    expect(cleanedResponse).to.have.property('name');
    expect(cleanedResponse).to.have.property('profile_image');
    expect(cleanedResponse).to.have.property('bio');
    expect(cleanedResponse).to.have.property('experience');
    expect(cleanedResponse).to.have.property('psychologist_topics');
    expect(cleanedResponse).to.have.property('counselings');

  });

  it('should get psychologist dashboard', async () => {
    // If test failed, it's possible that token is expired. Get new token by login as psychologist
    const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTcxLCJlbWFpbCI6ImJhbWJhbmdAZ21haWwuY29tIiwibmFtZSI6IkJhbWJhbmcsIFMuUHNpIiwicm9sZSI6InBzeWNob2xvZ2lzdCIsImlhdCI6MTcwMjEyMDk4NSwiZXhwIjoxNzAyNzI1Nzg1fQ.4auVq4XG0b9UOAMcvW3dLgeQL4DkJiik7wYIryK0M2s';

    const response = await supertest(app)
      .get('/dashboard/psychologist')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).to.equal(200);
    expect(response.body).to.be.an('object');

    const cleanedResponse = response.body;

    expect(cleanedResponse).to.have.property('psychologistAvailability');
    expect(cleanedResponse).to.have.property('counselingList');
    expect(cleanedResponse.counselingList).to.be.an('array');

  });

  it('should update psychologist availability', async () => {
    // If test failed, it's possible that token is expired. Get new token by login as psychologist
    const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTcxLCJlbWFpbCI6ImJhbWJhbmdAZ21haWwuY29tIiwibmFtZSI6IkJhbWJhbmcsIFMuUHNpIiwicm9sZSI6InBzeWNob2xvZ2lzdCIsImlhdCI6MTcwMjEyMDk4NSwiZXhwIjoxNzAyNzI1Nzg1fQ.4auVq4XG0b9UOAMcvW3dLgeQL4DkJiik7wYIryK0M2s'; // Replace with the actual valid token

    const newAvailability = 'available';

    const response = await supertest(app)
      .put('/counselings/psychologist')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ newAvailability });

    expect(response.status).to.equal(200);
    expect(response.body).to.be.an('object');

    const updatedAvailability = response.body;

    expect(updatedAvailability).to.have.property('availability');
  });

  it('should get counseling details for a psychologist', async () => {
    // If test failed, it's possible that token is expired. Get new token by login as psychologist
    const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTcxLCJlbWFpbCI6ImJhbWJhbmdAZ21haWwuY29tIiwibmFtZSI6IkJhbWJhbmcsIFMuUHNpIiwicm9sZSI6InBzeWNob2xvZ2lzdCIsImlhdCI6MTcwMjEyMDk4NSwiZXhwIjoxNzAyNzI1Nzg1fQ.4auVq4XG0b9UOAMcvW3dLgeQL4DkJiik7wYIryK0M2s';

    const response = await supertest(app)
      .get(`/dashboard/counseling/27`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).to.equal(200);
    expect(response.body).to.be.an('array');

    const counselingDetails = response.body[0];

    expect(counselingDetails).to.have.property('id');
    expect(counselingDetails).to.have.property('full_name');
    expect(counselingDetails).to.have.property('nickname');
    expect(counselingDetails).to.have.property('profile_image');
    expect(counselingDetails).to.have.property('birthdate');
    expect(counselingDetails).to.have.property('gender');
    expect(counselingDetails).to.have.property('phone_number');
    expect(counselingDetails).to.have.property('occupation');
    expect(counselingDetails).to.have.property('schedule_date');
    expect(counselingDetails).to.have.property('schedule_time');
    expect(counselingDetails).to.have.property('type');
    expect(counselingDetails).to.have.property('problem_description');
    expect(counselingDetails).to.have.property('hope_after');
    expect(counselingDetails).to.have.property('status');
  });

  it('should update counseling status for a psychologist', async () => {
    // If test failed, it's possible that token is expired. Get new token by login as psychologist
    const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTcxLCJlbWFpbCI6ImJhbWJhbmdAZ21haWwuY29tIiwibmFtZSI6IkJhbWJhbmcsIFMuUHNpIiwicm9sZSI6InBzeWNob2xvZ2lzdCIsImlhdCI6MTcwMjEyMDk4NSwiZXhwIjoxNzAyNzI1Nzg1fQ.4auVq4XG0b9UOAMcvW3dLgeQL4DkJiik7wYIryK0M2s';

    const newStatus = 'selesai';

    const response = await supertest(app)
      .put(`/dashboard/counseling/27`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({ newStatus });

    expect(response.status).to.equal(200);
    expect(response.body[0]).to.have.property('status', 'selesai');

  });

});