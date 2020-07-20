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
