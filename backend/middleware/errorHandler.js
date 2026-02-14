function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl,
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const timestamp = new Date().toISOString();

  // Basic console logging; could be replaced with a real logger
  // eslint-disable-next-line no-console
  console.error(`[${timestamp}] Error handling request`, {
    method: req.method,
    path: req.originalUrl,
    message: err.message,
    stack: err.stack,
  });

  const isDbError = err && typeof err.code === 'string' && err.code.startsWith('SQLITE');
  const isValidationError = err && err.name === 'ValidationError';
  const isAiError = err && err.source === 'ai';

  let status = err.status || 500;
  let type = 'generic';

  if (isDbError) {
    status = status === 500 ? 503 : status;
    type = 'database';
  } else if (isValidationError) {
    status = 400;
    type = 'validation';
  } else if (isAiError) {
    type = 'ai';
  }

  const response = {
    error: {
      message: err.message || 'Internal server error',
      type,
    },
  };

  if (process.env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
  }

  res.status(status).json(response);
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
