const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    minLength: 6,
  },
  images: {
    regularImage: {
      type: String,
      required: true,
    },
    largeImage: {
      type: String,
      required: true,
    },
  },
  resetToken: String,
  resetTokenExpiry: Date,
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
