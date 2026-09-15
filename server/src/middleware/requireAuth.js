const { verifyAccessToken } = require('../utils/auth');

/**
 * Requires a valid access token, either from the httpOnly cookie
 * ("access_token") or an Authorization: Bearer header (useful for
 * non-browser API clients / tests). Attaches req.userId on success.
 */
function requireAuth(req, res, next) {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  const token = req.cookies?.access_token || bearer;

  if (!token) {
    return res.status(401).json({ error: { message: 'Authentication required' } });
  }

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch (err) {
    return res.status(401).json({ error: { message: 'Invalid or expired session' } });
  }
}

module.exports = { requireAuth };
