class HttpError extends Error {
  constructor(message, errorCode) {
    super(message); //* add ad message property
    this.code = errorCode; //* add and errorCode property
  }
}
module.exports = HttpError;
