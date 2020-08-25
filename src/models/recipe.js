const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  published: {
    type: Date,
    default: Date.now,
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
  ingredients: {
    type: String,
    required: true,
  },

  user: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  category: {
    type: String,
    enum: ['entrée', 'plat principal', 'aperitif et buffet', 'dessert'],
    default: 'plat principal',
  },
  difficulty: {
    type: String,
    enum: ['facile', 'moyen', 'difficile'],
    default: 'facile',
  },
  cooking: { type: String, required: true },
});

module.exports = mongoose.model('Recipe', recipeSchema);
