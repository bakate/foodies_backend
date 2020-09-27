const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Recipe = require('../models/recipe');
const myLabels = require('../util/customLabels');
const HttpError = require('../models/httpError');
const User = require('../models/user');

const getAllRecipes = async (req, res, next) => {
  const { page } = req.query;
  const options = {
    page,
    limit: 6,
    sort: { published: -1 },
    customLabels: myLabels,
  };

  // const aggregateRecipes = Recipe.aggregate();
  // Recipe.aggregatePaginate(aggregateRecipes, options).then(function(results) {
  //   console.log(results);
  // });
  //   .catch(function(err) {
  //     console.log(err);
  //   });

  let allRecipes;
  try {
    const aggregateRecipes = Recipe.aggregate();
    allRecipes = await Recipe.aggregatePaginate(aggregateRecipes, options);
  } catch (err) {
    return next(
      new HttpError("Quelque chose s'est mal passée. Réessayez.", 500)
    );
  }
  res.json({
    recipes: allRecipes.map(recipe => recipe.toObject({ getters: true })),
    success: true,
  });
};
const createRecipe = async (req, res, next) => {
  const {
    title,
    ingredients,
    cooking,
    category,
    difficulty,
    image,
    duration,
  } = req.body;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = Object.values(errors.errors).find(el => el.msg).msg;
    return next(new HttpError(err, 422));
  }

  const createNewRecipe = new Recipe({
    title,
    image,
    ingredients,
    published: Date.now(),
    category,
    difficulty,
    duration,
    cooking,
    user: req.userData.userId,
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    return next(
      new HttpError('La création de la recette a echouée. Réessayez', 500)
    );
  }
  if (!user) {
    return next(
      new HttpError(
        "Nous n'avons pas pu trouver d'utlisateur avec cet identifiant",
        404
      )
    );
  }

  try {
    const newSession = await mongoose.startSession();
    newSession.startTransaction();
    await createNewRecipe.save({ session: newSession });
    user.recipes.push(createNewRecipe);
    await user.save({ session: newSession });
    await newSession.commitTransaction();
  } catch (err) {
    return next(
      new HttpError('La création de la recette a echouée. Réessayez', 500)
    );
  }

  res.status(201).json({
    recipe: createNewRecipe.toObject({ getters: true }),
    success: true,
  });
};
const getSingleRecipeById = async (req, res, next) => {
  const {
    params: { rid },
  } = req;
  let recipe;
  try {
    recipe = await Recipe.findById(rid);
  } catch (err) {
    return next(
      new HttpError("Quelque chose s'est mal déroulée. Réessayez encore", 500)
    );
  }
  if (!recipe) {
    return next(
      new HttpError(
        "Nous n'avons pas trouvé de recettes avec cet utilisateur",
        404
      )
    );
  }
  res.json({ recipe: recipe.toObject({ getters: true }), success: true });
};
const getRecipesByUserId = async (req, res, next) => {
  const {
    params: { uid },
  } = req;
  let userWithRecipes;
  try {
    userWithRecipes = await User.findById(uid)
      .sort({ published: -1 })
      .populate('recipes');
  } catch (err) {
    return next(
      new HttpError("Quelque chose s'est mal déroulée. Réessayez encore.", 500)
    );
  }
  if (!userWithRecipes) {
    return next(
      new HttpError(
        'Désolé, aucune recette de trouvée avec cet identifiant',
        404
      )
    );
  }
  res.json({
    recipes: userWithRecipes.recipes.map(recipe =>
      recipe.toObject({ getters: true })
    ),
    success: true,
  });
};
const updateRecipe = async (req, res, next) => {
  const {
    params: { rid },
  } = req;
  const { title, ingredients, cooking, duration, image } = req.body;
  let recipe;
  try {
    recipe = await Recipe.findById(rid);
  } catch (err) {
    return next(
      new HttpError("Quelque chose s'est mal déroulée. Réessayez encore.", 500)
    );
  }
  if (!recipe) {
    return next(
      new HttpError(
        "Désolé, il n'y a pas de Recette à mettre à jour avec l'identifiant fourni",
        404
      )
    );
  }
  if (recipe.user.toString() !== req.userData.userId) {
    return next(
      new HttpError(
        "Malheureseument, vous n'êtes pas autorisé à modifier cette recette.",
        422
      )
    );
  }
  recipe.image = image;
  recipe.title = title;
  recipe.ingredients = ingredients;
  recipe.cooking = cooking;
  recipe.duration = duration;
  try {
    await recipe.save();
  } catch (err) {
    return next(
      new HttpError("Quelque chose s'est mal déroulée. Réessayez", 500)
    );
  }

  res.json({ recipe: recipe.toObject({ getters: true }), success: true });
};
const deleteRecipe = async (req, res, next) => {
  const {
    params: { rid },
  } = req;

  let recipe;
  try {
    recipe = await Recipe.findById(rid).populate('user');
  } catch (err) {
    return next(
      new HttpError("Quelque chose s'est mal déroulée. Réessayez encore.", 500)
    );
  }
  if (!recipe) {
    return next(
      new HttpError(
        'Désolé, aucune recette à supprimer avec cet identifiant',
        404
      )
    );
  }
  if (recipe.user.id !== req.userData.userId) {
    return next(
      new HttpError(
        "Malheureseument, vous n'êtes pas autorisé à supprimer cette recette.",
        422
      )
    );
  }
  try {
    const newSession = await mongoose.startSession();
    newSession.startTransaction();
    await recipe.remove({ session: newSession });
    recipe.user.recipes.pull(recipe);
    await recipe.user.save({ session: newSession });
    await newSession.commitTransaction();
  } catch (err) {
    return next(
      new HttpError(
        'Creating Recipe failed unfortunately. Please, try again',
        500
      )
    );
  }

  res.json({ message: 'Recipe has been successfully deleted', success: true });
};

module.exports = {
  getAllRecipes,
  getSingleRecipeById,
  getRecipesByUserId,
  updateRecipe,
  deleteRecipe,
  createRecipe,
};
