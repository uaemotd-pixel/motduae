import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import { isAuth, isAdmin, generateToken } from '../middleware/auth.js';
import User from '../models/User.js';
import Customer from '../models/customer.js';

const userRouter = express.Router();
const BCRYPT_ROUNDS = 10;

const sendUserResponse = (res, user) => {
  res.send({
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isAdmin: user.isAdmin,
    approvalStatus: user.approvalStatus,
    token: generateToken(user),
  });
};

userRouter.get(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (_req, res) => {
    const users = await User.find({}).select('-password');
    res.send(users);
  })
);

userRouter.get(
  '/profile',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      res.status(404).send({ message: 'User not found' });
      return;
    }
    sendUserResponse(res, user);
  })
);

userRouter.post(
  '/signin',
  expressAsyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).send({ message: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !bcrypt.compareSync(password, user.password)) {
      res.status(401).send({ message: 'Invalid email or password' });
      return;
    }

    if (user.isActive === false) {
      res.status(403).send({ message: 'Account is deactivated' });
      return;
    }

    sendUserResponse(res, user);
  })
);

userRouter.post(
  '/signup/tailor',
  expressAsyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).send({ message: 'Name, email, and password are required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(400).send({ message: 'User already exists' });
      return;
    }

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: bcrypt.hashSync(password, BCRYPT_ROUNDS),
      role: 'tailor',
      approvalStatus: 'pending',
    });

    const createdUser = await user.save();
    sendUserResponse(res, createdUser);
  })
);

userRouter.post(
  '/signup',
  expressAsyncHandler(async (req, res) => {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password || !phone) {
      res.status(400).send({ message: 'Name, email, password, and contact number are required' });
      return;
    }

    const phoneTrimmed = phone.trim();
    if (!/^\d{9}$/.test(phoneTrimmed)) {
      res.status(400).send({ message: 'Contact number must be exactly 9 digits' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(400).send({ message: 'User already exists' });
      return;
    }

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: bcrypt.hashSync(password, BCRYPT_ROUNDS),
      role: 'customer',
      phone: phone.trim(),
    });

    const createdUser = await user.save();

    // Auto-create Customer profile record
    const customer = new Customer({
      userId: createdUser._id,
      name: createdUser.name,
      phone: phone.trim(),
    });
    await customer.save();

    sendUserResponse(res, createdUser);
  })
);

userRouter.put(
  '/profile',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).send({ message: 'User not found' });
      return;
    }

    if (req.body.name) {
      user.name = req.body.name.trim();
    }
    if (req.body.email) {
      user.email = req.body.email.toLowerCase().trim();
    }
    if (req.body.password) {
      user.password = bcrypt.hashSync(req.body.password, BCRYPT_ROUNDS);
    }

    const updatedUser = await user.save();
    sendUserResponse(res, updatedUser);
  })
);

export default userRouter;
