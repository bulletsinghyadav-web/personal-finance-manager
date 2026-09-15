const userRepo = require('../db/userRepo');
const categoryRepo = require('../db/categoryRepo');
const { pool } = require('../db/pool');
const {
  hashPassword,
  verifyPassword,
  signAccessToken,
  generateOpaqueToken,
  hashToken,
  refreshTokenExpiry,
  passwordResetExpiry,
} = require('../utils/auth');
const { setAuthCookies, clearAuthCookies } = require('../utils/cookies');
const { ApiError } = require('../middleware/errorHandler');
const { sendPasswordResetEmail } = require('../services/emailService');
const config = require('../config/env');

async function issueSession(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = generateOpaqueToken();
  const refreshExpiresAt = refreshTokenExpiry();
  await userRepo.storeRefreshToken(user.id, hashToken(refreshToken), refreshExpiresAt);
  setAuthCookies(res, { accessToken, refreshToken, refreshExpiresAt });
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    defaultCurrency: user.default_currency,
    createdAt: user.created_at,
  };
}

async function register(req, res, next) {
  try {
    const { email, password, name, defaultCurrency } = req.body;
    const existing = await userRepo.findByEmail(email);
    if (existing) {
      throw new ApiError(409, 'An account with this email already exists.');
    }
    const passwordHash = await hashPassword(password);

    const client = await pool.connect();
    let user;
    try {
      await client.query('BEGIN');
      const insertRes = await client.query(
        `INSERT INTO users (email, password_hash, name, default_currency)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, name, default_currency, created_at, updated_at`,
        [email.toLowerCase(), passwordHash, name, defaultCurrency || 'INR']
      );
      user = insertRes.rows[0];
      await categoryRepo.seedDefaultCategories(client, user.id);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    await issueSession(res, user);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await userRepo.findByEmail(email);
    if (!user) throw new ApiError(401, 'Invalid email or password.');

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) throw new ApiError(401, 'Invalid email or password.');

    await issueSession(res, user);
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await userRepo.revokeRefreshToken(hashToken(refreshToken));
    }
    clearAuthCookies(res);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) throw new ApiError(401, 'No refresh token provided.');

    const record = await userRepo.findRefreshToken(hashToken(refreshToken));
    if (!record) throw new ApiError(401, 'Refresh token is invalid or expired.');

    const user = await userRepo.findById(record.user_id);
    if (!user) throw new ApiError(401, 'User no longer exists.');

    // Rotate: revoke old, issue new
    await userRepo.revokeRefreshToken(hashToken(refreshToken));
    await issueSession(res, user);
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await userRepo.findById(req.userId);
    if (!user) throw new ApiError(404, 'User not found.');
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const user = await userRepo.updateProfile(req.userId, req.body);
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await userRepo.findByIdWithPassword(req.userId);
    const valid = await verifyPassword(currentPassword, user.password_hash);
    if (!valid) throw new ApiError(401, 'Current password is incorrect.');

    const newHash = await hashPassword(newPassword);
    await userRepo.updatePassword(req.userId, newHash);
    await userRepo.revokeAllRefreshTokens(req.userId);
    clearAuthCookies(res);
    res.json({ message: 'Password updated. Please log in again.' });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await userRepo.findByEmail(email);

    // Always respond the same way whether or not the account exists, to
    // avoid leaking which emails are registered.
    if (user) {
      const token = generateOpaqueToken();
      await userRepo.storePasswordResetToken(user.id, hashToken(token), passwordResetExpiry());
      await sendPasswordResetEmail(user.email, token);
    }

    const isDevMode = config.nodeEnv !== 'production' && !config.smtp.host;
    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
      // Dev convenience only: never expose the raw token in production responses.
      ...(isDevMode && user ? { devNote: 'SMTP not configured; reset link was logged to server console instead of emailed.' } : {}),
    });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    const record = await userRepo.findValidPasswordResetToken(hashToken(token));
    if (!record) throw new ApiError(400, 'This reset link is invalid or has expired.');

    const newHash = await hashPassword(newPassword);
    await userRepo.updatePassword(record.user_id, newHash);
    await userRepo.consumePasswordResetToken(record.id);
    await userRepo.revokeAllRefreshTokens(record.user_id);

    res.json({ message: 'Password has been reset. Please log in with your new password.' });
  } catch (err) {
    next(err);
  }
}

async function deleteAccount(req, res, next) {
  try {
    const { password } = req.body;
    const user = await userRepo.findByIdWithPassword(req.userId);
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) throw new ApiError(401, 'Password is incorrect.');

    await userRepo.deleteUser(req.userId);
    clearAuthCookies(res);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  logout,
  refresh,
  me,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  deleteAccount,
};
