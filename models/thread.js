const mongoose = require('mongoose');
const { ReplySchema } = require('./reply');

const ThreadSchema = new mongoose.Schema({
  text: { type: String, required: true },
  created_on: { type: Date, required: true },
  bumped_on: { type: Date, required: true },
  reported: { type: Boolean, required: true },
  delete_password: { type: String, required: true },
  replies: [ReplySchema],
});

module.exports = {
  Thread: mongoose.model('Thread', ThreadSchema),
  ThreadSchema,
};
