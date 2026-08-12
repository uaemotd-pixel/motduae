import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseCorsOrigin(value) {
  if (!value) return 'http://localhost:3000';
  const origins = value.split(',').map((origin) => origin.trim()).filter(Boolean);
  return origins.length === 1 ? origins[0] : origins;
}

function vercelOrigin() {
  const url = process.env.VERCEL_URL;
  return url ? `https://${url}` : null;
}

function defaultCorsOrigin() {
  if (process.env.CORS_ORIGIN) {
    return parseCorsOrigin(process.env.CORS_ORIGIN);
  }
  return vercelOrigin() || 'http://localhost:3000';
}

function defaultFrontendUrl() {
  return process.env.FRONTEND_URL || vercelOrigin() || 'http://localhost:3000';
}

export const env = {
  get port() {
    return Number(process.env.PORT) || 5000;
  },
  get nodeEnv() {
    return process.env.NODE_ENV || 'development';
  },
  get mongodbUri() {
    return requireEnv('MONGODB_URI');
  },
  get jwtSecret() {
    return requireEnv('JWT_SECRET');
  },
  get jwtExpiresIn() {
    return process.env.JWT_EXPIRES_IN || '1d';
  },
  get corsOrigin() {
    return defaultCorsOrigin();
  },
  get frontendUrl() {
    return defaultFrontendUrl();
  },
  get googleClientId() {
    return process.env.GOOGLE_CLIENT_ID || '';
  },
  get email() {
    const provider = (process.env.EMAIL_PROVIDER || 'console').toLowerCase();
    return {
      provider: provider === 'ses' ? 'ses' : 'console',
      awsRegion: process.env.AWS_REGION || '',
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      fromEmail: process.env.SES_FROM_EMAIL || '',
      fromName: process.env.SES_FROM_NAME || 'MOTD',
      replyTo: process.env.SES_REPLY_TO || '',
      contactInbox: process.env.CONTACT_INBOX || 'uaemotd@gmail.com',
      configurationSet: process.env.SES_CONFIGURATION_SET || '',
    };
  },
  get stripe() {
    return {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    };
  },
};
