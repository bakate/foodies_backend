const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const cors = require('cors');
const morgan = require('morgan');
const HttpError = require('./models/httpError');
const connectDB = require('./config/db');
//* ---------------------------------------- END OF IMPORTS---------------------------------------------------

//* Starting MongoDB
connectDB();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const port = process.env.PORT || 5000;

//* Sessions
app.use(
  session({
    secret: process.env.COOKIE_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3_600_000 },
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
  })
);

//* Communication with a React/Vue or whatever
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
  next();
});

if (process.env.NODE_ENV === 'development') {
  app.use(
    cors({
      origin: process.env.FRONTEND_URL,
    })
  );
  app.use(morgan('dev'));
}
//* ROUTES
app.use('/api/recipes', require('./routes/recipes-routes'));
app.use('/api/auth', require('./routes/user-routes'));

//! Error middleware
app.use((req, res, next) =>
  next(new HttpError("Désolé, cette Page n'existe pas", 404))
);

app.use((error, req, res, next) => {
  if (res.headerSent) {
    next(error);
  }
  res.status(error.code || 500).json({
    message: error.message || "Une erreur inconnue s'est produite !!",
  });
});

app.listen(port, () => {
  console.log(`The magic is happening on: http://localhost:${port}`);
});
