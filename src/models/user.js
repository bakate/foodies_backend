const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    trim: true,
    required: true,
  },
  email: {
    type: String,
    trim: true,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  resetTokenExpiry: Date,
  resetToken: String,
  avatar: {
    type: String,
  },
  recipes: [
    {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: 'Recipe',
    },
  ],
});

userSchema.plugin(uniqueValidator);
module.exports = mongoose.model('User', userSchema);
