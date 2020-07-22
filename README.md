# FreeCodeCamp- Information Security and Quality Assurance

---

## Project Anon Message Board

1. SET NODE_ENV to `test` without quotes when ready to write tests and DB to your databases connection string (in .env)
2. Recommended to create controllers/handlers and handle routing in routes/api.js
3. You will add any security features to `server.js`
4. You will create all of the functional/unit tests in `tests/2_functional-tests.js` and `tests/1_unit-tests.js` but only functional will be tested

## User Stories

1. Only allow your site to be loading in an iFrame on your own pages.

`server.js`

```js
app.use(helmet.frameguard({ action: 'sameorigin' }));
```

2. Do not allow DNS prefetching.

```js
app.use(helmet.dnsPrefetchControl());
```

3. Only allow your site to send the referrer for your own pages.

```js
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));
```

4. I can **POST** a thread to a specific message board by passing form data `text` and `delete_password` to `/api/threads/:board`.(Recommend res.redirect to board page `/b/:board`) Saved will be `_id`, `text`, `created_on`(date&time), `bumped_on`(date&time, starts same as created_on), `reported`(boolean), `delete_password`, & `replies`(array).'

`/controllers/thread-controller.js`

```js
const createThread = async (req, res, next) => {
  const Board = getBoard(req);
  const { text, delete_password } = req.body;
  const newBoard = new Board({
    text,
    delete_password,
    created_on: new Date(),
    bumped_on: new Date(),
    reported: false,
    replies: [],
  });
  try {
    await newBoard.save();
    return res.redirect(`/b/${req.params.board}/`);
  } catch (err) {
    console.log(err);
    return next(err);
  }
};
```

`/helpers/getBoard.js`

```js
const mongoose = require('mongoose');
const { ThreadSchema } = require('../models/thread.js');
/**
 * Returns mongoose model from req.param.board
 * @param {Request} req
 */
const getBoard = (req) => {
  const board = req.params.board;
  // model(name, schema, collection)
  const Board = mongoose.model('Thread', ThreadSchema, board);
  return Board;
};

module.exports = { getBoard };
```

5. I can **POST** a reply to a thead on a specific board by passing form data `text`, `delete_password`, & `thread_id` to `/api/replies/:board` and it will also update the `bumped_on` date to the comments date.(Recommend res.redirect to thread page `/b/:board/:thread_id`) In the thread's 'replies' array will be saved `_id`, `text`, `created_on`, `delete_password`, & `reported`.

`/controllers/reply-controller.js`

```js
const createReply = async (req, res, next) => {
  const { text, delete_password, thread_id } = req.body;
  const reply = new Reply({
    // mongoose automatically creates _id field
    text,
    delete_password,
    created_on: new Date(),
    reported: false,
  });
  const Board = getBoard(req);
  try {
    const updatedThread = await Board.findByIdAndUpdate(
      thread_id,
      {
        $set: { bumped_on: new Date() },
        $push: { replies: reply.toJSON() },
      },
      { new: true }
    );
    if (!updatedThread) {
      console.log('fail');
      return next(new Error('Could not create the reply'));
    }
    return res.redirect(`/b/${req.params.board}/${thread_id}`);
  } catch (err) {
    return next(err);
  }
};
```

6. I can **GET** an array of the most recent 10 bumped threads on the board with only the most recent 3 replies from `/api/threads/:board`. The `reported` and `delete_passwords` fields will not be sent.

`/controllers/thread-controller.js`

```js
const getThreads = async (req, res, next) => {
  const Board = getBoard(req);
  try {
    const threads = await Board.find({})
      .select(
        '-reported -delete_password -replies.delete_password -replies.reported'
      )
      .sort({ bumped_on: -1 })
      .limit(10)
      .lean() // return plain JS object instead of mongoose model
      .exec(); // .toArray in native driver
    // NOTE: Mongoose Queries are not Promises!
    // https://mongoosejs.com/docs/queries.html#queries-are-not-promises

    threads.forEach((thread) => {
      thread.replycount = thread.replies.length;
      if (thread.replycount > 3) {
        thread.replies = thread.replies.slice(-3); // slice the last 3 replies
      }
    });

    return res.json(threads);
  } catch (err) {
    return next(err);
  }
};
```

7. I can **GET** an entire thread with all its replies from `/api/replies/:board?thread_id={thread_id}`. Also hiding the same fields.

