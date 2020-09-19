const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');
const { promisify } = require('util');
const { OAuth2Client } = require('google-auth-library');
const HttpError = require('../models/httpError');
const User = require('../models/user');
const { transport, makeANiceEmail } = require('../util/mail');

const getUsersController = async (req, res, next) => {
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

const signupController = async (req, res, next) => {
  const { username, email, password } = req.body;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = Object.values(errors.errors).find(el => el.msg).msg;
    return next(new HttpError(err, 422));
  }

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
    recipes: [],
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
    username: createdNewUser.username,
    token,
    success: true,
  });
};

const loginController = async (req, res, next) => {
  const { email, password } = req.body;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = Object.values(errors.errors).find(el => el.msg).msg;
    return next(new HttpError(err, 422));
  }

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
    username: existingUser.username,
    token,
    success: true,
  });
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
// Google Login
const googleController = async (req, res, next) => {
  const { idToken } = req.body;
  const {
    payload: { email_verified, picture, given_name, email },
  } = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  let user;
  let token;
  if (email_verified) {
    try {
      user = await User.findOne({ email });
    } catch (err) {
      return next(new HttpError('la connexion a échouée. Réessayez', 500));
    }

    if (user) {
      const { _id: userId, username } = user;
      try {
        token = jwt.sign(
          {
            userId,
          },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );
      } catch (err) {
        return next(new HttpError('la connexion a échouée. Réessayez', 500));
      }
      return res.status(201).json({ token, userId, username, success: true });
    }
    const password = `${Date.now().toString()}${email}-&@&${Date.now()}`;
    user = new User({ username: given_name, email, password, avatar: picture });
    try {
      await user.save();
    } catch (err) {
      return next(
        new HttpError(
          "Erreur lors de l'enregistrement avec Google. Réessayez",
          400
        )
      );
    }
    token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    try {
      await transport.sendMail({
        to: user.email,
        from: 'bakatebadevpro@gmail.com',
        subject: 'Bienvenue @Foodies',
        html: makeANiceEmail(
          user.username,
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
    res.json({
      token,
      userId: user._id,
      username: user.username,
      success: true,
    });
  } else {
    return next(new HttpError('Echec de connexion via Google. Réessayez', 400));
  }
  // res.redirect(`${process.env.FRONTEND_URL}?${token}`);
};

const forgotPasswordController = async (req, res, next) => {
  const { email } = req.body;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = Object.values(errors.errors).find(el => el.msg).msg;
    return next(new HttpError(err, 422));
  }
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
    }/resetpassword/${existingUser.resetToken}"
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

const resetPasswordController = async (req, res, next) => {
  const { password, confirmedPassword } = req.body;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = Object.values(errors.errors).find(el => el.msg).msg;
    return next(new HttpError(err, 422));
  }
  const {
    params: { token },
  } = req;
  if (password !== confirmedPassword) {
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

const getProfileController = async (req, res, next) => {
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

const updateProfileController = async (req, res, next) => {
  const {
    params: { uid },
  } = req;
  const { username, avatar } = req.body;

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
  user.avatar = avatar;

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
  signupController,
  loginController,
  getUsersController,
  forgotPasswordController,
  resetPasswordController,
  getProfileController,
  updateProfileController,
  googleController,
};
