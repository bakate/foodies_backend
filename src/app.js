const express = require('express');

const HttpError = require('./models/httpError');
const connectDB = require('./config/db');

//* Starting MongoDB
connectDB();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const port = process.env.PORT || 5000;

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

//* ROUTES
app.use('/api/recipes', require('./routes/recipes-routes'));
app.use('/api/auth', require('./routes/user-routes'));

//! Error middleware
app.use((req, res, next) =>
  next(new HttpError("Désolé, cette Page n'existe pas", 404))
);

app.use((error, req, res, next) => {
  // if (req.file) {
  //   fs.unlink(req.file.path, (err) => console.log(err));
  // }
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