`/controllers/reply-controller.js`

```js
const getReplies = async (req, res, next) => {
  // GET request attaches data with query string
  const { thread_id } = req.query;
  const Board = getBoard(req);
  try {
    const thread = await Board.findById(thread_id)
      .select(
        '-reported -delete_password -replies.delete_password -replies.reported'
      )
      .exec();
    if (!thread) {
      return next(new Error('Failed loading replies'));
    }
    return res.json(thread);
  } catch (err) {
    return next(err);
  }
};
```

8. I can delete a thread completely if I send a **DELETE** request to `/api/threads/:board` and pass along the `thread_id` & `delete_password`. (Text response will be 'incorrect password' or 'success')

`/controllers/thread-controller.js`

```js
const deleteThread = async (req, res, next) => {
  const { thread_id, delete_password } = req.body; // _id of thread

  const Board = getBoard(req);
  try {
    // https://mongoosejs.com/docs/api.html#model_Model.findOneAndDelete
    const deleted = await Board.findOneAndDelete({
      _id: thread_id, // mongoose wraps id with ObjectID automatically
      delete_password,
    });
    if (deleted) {
      res.send('success');
    } else {
      res.send('incorrect password');
    }
  } catch (err) {
    return next(err);
  }
};
```

9. I can delete a post(just changing the text to '[deleted]') if I send a **DELETE** request to `/api/replies/:board` and pass along the `thread_id`, `reply_id`, & `delete_password`. (Text response will be 'incorrect password' or 'success')

`/controllers/reply-controller.js`

```js
const deleteReply = async (req, res, next) => {
  const Board = getBoard(req);
  const { thread_id, reply_id, delete_password } = req.body;
  try {
    const updatedThread = await Board.findOneAndUpdate(
      {
        _id: thread_id,
        // use $elemMatch when there are multiple fields to match
        replies: { $elemMatch: { _id: reply_id, delete_password } },
      },
      {
        // The positional $ operator acts as a placeholder for the first element that matches the query document
        //https://docs.mongodb.com/manual/reference/operator/update/positional/index.html
        $set: { 'replies.$.text': '[deleted]' },
      },
      { new: true }
    );

    if (updatedThread) {
      return res.send('success');
    } else {
      return res.send('incorrect password');
    }
  } catch (err) {
    return next(err);
  }
};
```

10. I can report a thread and change its reported value to true by sending a **PUT** request to `/api/threads/:board` and pass along the `thread_id`. (Text response will be 'success')

`/controllers/thread-controller.js`

```js
const reportThread = async (req, res, next) => {
  const Board = getBoard(req);
  const { report_id } = req.body;
  try {
    const reportedThread = await Board.findByIdAndUpdate(
      report_id,
      {
        reported: true,
      },
      {
        new: true,
      }
    );

    if (reportedThread) {
      return res.send('success');
    } else {
      return res.send('fail');
    }
  } catch (err) {
    return next(err);
  }
};
```

11. I can report a reply and change its reported value to true by sending a **PUT** request to `/api/replies/:board` and pass along the `thread_id` & `reply_id`. (Text response will be 'success')

`/controllers/reply-controller.js`

```js
const reportReply = async (req, res, next) => {
  const Board = getBoard(req);
  const { thread_id, reply_id } = req.body;
  try {
    const updatedThread = await Board.findOneAndUpdate(
      {
        _id: thread_id,
        // matches elements in replies array where _id equals to reply_id
        'replies._id': reply_id,
      },
      {
        // The positional $ operator identifies an element in an array
        // to update without explicitly specifying the position of the element in the array.
        // https://docs.mongodb.com/manual/reference/operator/update/positional/
        $set: { 'replies.$.reported': true },
      },
      { new: true }
    );
    if (!updatedThread) {
      return res.send('fail');
    }
    return res.send('success');
  } catch (err) {
    return next(err);
  }
};
```

12. Complete functional tests that wholely test routes and pass.

|                          | **GET**                    | **POST**               | **PUT**                | **DELETE**                              |
| ------------------------ | -------------------------- | ---------------------- | ---------------------- | --------------------------------------- |
| **/api/threads/{board}** | list recent threads        | create thread          | report thread          | delete thread with password             |
| **/api/replies/{board}** | show all replies on thread | create reply on thread | report reply on thread | change reply to '\[deleted]' on thread. |

`/tests/2_functional-tests.js`

```js
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
```
