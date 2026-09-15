const { query, withTransaction } = require('./pool');

async function createUser({ email, passwordHash, name, defaultCurrency }) {
  const res = await query(
    `INSERT INTO users (email, password_hash, name, default_currency)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, default_currency, created_at, updated_at`,
    [email.toLowerCase(), passwordHash, name, defaultCurrency || 'INR']
  );
  return res.rows[0];
}

async function findByEmail(email) {
  const res = await query(`SELECT * FROM users WHERE email = $1`, [email.toLowerCase()]);
  return res.rows[0] || null;
}

async function findById(id) {
  const res = await query(
    `SELECT id, email, name, default_currency, created_at, updated_at FROM users WHERE id = $1`,
    [id]
  );
  return res.rows[0] || null;
}

async function findByIdWithPassword(id) {
  const res = await query(`SELECT * FROM users WHERE id = $1`, [id]);
  return res.rows[0] || null;
}

async function updateProfile(id, { name, defaultCurrency }) {
  const res = await query(
    `UPDATE users SET
       name = COALESCE($2, name),
       default_currency = COALESCE($3, default_currency),
       updated_at = now()
     WHERE id = $1
     RETURNING id, email, name, default_currency, created_at, updated_at`,
    [id, name ?? null, defaultCurrency ?? null]
  );
  return res.rows[0];
}

async function updatePassword(id, passwordHash) {
  await query(`UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`, [id, passwordHash]);
}

async function deleteUser(id) {
  // ON DELETE CASCADE on all owned tables removes accounts/transactions/etc.
  await query(`DELETE FROM users WHERE id = $1`, [id]);
}

async function storeRefreshToken(userId, tokenHash, expiresAt) {
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );
}

async function findRefreshToken(tokenHash) {
  const res = await query(
    `SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked = false AND expires_at > now()`,
    [tokenHash]
  );
  return res.rows[0] || null;
}

async function revokeRefreshToken(tokenHash) {
  await query(`UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1`, [tokenHash]);
}

async function revokeAllRefreshTokens(userId) {
  await query(`UPDATE refresh_tokens SET revoked = true WHERE user_id = $1`, [userId]);
}

async function storePasswordResetToken(userId, tokenHash, expiresAt) {
  await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );
}

async function findValidPasswordResetToken(tokenHash) {
  const res = await query(
    `SELECT * FROM password_reset_tokens
     WHERE token_hash = $1 AND used = false AND expires_at > now()`,
    [tokenHash]
  );
  return res.rows[0] || null;
}

async function consumePasswordResetToken(id) {
  await query(`UPDATE password_reset_tokens SET used = true WHERE id = $1`, [id]);
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  findByIdWithPassword,
  updateProfile,
  updatePassword,
  deleteUser,
  storeRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  storePasswordResetToken,
  findValidPasswordResetToken,
  consumePasswordResetToken,
  withTransaction,
};
