const supertest = require('supertest');
const app = require('../api/index'); // Adjust the path accordingly
const { supabase } = require('../api/utils/supabase');
const { upload } = require('../api/utils/multer');
const expect = require('chai').expect;

describe('Article Routes', () => {
  it('should create a new article with an image', async () => {
    const mockArticleData = {
      title: 'Test Article',
      content: 'This is a test article content.',
      references: 'Test references',
    };

    const response = await supertest(app)
      .post('/articles')
      .field('title', 'Test Article')
      .field('content', 'This is a test article content.')
      .field('references', 'Test references')
      .attach('image', 'test/articles/cat2.jpg'); 

    expect(response.status).to.equal(201);
    expect(response.body).to.have.property('message', 'article create success');
    expect(response.body).to.have.property('data');
    expect(response.body.data).to.have.property('id');
    expect(response.body.data).to.have.property('image');
    expect(response.body.data).to.have.property('title', mockArticleData.title);
    expect(response.body.data).to.have.property('content', mockArticleData.content);
    expect(response.body.data).to.have.property('references', mockArticleData.references);

    const articleId = response.body.data.id;

    // delete the created article
    const deleteArticle = await supabase.from('articles').delete().eq('id', articleId);

  });

  it('should create a new article without an image', async () => {
    const mockArticleData = {
      title: 'Test Article Without Image',
      content: 'This is a test article content without an image.',
      references: 'Test references without image',
    };

    const response = await supertest(app)
      .post('/articles')
      .field('title', 'Test Article Without Image')
      .field('content', 'This is a test article content without an image.')
      .field('references', 'Test references without image')

    expect(response.status).to.equal(201);
    expect(response.body).to.have.property('message', 'article create success');
    expect(response.body).to.have.property('data');
    expect(response.body.data).to.have.property('id');
    expect(response.body.data).to.have.property('image', null); // No image property when no image is provided
    expect(response.body.data).to.have.property('title', mockArticleData.title);
    expect(response.body.data).to.have.property('content', mockArticleData.content);
    expect(response.body.data).to.have.property('references', mockArticleData.references);

    const articleId = response.body.data.id;

    // delete the created article
    const deleteArticle = await supabase.from('articles').delete().eq('id', articleId);

  });

  it('should get all articles when no title is provided', async () => {
    const response = await supertest(app)
      .get('/articles');

    expect(response.status).to.equal(200);
    expect(response.body).to.be.an('array');
  });

  it('should get articles filtered by title when title is provided', async () => {
    const titleQueryParam = 'Test';

    const response = await supertest(app)
      .get('/articles')
      .query({ title: titleQueryParam });

    expect(response.status).to.equal(200);
    expect(response.body).to.be.an('array');
  });

  it('should get a specific article by ID', async () => {
    const mockArticleId = 50;

    const response = await supertest(app)
      .get(`/articles/${mockArticleId}`);

    expect(response.status).to.equal(200);
    expect(response.body).to.be.an('array');
  });
});