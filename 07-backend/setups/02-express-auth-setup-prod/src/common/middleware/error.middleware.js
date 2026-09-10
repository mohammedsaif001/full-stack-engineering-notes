import ApiError from "../utils/api-error.js";

const errorHandler = (err, req, res, next) => {
  let error = err;

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === "CastError") {
    const message = `Invalid ${err.path}: ${err.value}`;
    error = ApiError.badRequest(message);
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    const message = field ? `${field} already exists` : "Duplicate field value entered";
    error = ApiError.conflict(message);
  }

  // Handle Mongoose ValidationError
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val) => val.message).join("; ");
    error = ApiError.badRequest(message);
  }

  // Handle Multer errors
  if (err.code === "LIMIT_FILE_SIZE") {
    error = ApiError.badRequest("File size limit exceeded");
  } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
    error = ApiError.badRequest("Unexpected upload field");
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";

  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default errorHandler;
