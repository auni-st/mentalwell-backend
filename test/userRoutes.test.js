const supertest = require('supertest');
const app = require('../api/index'); // Adjust the path accordingly
const sinon = require('sinon');
const nock = require('nock');
const { supabase } = require('../api/utils/supabase');
const { jwt } = require('../api/utils/encrypt');
const expect = require('chai').expect;

describe('User Routes', () => {
  it('should get current user details', async () => {
    // If test failed, it's possible that token is expired. Get new token by login
    const mockToken = process.env.PATIENT_TOKEN;
    const response = await supertest(app)
      .get('/currentUser')
      .set('Authorization', `Bearer ${mockToken}`);

    expect(response.status).to.equal(200);
    expect(response.body).to.be.an('array').that.is.not.empty;
    const user = response.body[0]; 
    expect(user).to.have.property('id', 178);
    expect(user).to.have.property('nickname');
    expect(user).to.have.property('profile_image', 'https://xobmwlomdcnugqxqcwzq.supabase.co/storage/v1/object/public/mentalwell-profileimage/profile_image/178_cat2.jpg');
  });

  it('should create a new user', async () => {
    const createdUserData = {
      id: 100001,
      email: 'test100002@example.com',
      password: 'password123',
      password_confirm: 'password123',
      phone_number: '1234567890',
      created_at: 'mock-date',
    };

    sinon.stub(supabase.from(), 'upsert').resolves({
      data: [createdUserData],
    });

    const mockUserData = {
      email: 'test100002@example.com',
      password: 'password123',
      password_confirm: 'password123',
      phone_number: '1234567890',
    };

    const response = await supertest(app)
      .post('/users')
      .send(mockUserData);

    expect(response.status).to.equal(201);
    expect(response.body).to.have.property('message', 'registration success');
    expect(response.body).to.have.property('cleanedDataOnly');
    expect(response.body.cleanedDataOnly).to.have.property('id');
    expect(response.body.cleanedDataOnly).to.have.property('email', mockUserData.email);
    expect(response.body.cleanedDataOnly).to.have.property('phone_number', mockUserData.phone_number);
    expect(response.body.cleanedDataOnly).to.have.property('created_at');

    const userId = response.body.cleanedDataOnly.id;

    // delete the created user
    const deletePatient = await supabase.from('patients').delete().eq('user_id', userId);
    const deleteUser = await supabase.from('users').delete().eq('id', userId);
  });
})

