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
    default:
      'https://res.cloudinary.com/bakate/image/upload/v1600522048/fullstackProject/vjo3f3vbpqdc4npdnnzm.jpg',
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
