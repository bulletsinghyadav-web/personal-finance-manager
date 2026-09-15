const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/env');

const SALT_ROUNDS = 12;

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

async function verifyPassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessTtl,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

/** Refresh tokens are opaque random strings; only their SHA-256 hash is stored. */
function generateOpaqueToken() {
  return crypto.randomBytes(48).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshTokenExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + config.jwt.refreshTtlDays);
  return d;
}

function passwordResetExpiry() {
  const d = new Date();
  d.setHours(d.getHours() + 1);
  return d;
}

module.exports = {
  hashPassword,
  verifyPassword,
  signAccessToken,
  verifyAccessToken,
  generateOpaqueToken,
  hashToken,
  refreshTokenExpiry,
  passwordResetExpiry,
};
