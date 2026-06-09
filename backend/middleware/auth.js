import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const generateToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
    },
    env.jwtSecret,
    { expiresIn: '30d' }
  );
};

export const isAuth = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).send({ message: 'No Token' });
    return;
  }

  const token = authorization.slice(7);
  jwt.verify(token, env.jwtSecret, (err, decode) => {
    if (err) {
      res.status(401).send({ message: 'Invalid Token' });
      return;
    }
    req.user = decode;
    next();
  });
};

export const isAdmin = (req, res, next) => {
  if (req.user?.isAdmin) {
    next();
    return;
  }
  res.status(403).send({ message: 'Forbidden: Admin access required' });
};
