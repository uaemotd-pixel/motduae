# Authentication setup (MOTD)

Customer auth supports email/password, Google sign-in, forgot password, and password change in account settings.

## 1. Backend environment

Copy `backend/.env.example` to `backend/.env` and fill in values.

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Signs login tokens (required) |
| `GOOGLE_CLIENT_ID` | Verifies Google ID tokens on the server |
| `FRONTEND_URL` | Base URL for password reset links (default `http://localhost:3000`) |
| `SMTP_USER` / `SMTP_PASS` | Gmail App Password for reset emails |

## 2. Frontend environment

Copy `frontend/.env.local.example` to `frontend/.env.local`.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Same Client ID as backend `GOOGLE_CLIENT_ID` |

## 3. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create **OAuth 2.0 Client ID** → Application type: **Web application**.
3. **Authorized JavaScript origins:** `http://localhost:3000`
4. Copy the Client ID into both `GOOGLE_CLIENT_ID` (backend) and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (frontend).
5. Enable the **Google Identity** / People API if prompted.

Google sign-in is **customers only**. Tailors, admins, and fabric partners continue to use email/password.

## 4. Gmail App Password (forgot password)

1. Enable 2-Step Verification on the Gmail account.
2. Google Account → Security → App passwords → create an app password for “Mail”.
3. Set `SMTP_USER` to the Gmail address and `SMTP_PASS` to the 16-character app password.

Reset links are sent to the user’s registered email and expire after **1 hour**.

## 5. Password rules

Enforced on the frontend (checklist) and backend:

- Minimum 8 characters
- At least one uppercase letter
- At least one number
- At least one special character

Applies to: customer signup, tailor signup, reset password, and change password in account settings.

## 6. Auth API endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/users/signup` | Customer email signup |
| POST | `/api/users/signin` | Email/password login |
| POST | `/api/users/auth/google` | Google sign-in / sign-up (customers) |
| POST | `/api/users/forgot-password` | Send reset email |
| POST | `/api/users/reset-password` | Set new password with token |
| PUT | `/api/users/change-password` | Logged-in password change |
| GET | `/api/users/profile` | Current user + token refresh |

## 7. Frontend routes

| Route | Purpose |
|---|---|
| `/auth/login` | Sign in |
| `/auth/register` | Sign up |
| `/auth/forgetPassword` | Request reset email |
| `/auth/reset-password?token=...` | Set new password |
| `/account?tab=settings` | Change password |

## 8. Google-only accounts

First-time Google users are created **without a phone number**. They can add phone and address later under **Account → Profile**.

If a customer signed up with Google only, forgot password is not applicable until they set a password under **Settings**.
