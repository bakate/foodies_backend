const router = require('express').Router();
const { createRecipeValidator } = require('../middleware/validators');
const {
  getFilteredRecipes,
  getAllRecipes,
  getSingleRecipeById,
  getRecipesByUserId,
  createRecipe,
  updateRecipe,
  deleteRecipe,
} = require('../controllers/recipes-controller');
const checkAuth = require('../middleware/auth');

router.get('/', getFilteredRecipes);
router.get('/all', getAllRecipes);
router.get('/:rid', getSingleRecipeById);
router.get('/user/:uid', getRecipesByUserId);
router.use(checkAuth); //* we are protecting all the below routes thanks to this middleware
router.post('/', createRecipeValidator, createRecipe);
router.patch('/:rid', updateRecipe);
router.delete('/:rid', deleteRecipe);

module.exports = router;
