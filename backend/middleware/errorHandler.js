import { env } from '../config/env.js';

export const PUBLIC_SERVER_ERROR = 'Something went wrong';

export function clientErrorMessage(err, status = 500) {
  const code = Number(status) || 500;
  if (env.nodeEnv === 'production' && code >= 500) {
    return PUBLIC_SERVER_ERROR;
  }
  return err?.message || PUBLIC_SERVER_ERROR;
}

export const notFound = (_req, res) => {
  res.status(404).send({ message: 'Not Found' });
};

const isMongooseValidationError = (err) =>
  err?.name === 'ValidationError' ||
  err?.name === 'CastError' ||
  err?.code === 11000;

const validationMessage = (err) => {
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return `A record with this ${field} already exists`;
  }

  if (err?.errors) {
    const first = Object.values(err.errors)[0];
    if (first?.message) return first.message;
  }

  return err?.message || 'Validation failed';
};

export const errorHandler = (err, _req, res, _next) => {
  console.error(err.stack);

  if (err?.name === 'RateLimitStoreError') {
    res.status(503).send({ message: 'Please try again in a moment' });
    return;
  }

  if (isMongooseValidationError(err)) {
    res.status(400).send({
      message:
        env.nodeEnv === 'production'
          ? PUBLIC_SERVER_ERROR
          : validationMessage(err),
    });
    return;
  }

  res.status(500).send({
    message: clientErrorMessage(err, 500),
  });
};
