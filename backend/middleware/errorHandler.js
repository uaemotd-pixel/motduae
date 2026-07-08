import { env } from '../config/env.js';

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

  if (isMongooseValidationError(err)) {
    res.status(400).send({ message: validationMessage(err) });
    return;
  }

  res.status(500).send({
    message: env.nodeEnv === 'production' ? 'Internal Server Error' : err.message,
  });
};
