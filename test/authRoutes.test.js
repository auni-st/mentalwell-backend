const supertest = require('supertest');
const { expect } = require('chai');
const app = require('../api/index'); // Adjust the path accordingly
const { jwt } = require('../api/utils/encrypt');
const nock = require('nock');
const { nodemailer } = require('../api/utils/nodemailer');
const { uuidv4 } = require('../api/utils/uuid');
const jest = require('jest')

describe('Auth Routes', () => {
  it('should log in a user with valid credentials', async () => {
    const mockUserData = {
      email: 'aramadhan395@gmail.com',
      password: 'password123',
    };

    const response = await supertest(app)
      .post('/login')
      .send(mockUserData);

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('message', 'success');
    expect(response.body).to.have.property('data');
    expect(response.body.data).to.have.property('id');
    expect(response.body.data).to.have.property('email', mockUserData.email);
    expect(response.body.data).to.have.property('name');
    expect(response.body.data).to.have.property('role');
    expect(response.body.data).to.have.property('token');

    const decodedToken = jwt.verify(response.body.data.token, 'secretkeyappearshere');
    expect(decodedToken).to.have.property('id');
    expect(decodedToken).to.have.property('email', mockUserData.email);
    expect(decodedToken).to.have.property('name');
    expect(decodedToken).to.have.property('role');
  });

  it('should return 401 for invalid credentials', async () => {
    const invalidUserData = {
      email: 'aramadhan395@gmail.com',
      password: 'InvalidPassword',
    };

    const response = await supertest(app)
      .post('/login')
      .send(invalidUserData);

    expect(response.status).to.equal(401);
    expect(response.body).to.have.property('message', 'invalid credentials');
  });

  it('should access the resource with a valid token', async () => {
    // If test failed, it's possible that token is expired. Get new token by login 
    const mockToken = process.env.PATIENT_TOKEN;

    const response = await supertest(app)
      .get('/accessResource')
      .set('Authorization', `Bearer ${mockToken}`);

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('message', 'success');
    expect(response.body).to.have.property('data');
    expect(response.body.data).to.have.property('id');
    expect(response.body.data).to.have.property('email');
    expect(response.body.data).to.have.property('name');
    expect(response.body.data).to.have.property('role');
    expect(response.body.data).to.have.property('nothing_for_test');

  });

});