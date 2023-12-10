const supertest = require('supertest');
const app = require('../api/index');
const { supabase } = require('../api/utils/supabase');
const { jwt } = require('../api/utils/encrypt');
const { upload } = require('../api/utils/multer');
const expect = require('chai').expect;

describe('Patient Routes', () => {
  it('should show patient profile', async () => {
    // If test failed, it's possible that token is expired. Get new token by login
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTc4LCJlbWFpbCI6ImFyYW1hZGhhbjM5NUBnbWFpbC5jb20iLCJuYW1lIjoiQWhtYWQgUmFtYWRoYW4gQXVuaSIsInJvbGUiOiJwYXRpZW50IiwiaWF0IjoxNzAyMTEwMzAwLCJleHAiOjE3MDI3MTUxMDB9.SvyofTRXVzgzNjRHVgY21OWjz14g3mP-nYkXRDB2Fco';

    const response = await supertest(app)
      .get('/patient')
      .set('Authorization', `Bearer ${mockToken}`);

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('id')
    expect(response.body.users).to.have.property('name')
    expect(response.body.users).to.have.property('nickname')
    expect(response.body.users).to.have.property('email')
    expect(response.body.users).to.have.property('phone_number')
    expect(response.body.users).to.have.property('birthdate')
    expect(response.body.users).to.have.property('gender')
    expect(response.body.users).to.have.property('profile_image')
  })

  it('should update patient profile', async () => {
    // If test failed, it's possible that token is expired. Get new token by login
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTc4LCJlbWFpbCI6ImFyYW1hZGhhbjM5NUBnbWFpbC5jb20iLCJuYW1lIjoiQWhtYWQgUmFtYWRoYW4gQXVuaSIsInJvbGUiOiJwYXRpZW50IiwiaWF0IjoxNzAyMTEwMzAwLCJleHAiOjE3MDI3MTUxMDB9.SvyofTRXVzgzNjRHVgY21OWjz14g3mP-nYkXRDB2Fco';
    const response = await supertest(app)
      .put('/patient')
      .set('Authorization', `Bearer ${mockToken}`)
      .field('newName', 'Ahmad Ramadhan Auni updated')
      .field('newNickname', 'Auni updated')
      .attach('profile_image', 'test/articles/cat2.jpg')

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('name', 'Ahmad Ramadhan Auni updated');
    expect(response.body).to.have.property('nickname', 'Auni updated');
    expect(response.body).to.have.property('profile_image');
  })

  it('should autofill fields before create counseling', async () => {
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTc4LCJlbWFpbCI6ImFyYW1hZGhhbjM5NUBnbWFpbC5jb20iLCJuYW1lIjoiQWhtYWQgUmFtYWRoYW4gQXVuaSIsInJvbGUiOiJwYXRpZW50IiwiaWF0IjoxNzAyMTEwMzAwLCJleHAiOjE3MDI3MTUxMDB9.SvyofTRXVzgzNjRHVgY21OWjz14g3mP-nYkXRDB2Fco';

    const response = await supertest(app)
      .get('/counselings/patient')
      .set('Authorization', `Bearer ${mockToken}`);

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('id')
    expect(response.body.users).to.have.property('name')
    expect(response.body.users).to.have.property('nickname')
    expect(response.body.users).to.have.property('phone_number')
    expect(response.body.users).to.have.property('birthdate')
    expect(response.body.users).to.have.property('gender')
  })

  it('should be able to create counseling', async () => {
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTc4LCJlbWFpbCI6ImFyYW1hZGhhbjM5NUBnbWFpbC5jb20iLCJuYW1lIjoiQWhtYWQgUmFtYWRoYW4gQXVuaSIsInJvbGUiOiJwYXRpZW50IiwiaWF0IjoxNzAyMTEwMzAwLCJleHAiOjE3MDI3MTUxMDB9.SvyofTRXVzgzNjRHVgY21OWjz14g3mP-nYkXRDB2Fco';

    const mockUserData = {
      occupation: 'Test occupation',
      schedule_date: '2023-12-09',
      schedule_time: '13:00-14:00',
      type: 'chat',
      problem_description: 'Test problem_description',
      hope_after: 'test hope_after'
    };

    const response = await supertest(app)
      .post('/counselings/psychologists/5')
      .set('Authorization', `Bearer ${mockToken}`)
      .send(mockUserData)

    expect(response.status).to.equal(201);
    expect(response.body).to.have.property('data');
    expect(response.body.data).to.have.property('id');
    expect(response.body.data).to.have.property('name');
    expect(response.body.data).to.have.property('nickname');
    expect(response.body.data).to.have.property('birthdate');
    expect(response.body.data).to.have.property('gender');
    expect(response.body.data).to.have.property('phone_number');
    expect(response.body.data).to.have.property('occupation', 'Test occupation');
    expect(response.body.data).to.have.property('schedule_date', '2023-12-09');
    expect(response.body.data).to.have.property('schedule_time', '13:00-14:00');
    expect(response.body.data).to.have.property('type', 'chat');
    expect(response.body.data).to.have.property('problem_description', 'Test problem_description');
    expect(response.body.data).to.have.property('hope_after', 'test hope_after');

    const counselingId = response.body.data.id;

    // delete the created counseling
    const deleteCounseling = await supabase.from('counselings').delete().eq('id', counselingId);

  })

  it('should show the confirmed counseling', async () => {
    // If test failed, it's possible that token is expired. Get new token by login
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTc4LCJlbWFpbCI6ImFyYW1hZGhhbjM5NUBnbWFpbC5jb20iLCJuYW1lIjoiQWhtYWQgUmFtYWRoYW4gQXVuaSIsInJvbGUiOiJwYXRpZW50IiwiaWF0IjoxNzAyMTEwMzAwLCJleHAiOjE3MDI3MTUxMDB9.SvyofTRXVzgzNjRHVgY21OWjz14g3mP-nYkXRDB2Fco';

    const response = await supertest(app)
      .get('/confirmedCounseling/')
      .set('Authorization', `Bearer ${mockToken}`);

    expect(response.body).to.have.property('id');
    expect(response.body).to.have.property('full_name');
    expect(response.body).to.have.property('nickname');
    expect(response.body).to.have.property('phone_number');
    expect(response.body).to.have.property('schedule_date');
    expect(response.body).to.have.property('schedule_time');
    expect(response.body).to.have.property('type');
  })

  it('should get counseling history for a patient', async () => {
    // If test failed, it's possible that token is expired. Get new token by login
    const mockPatientToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTc4LCJlbWFpbCI6ImFyYW1hZGhhbjM5NUBnbWFpbC5jb20iLCJuYW1lIjoiQWhtYWQgUmFtYWRoYW4gQXVuaSIsInJvbGUiOiJwYXRpZW50IiwiaWF0IjoxNzAyMTEwMzAwLCJleHAiOjE3MDI3MTUxMDB9.SvyofTRXVzgzNjRHVgY21OWjz14g3mP-nYkXRDB2Fco'

    const response = await supertest(app)
      .get('/history')
      .set('Authorization', `Bearer ${mockPatientToken}`);

    expect(response.status).to.equal(200);
    expect(response.body).to.be.an('array');
    expect(response.body.length).to.be.greaterThan(0);
    expect(response.body[0]).to.have.property('id');
    expect(response.body[0]).to.have.property('psychologist_name');
    expect(response.body[0]).to.have.property('schedule_date');
    expect(response.body[0]).to.have.property('schedule_time');
    expect(response.body[0]).to.have.property('type');
    expect(response.body[0]).to.have.property('status');
  });

  it('should add a review to a counseling', async () => {
    const review = 'Test review';

    const response = await supertest(app)
      .post(`/history/counselings/81`)
      .send({ review });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('data');
    expect(response.body.data).to.have.property('review', review);

  });

  it('should get the schedule for a psychologist', async () => {
    const response = await supertest(app)
      .get(`/schedule/psychologist/5`);

    expect(response.status).to.equal(201);
    expect(response.body).to.have.property('id');
    expect(response.body).to.have.property('name');
    expect(response.body).to.have.property('counselings');
    expect(response.body.counselings).to.be.an('array');

  });

  it('should get the availability for a psychologist', async () => {
    const response = await supertest(app)
      .get(`/availability/psychologist/5`);

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('id');
    expect(response.body).to.have.property('name');
    expect(response.body).to.have.property('availability');

  });
})
