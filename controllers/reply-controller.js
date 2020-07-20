require('dotenv').config();

const mongoose = require('mongoose');
const { Reply } = require('../models/reply');
const { ThreadSchema } = require('../models/thread');
const { getBoard } = require('../helpers/getBoard');

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

module.exports = {
  getReplies,
  createReply,
  reportReply,
  deleteReply,
};
