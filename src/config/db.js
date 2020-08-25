const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const cnx = await mongoose.connect(process.env.ATLAS_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
    });
    console.log(
      `You are connected with your database on: ${cnx.connection.host}`
    );
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

module.exports = connectDB;
