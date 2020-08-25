const router = require('express').Router();
const { check } = require('express-validator');
const recipeController = require('../controllers/recipes-controller');
const checkAuth = require('../middleware/auth');

router.get('/');
router.get('/:rid', recipeController.getSingleRecipeById);
router.get('/user/:uid', recipeController.getRecipesByUserId);
router.use(checkAuth); //* we are protecting all the below routes thanks to this middleware
router.post(
  '/',
  [
    check('title').notEmpty(),
    check('ingredients').notEmpty(),
    check('cooking').notEmpty(),
    check('difficulty').notEmpty(),
    check('images').notEmpty(),
    check('duration').notEmpty(),
  ],
  recipeController.createRecipe
);
router.patch('/:rid', recipeController.updateRecipe);
router.delete('/:rid', recipeController.deleteRecipe);

module.exports = router;
