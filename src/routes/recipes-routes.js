const router = require('express').Router();
const { createRecipeValidator } = require('../middleware/validators');
const recipeController = require('../controllers/recipes-controller');
const checkAuth = require('../middleware/auth');

router.get('/', recipeController.getAllRecipes);
router.get('/:rid', recipeController.getSingleRecipeById);
router.get('/user/:uid', recipeController.getRecipesByUserId);
router.use(checkAuth); //* we are protecting all the below routes thanks to this middleware
router.post('/', createRecipeValidator, recipeController.createRecipe);
router.patch('/:rid', recipeController.updateRecipe);
router.delete('/:rid', recipeController.deleteRecipe);

module.exports = router;
