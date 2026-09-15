const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Defense-in-depth CSRF mitigation for a cookie-authenticated JSON API.
 *
 * Primary protections are SameSite=Lax cookies + a strict CORS allowlist
 * (so a third-party site's browser-issued fetch can't read the response and
 * cross-site form submissions can't set a custom header or JSON content
 * type). This middleware adds a belt-and-braces check: any state-changing
 * request must carry the `X-Requested-With` header, which plain HTML forms
 * (the classic CSRF vector) cannot set.
 */
function csrfGuard(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.headers['x-requested-with'] === 'finance-app') return next();
  return res.status(403).json({ error: { message: 'Missing CSRF protection header' } });
}

module.exports = { csrfGuard };
