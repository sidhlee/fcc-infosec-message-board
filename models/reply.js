const mongoose = require('mongoose');

const ReplySchema = new mongoose.Schema({
  text: { type: String, required: true },
  delete_password: { type: String, required: true },
  created_on: { type: Date, required: true },
  reported: { type: Boolean, required: true },
});

module.exports = {
  ReplySchema,
  Reply: mongoose.model('Replay', ReplySchema),
};
