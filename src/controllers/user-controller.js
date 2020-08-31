const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');
const { promisify } = require('util');
const HttpError = require('../models/httpError');
const User = require('../models/user');
const { transport, makeANiceEmail } = require('../util/mail');

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, '-password');
  } catch (err) {
    return next(
      new HttpError("Quelque chose s'est mal déroulée. Réessayez encore.", 500)
    );
  }
  res.json({
    users: users.map(user => user.toObject({ getters: true })),
    success: true,
  });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Les données fournies sont incorrectes. Réessayez', 422)
    );
  }

  const { username, email, password, images } = req.body;
  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (err) {
    return next(new HttpError("L'inscription a échouée. Réessayez", 500));
  }
  if (existingUser) {
    return next(new HttpError('Ce compte existe déjà. Connectez-vous !', 422));
  }

  let hashedPassword;

  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    return next(
      new HttpError(
        "Impossible d'enregistrer ce nouvel utilisateur. Réessayez",
        500
      )
    );
  }

  const createdNewUser = new User({
    username,
    email,
    password: hashedPassword,
    images,
    recipes: [],
    resetToken: null,
    resetTokenExpiry: null,
  });

  try {
    await createdNewUser.save();
  } catch (err) {
    return next(new HttpError("L'inscription a échouée. Réessayez", 500));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdNewUser.id, email: createdNewUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  } catch (err) {
    return next(new HttpError("L'inscription a échouée. Réessayez", 500));
  }
  try {
    await transport.sendMail({
      to: createdNewUser.email,
      from: 'bakatebadevpro@gmail.com',
      subject: 'Bienvenue @Foodies',
      html: makeANiceEmail(
        createdNewUser.username,
        `
    Merci pour votre inscription ! Je suis heureux de vous compter parmi nous !\n
    Je suis Bakate et je serai votre interlocuteur pour toutes vos questions éventuelles 😎.
      \r\r

     En attendant, j'espère vous retrouver rapidement sur la plate-forme pour partager vos différentes recettes.\r\r
     Oui, oui, je sais que vous aimez bien cuisiner !
      `
      ),
    });
  } catch (err) {
    console.log(err);
  }

  res.status(201).json({
    userId: createdNewUser.id,
    email: createdNewUser.email,
    token,
    success: true,
  });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (err) {
    return next(new HttpError('la connexion a échouée. Réessayez', 500));
  }
  if (!existingUser) {
    return next(
      new HttpError(
        `Il n'esiste pas de compte avec: ${email}.
         inscrivez-vous plutôt.`,
        403
      )
    );
  }
  let goodPassword = false;

  try {
    goodPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    return next(new HttpError('Impossible de vous connecter. Réessayez', 500));
  }
  if (!goodPassword) {
    return next(new HttpError(`Mot de passe invalide. Réessayez`, 403));
  }

  let token;
  try {
    token = jwt.sign(
      {
        userId: existingUser.id,
        email: existingUser.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  } catch (err) {
    return next(new HttpError('la connexion a échouée.Réessayez', 500));
  }

  res.status(201).json({
    userId: existingUser.id,
    email: existingUser.email,
    token,
    success: true,
  });
};

const resetToken = async (req, res, next) => {
  const { email } = req.body;
  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (err) {
    return next(new HttpError("l'opération a échouée. Réessayez", 500));
  }
  if (!existingUser) {
    return next(
      new HttpError(
        `Il n'esiste pas de compte avec: ${email}.
         inscrivez-vous plutôt.`,
        403
      )
    );
  }
  const randomBytesPromisified = promisify(randomBytes);
  existingUser.resetToken = (await randomBytesPromisified(32)).toString('hex');
  existingUser.resetTokenExpiry = Date.now() + 3600000;
  try {
    await existingUser.save();
  } catch (err) {
    return next(
      new HttpError("Quelque chose s'est mal déroulée. Réessayez encore.", 500)
    );
  }

  try {
    await transport.sendMail({
      to: existingUser.email,
      from: 'bakatebadevpro@gmail.com',
      subject: 'Réinitialisez Votre Mot de Passe',
      html: makeANiceEmail(
        existingUser.username,
        `
    Il parait que vous avez oublié votre mot de passe.

    En même temps, c'est tellement compliqué de retenir tous ces mots de passe 😊.

    Pour vous simplifier la vie, il vous suffit de cliquer sur ce <a href="${
      process.env.FRONTEND_URL
    }/reset/${existingUser.resetToken}"
    >lien</a> dans l'heure qui suit, pour en regénérer un autre.
      `
      ),
    });
  } catch (err) {
    return next(err);
  }
  res.status(201).json({
    success: true,
  });
};

const resetPassword = async (req, res, next) => {
  const {
    params: { token },
  } = req;
  const { password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    return next(
      new HttpError('Les mots de passe ne sont pas identiques. Réessayez', 422)
    );
  }
  let user;
  try {
    user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });
  } catch (err) {
    console.log(err);
  }
  if (!user) {
    return next(
      new HttpError(
        'Aucun compte de trouvé ou le délai imparti est dépassé',
        422
      )
    );
  }
  let hashedPassword;

  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    return next(
      new HttpError('Impossible de mettre à jour ce compte. Réessayez', 500)
    );
  }
  user.password = hashedPassword;
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;

  try {
    await user.save();
  } catch (err) {
    console.log(err);
  }
  let newToken;
  try {
    newToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  } catch (err) {
    return next(new HttpError('La mise à jour a echouée. Réessayez', 500));
  }

  res.json({ token: newToken, userId: user.id, success: true });
};

const getProfile = async (req, res, next) => {
  const {
    params: { uid },
  } = req;
  let user;
  try {
    user = await User.findById(uid);
  } catch (err) {
    return next(
      new HttpError("Quelque chose s'est mal déroulée. Réessayez encore.", 500)
    );
  }
  if (!user) {
    return next(
      new HttpError(
        "Désolé, Il n'exisite pas de compte avec cet identifiant.",
        404
      )
    );
  }
  res.json({ user: user.toObject({ getters: true }), success: true });
};

const updateProfile = async (req, res, next) => {
  const {
    params: { uid },
  } = req;
  const { username, images } = req.body;

  let user;
  try {
    user = await User.findById(uid);
  } catch (err) {
    return next(
      new HttpError("Quelque chose s'est mal déroulée. Réessayez encore.", 500)
    );
  }
  if (!user) {
    return next(
      new HttpError(
        "Désolé, Il n'exisite pas de compte à mettre à jour avec cet identifiant.",
        404
      )
    );
  }
  if (user.id.toString() !== req.userData.userId) {
    return next(
      new HttpError(
        "Malheureusement, vous n'êtes pas autorisé à mettre à jour ce profil.",
        422
      )
    );
  }
  user.username = username;
  user.images = images;

  try {
    await user.save();
  } catch (err) {
    return next(
      new HttpError("Quelque chose s'est mal déroulée. Réessayez papi", 500)
    );
  }

  res.json({ message: 'Votre profil est bien mis à jour', success: true });
};
module.exports = {
  signup,
  login,
  getUsers,
  resetToken,
  resetPassword,
  getProfile,
  updateProfile,
};
