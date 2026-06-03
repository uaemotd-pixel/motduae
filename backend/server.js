import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import userRouter from './routes/userRoutes.js';
import readyMadeRoutes from './routes/readyMadeRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

mongoose
  .connect(env.mongodbUri)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'motd-backend' });
});

app.use('/api/users', userRouter);
app.use('/api/ready-made', readyMadeRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`MOTD API running at http://localhost:${env.port}`);
});
