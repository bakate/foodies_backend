const router = require('express').Router();
const { check } = require('express-validator');
const userController = require('../controllers/user-controller');

router.get('/', userController.getUsers);

router.post(
  '/signup',
  [
    check('username').notEmpty(),
    check('email')
      .normalizeEmail()
      .isEmail(),
    check('password').isLength({ min: 6 }),
  ],
  userController.signup
);
router.post('/login', userController.login);
router.post('/reset', userController.resetToken);
router.post('/reset/:token', userController.resetPassword);

module.exports = router;
