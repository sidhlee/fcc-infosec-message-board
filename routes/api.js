/*
 *
 *
 *       Complete the API routing below
 *
 *
 */

'use strict';

const {
  getThreads,
  createThread,
  reportThread,
  deleteThread,
} = require('../controllers/thread-controller');

const {
  getReplies,
  createReply,
  reportReply,
  deleteReply,
} = require('../controllers/reply-controller');

module.exports = function (app) {
  app
    .route('/api/threads/:board')
    .get(getThreads)
    .post(createThread)
    .put(reportThread)
    .delete(deleteThread);

  app
    .route('/api/replies/:board')
    .get(getReplies)
    .post(createReply)
    .put(reportReply)
    .delete(deleteReply);
};
