const { check } = require('express-validator');

exports.signupValidator = [
  check('username', "Nom d'utilisateur est requis").notEmpty(),
  check('email')
    .normalizeEmail()
    .isEmail()
    .withMessage('Fournissez un email valide'),
  check('password', 'Mot de passe est requis').notEmpty(),
  check('password')
    .isLength({
      min: 6,
    })
    .withMessage('Mot de Passe doit contenir au moins 6 caractères'),
  // .matches(/\d/).withMessage('Mot de passe doit contenir au moins 1 chiffre')
];
exports.loginValidator = [
  check('email')
    .normalizeEmail()
    .isEmail()
    .withMessage('Fournissez un email valide'),
  check('password', 'Mot de passe est requis').notEmpty(),
  check('password')
    .isLength({
      min: 6,
    })
    .withMessage('Mot de Passe doit contenir au moins 6 caractères'),
  // .matches(/\d/)
  // .withMessage('Mot de passe doit contenir au moins 1 chiffre'),
];

exports.forgotPasswordValidator = [
  check('email')
    .not()
    .isEmpty()
    .normalizeEmail()
    .isEmail()
    .withMessage('Fournissez un email valide'),
];

exports.resetPasswordValidator = [
  check('password')
    .not()
    .isEmpty()
    .isLength({ min: 6 })
    .withMessage('Mot de Passe doit contenir au moins 6 caractères'),
];
