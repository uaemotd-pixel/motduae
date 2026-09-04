import mongoose from 'mongoose';
import { env } from '../config/env.js';
import User from '../models/User.js';
import Customer from '../models/customer.js';
import bcrypt from 'bcryptjs';
import { alignPurgeIndexes } from './alignPurgeIndexes.js';

const globalCache = globalThis;

if (!globalCache._mongooseCache) {
  globalCache._mongooseCache = { promise: null };
}

async function ensureGuestUser() {
  try {
    const email = env.guestCustomerEmail;
    const exists = await User.findOne({ email });
    if (!exists) {
      const passwordHash = await bcrypt.hash('MotdSeed123!', 10);
      const newUser = await User.create({
        name: 'Customer',
        email,
        password: passwordHash,
        role: 'customer',
        phone: '+971500000000',
      });
      console.log(`Successfully created guest customer account: ${email}`);
      
      const customerProfile = await Customer.findOne({ userId: newUser._id });
      if (customerProfile) {
        customerProfile.name = 'Customer';
        await customerProfile.save();
      }
    } else {
      if (exists.name !== 'Customer') {
        exists.name = 'Customer';
        await exists.save();
        console.log('Updated guest customer account name to "Customer"');
      }
      
      const customerProfile = await Customer.findOne({ userId: exists._id });
      if (customerProfile && customerProfile.name !== 'Customer') {
        customerProfile.name = 'Customer';
        await customerProfile.save();
        console.log('Updated guest customer profile name to "Customer"');
      }
    }
  } catch (err) {
    console.error('Failed to auto-seed guest customer account:', err.message);
  }
}

/**
 * Connect to MongoDB once and reuse the connection (local dev + Vercel serverless).
 */
export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!globalCache._mongooseCache.promise) {
    mongoose.set('strictQuery', false);
    globalCache._mongooseCache.promise = mongoose
      .connect(env.mongodbUri)
      .then(async () => {
        console.log('Connected to MongoDB');
        await ensureGuestUser();
        try {
          await alignPurgeIndexes();
        } catch (err) {
          console.warn('alignPurgeIndexes failed:', err.message);
        }
        return mongoose.connection;
      })
      .catch((err) => {
        globalCache._mongooseCache.promise = null;
        console.error('MongoDB connection error:', err.message);
        throw err;
      });
  }

  return globalCache._mongooseCache.promise;
}
