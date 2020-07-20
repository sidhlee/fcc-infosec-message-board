require('dotenv').config();

const mongoose = require('mongoose');
const { ThreadSchema } = require('../models/thread.js');
const DB_URI = process.env.DB_URI;

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

const getThreads = async (req, res, next) => {
  const Board = getBoard(req);
  try {
    const threads = await Board.find({})
      .select(
        '-reported -delete_password -replies.delete_password -replies.reported'
      )
      .sort({ bumped_on: -1 })
      .limit(10)
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

const createThread = async (req, res, next) => {
  const Board = getBoard(req);
  const newBoard = new Board({
    text: req.body.text,
    created_on: new Date(),
    bumped_on: new Date(),
    reported: false,
    delete_password: req.body.delete_password,
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

const reportThread = async (req, res, next) => {
  const Board = getBoard(req);
  const threadId = req.body.report_id;
  try {
    const reportedThread = await Board.findByIdAndUpdate(
      mongoose.Types.ObjectId(threadId),
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

const deleteThread = async (req, res, next) => {
  const threadId = req.body.thread_id; // _id of thread
  const deletePassword = req.body.delete_password;
  console.log(req.body);

  const Board = getBoard(req);
  try {
    // https://mongoosejs.com/docs/api.html#model_Model.findOneAndDelete
    const deleted = await Board.findOneAndDelete({
      _id: mongoose.Types.ObjectId(threadId),
      delete_password: deletePassword,
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

module.exports = {
  getThreads,
  createThread,
  reportThread,
  deleteThread,
};
