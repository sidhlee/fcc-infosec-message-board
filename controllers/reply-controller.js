require('dotenv').config();

const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const DB_URI = process.env.DB_URI;

const getReplies = async () => {};

const createReply = async (req, res, next) => {
  const board = req.params.board;
  const threadId = req.body.thread_id;
  const reply = {
    text: req.body.text,
    createdOn: new Date(),
    delete_password: req.body.delete_password,
    reported: false,
  };
};

const reportReply = async () => {};

const deleteReply = async () => {};

module.exports = {
  getReplies,
  createReply,
  reportReply,
  deleteReply,
};
