const router = require('express').Router();
const {
  loginValidator,
  resetPasswordValidator,
  signupValidator,
  forgotPasswordValidator,
} = require('../middleware/validators');

const {
  googleController,
  loginController,
  getUsersController,
  signupController,
  forgotPasswordController,
  resetPasswordController,
  getProfileController,
  updateProfileController,
} = require('../controllers/user-controller');
const checkAuth = require('../middleware/auth');

// router.get(
//   '/google',
//   passport.authenticate('google', { scope: ['profile', 'email'] })
// );
// router.get(
//   '/google/callback',
//   passport.authenticate('google', {
//     failureRedirect: process.env.FRONT_URL,
//   }),
//   googleController
// );

// router.get('/google',goToGoogle);
// router.get('/google/callback',googleController);

router.get('/', getUsersController);

router.post('/signup', signupValidator, signupController);
router.post('/login', loginValidator, loginController);
router.post(
  '/forgotpassword',
  forgotPasswordValidator,
  forgotPasswordController
);
router.post('/googlelogin', googleController);
router.post(
  '/resetpassword/:token',
  resetPasswordValidator,
  resetPasswordController
);
router.get('/profile/:uid', getProfileController);
router.patch('/profile/update/:uid', checkAuth, updateProfileController);

module.exports = router;
