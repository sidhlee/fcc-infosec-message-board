require('dotenv').config();

const { getBoard } = require('../helpers/getBoard');

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

module.exports = {
  getThreads,
  createThread,
  reportThread,
  deleteThread,
};
