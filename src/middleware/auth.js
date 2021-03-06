const jwt = require('jsonwebtoken');
const HttpError = require('../models/httpError');

module.exports = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }
  try {
    const token = req.headers.authorization.split(' ')[1];

    if (!token) {
      throw new Error('Authentication failed, no token found');
    }
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decodedToken);
    req.userData = { userId: decodedToken.userId };
    next();
  } catch (err) {
    next(new HttpError('Authentication failed', 401));
  }
};

// module.exports = {
//   ensureAuth(req, res, next) {
//     if (req.isAuthenticated()) {
//       return next()
//     }
//     res.redirect('/')
//   },
//   ensureGuest(req, res, next) {
//     if (!req.isAuthenticated()) {
//       return next()
//     }
//     res.redirect('/dashboard')
//   },
// }
