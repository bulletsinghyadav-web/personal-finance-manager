const config = require('../config/env');

class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

// PostgreSQL error codes we translate into friendly API responses.
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_CHECK_VIOLATION = '23514';

function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.originalUrl}` } });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: { message: err.message, details: err.details } });
  }

  if (err && err.code === PG_UNIQUE_VIOLATION) {
    return res.status(409).json({ error: { message: 'A record with these details already exists.' } });
  }
  if (err && err.code === PG_FOREIGN_KEY_VIOLATION) {
    return res.status(409).json({ error: { message: 'This action references a record that does not exist or is not accessible.' } });
  }
  if (err && err.code === PG_CHECK_VIOLATION) {
    return res.status(422).json({ error: { message: 'The submitted values violate a data constraint (e.g. amount must be positive).' } });
  }

  // eslint-disable-next-line no-console
  console.error(err);

  const isProd = config.nodeEnv === 'production';
  res.status(500).json({
    error: {
      message: 'An unexpected error occurred.',
      // Never leak stack traces or internal details in production.
      ...(isProd ? {} : { debug: err.message }),
    },
  });
}

module.exports = { ApiError, notFoundHandler, errorHandler };
