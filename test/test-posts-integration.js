'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const should = chai.should();

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

// seed data fn
function seedBlogPostData() {
  console.info('seeding blog data');
  const seedData = [];

  for (let i=1; i<=10; i++) {
    seedData.push(generateBlogPostData());
  }
  return BlogPost.insertMany(seedData);
}

// dummy data generation fn
function generateBlogPostData() {
  return {
    author: {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName()
    },
    title: faker.lorem.words(),
    content: faker.lorem.sentence()
  };
}

// tear down db fn
function tearDownDb() {
  console.warn('Deleting database');
  return mongoose.connection.dropDatabase();
}

describe('Blog API resource', function() {

  // hook function for before and afters
  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedBlogPostData();
  });

  afterEach(function() {
    return tearDownDb();
  });

  after(function() {
    return closeServer();
  });

  // GET endpoint test

  describe('GET endpoint', function() {

    it('should return all existing blog posts', function() {

      let res;

      return chai.request(app)
        .get('/posts')
        .then(function(_res) {
          res = _res;
          console.log(res.body);
          res.body.should.have.length.of.at.least(1);
          return BlogPost.count();
        })
        .then(function(count) {
          console.log(count);
          res.body.should.have.length.of(count);
        });
    });

    it('should return blog posts with correct fields', function() {

      let resPost;
      return chai.request(app)
        .get('/posts')
        .then(function(res) {
          res.should.be.json;
          res.body.should.be.a('array');
          res.body.should.have.length.of.at.least(1);

          res.body.forEach(function(post) {
            post.should.be.a('object');
            post.should.include.keys(
              'title', 'content', 'author', 'created');
          });
          resPost = res.body[0];
          return BlogPost.findById(resPost.id);
        })
        .then(function(post) {
          resPost.id.should.equal(post.id);
          resPost.title.should.equal(post.title);
          resPost.content.should.equal(post.content);
          resPost.author.should.equal(`${post.author.firstName} ${post.author.lastName}`);
          // resPost.created.should.equal(post.created);
        });
    });
  });

  // POST endpoint test

  describe('POST endpoint', function() {

    it('should add a new blog post', function( ){

      const newPost = generateBlogPostData();

      return chai.request(app)
        .post('/posts')
        .send(newPost)
        .then(function(res) {
          res.should.have.status(201);
          res.should.be.json;
          res.body.should.be.a('object');
          res.body.should.include.keys(
            'id', 'title', 'content', 'author');
          res.body.title.should.equal(newPost.title);
          res.body.id.should.not.be.null;
          res.body.content.should.equal(newPost.content);
          res.body.author.should.equal(`${newPost.author.firstName} ${newPost.author.lastName}`);
          return BlogPost.findById(res.body.id);
        })
        .then(function(post) {
          post.title.should.equal(newPost.title);
          post.content.should.equal(newPost.content);
          post.author.firstName.should.equal(newPost.author.firstName);
          post.author.lastName.should.equal(newPost.author.lastName);
          post.id.should.not.be.null;
        });
    });
  });

  // PUT endpoint test

  describe('PUT endpoint', function() {
    it('should update fields you send over', function() {
      const updateData = {
        title: 'my life in a school of fish',
        content: 'under da sea'
      };

      return BlogPost
        .findOne()
        .then(function(post) {
          updateData.id = post.id;
          
          return chai.request(app)
            .put(`/posts/${post.id}`)
            .send(updateData);
        })
        .then(function(res) {
          res.should.have.status(204);

          return BlogPost.findById(updateData.id);
        })
        .then(function(post) {
          post.title.should.equal(updateData.title);
          post.content.should.equal(updateData.content);
        });
    });
  });

  // DELETE endpoint test

  describe('DELETE endpoint', function() {
    it('should delete a blog post by id', function() {

      let blogPost;

      return BlogPost
        .findOne()
        .then(function(post) {
          blogPost = post;
          return chai.request(app).delete(`/posts/${blogPost.id}`);
        })
        .then(function(res) {
          res.should.have.status(204);
          return BlogPost.findById(blogPost.id);
        })
        .then(function(post) {
          should.not.exist(post);
        });
    });
  });
});