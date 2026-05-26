export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function notFoundHandler(_req, _res, next) {
  next(httpError(404, 'Route not found'));
}

export function errorHandler(error, _req, res, _next) {
  const status = error.status || 500;
  const message = status >= 500 ? error.message || 'Internal server error' : error.message;

  res.status(status).json({
    success: false,
    error: {
      message
    }
  });
}
