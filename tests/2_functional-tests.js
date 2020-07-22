/*
 *
 *
 *       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
 *       -----[Keep the tests in the same order!]-----
 *       (if additional are added, keep them at the very end!)
 */

var chaiHttp = require('chai-http');
var chai = require('chai');
var assert = chai.assert;
var server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function () {
  this.timeout(5000);
  let thread1;
  let thread2;
  let reply1;
  suite('API ROUTING FOR /api/threads/:board', function () {
    suite('POST', function () {
      // We need 2 thread to test PUT after DELETE
      test('Create 2 new threads', (done) => {
        chai
          .request(server)
          .post('/api/threads/test')
          .send({
            text: 'test1',
            delete_password: '123123',
          })
          .end((err, res) => {
            assert.strictEqual(res.status, 200);
          });

        chai
          .request(server)
          .post('/api/threads/test')
          .send({
            text: 'test2',
            delete_password: '123123',
          })
          .end((err, res) => {
            assert.strictEqual(res.status, 200);
            done();
          });
      });
    });

    suite('GET', function () {
      test('an array of the most recent 10 bumped threads on the board with only the most recent 3 replies', (done) => {
        chai
          .request(server)
          .get('/api/threads/test')
          .end((err, res) => {
            assert.strictEqual(res.status, 200);
            assert.isArray(res.body);
            assert.isAtMost(res.body.length, 10);
            // assign global vars to loaded threads for further tests
            thread1 = res.body[0];
            thread2 = res.body[1];

            assert.property(thread1, '_id');
            assert.property(thread1, 'text');
            assert.property(thread1, 'created_on');
            assert.property(thread1, 'bumped_on');
            assert.property(thread1, 'replies');
            assert.isArray(thread1.replies);
            assert.isAtMost(thread1.replies.length, 3);
            done();
          });
      });
    });

    suite('DELETE', function () {
      test('can delete thread with correct password', (done) => {
        chai
          .request(server)
          .delete('/api/threads/test')
          .send({
            thread_id: thread1._id,
            delete_password: '123123',
          })
          .end((err, res) => {
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'success');
            done();
          });
      });

      test('cannot delete thread with incorrect password', (done) => {
        chai
          .request(server)
          .delete('/api/threads/test')
          .send({
            thread_id: thread2._id,
            delete_password: 'wrong_password',
          })
          .end((err, res) => {
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'incorrect password');
            done();
          });
      });
    });

    suite('PUT', function () {
      test('report thread', (done) => {
        chai
          .request(server)
          .put('/api/threads/test')
          .send({
            report_id: thread2._id,
          })
          .end((err, res) => {
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'success');
            done();
          });
      });
    });
  });

  suite('API ROUTING FOR /api/replies/:board', function () {
    suite('POST', function () {
      test('reply to a thread on a specific board', (done) => {
        chai
          .request(server)
          .post('/api/replies/test')
          .send({
            text: 'reply',
            delete_password: '123123',
            thread_id: thread2._id,
          })
          .end((err, res) => {
            assert.strictEqual(res.status, 200);
            done();
          });
      });
    });

    suite('GET', function () {
      test('an entire thread with all its replies', (done) => {
        chai
          .request(server)
          // .get(`/api/replies/test?thread_id=${thread2._id}`)
          .get('/api/replies/test')
          .query({
            // chai supports .query method
            thread_id: thread2._id,
          })
          .end((err, res) => {
            reply1 = res.body.replies[0];

            assert.strictEqual(res.status, 200);
            const thread = res.body;
            // assert thread
            assert.property(thread, 'text');
            assert.property(thread, '_id');
            assert.property(thread, 'created_on');
            assert.property(thread, 'bumped_on');
            assert.property(thread, 'replies');
            assert.isArray(thread.replies);
            // assert replies
            const reply = thread.replies[0];
            assert.property(reply, 'text');
            assert.strictEqual(reply.text, 'reply');
            assert.property(reply, 'created_on');
            done();
          });
      });
    });

    suite('PUT', function () {
      test('report reply', (done) => {
        chai
          .request(server)
          .put('/api/replies/test')
          .send({
            thread_id: thread2._id,
            reply_id: reply1._id,
          })
          .end((err, res) => {
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'success');
            done();
          });
      });
    });

    suite('DELETE', function () {
      test('can delete reply with correct password', (done) => {
        chai
          .request(server)
          .delete('/api/threads/test')
          .send({
            thread_id: thread2._id,
            reply_id: reply1._id,
            delete_password: '123123',
          })
          .end((err, res) => {
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'success');
            done();
          });
      });

      test('cannot delete reply with incorrect password', (done) => {
        chai
          .request(server)
          .delete('/api/threads/test')
          .send({
            thread_id: thread2._id,
            reply_id: reply1._id,
            delete_password: 'wrong password',
          })
          .end((err, res) => {
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'incorrect password');
          });
        done();
      });
    });
  });
});
