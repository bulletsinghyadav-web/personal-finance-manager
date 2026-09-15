const config = require('../config/env');

const baseOptions = {
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: config.cookieSecure ? 'none' : 'lax',
  path: '/',
};

function setAuthCookies(res, { accessToken, refreshToken, refreshExpiresAt }) {
  res.cookie('access_token', accessToken, { ...baseOptions, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refreshToken, {
    ...baseOptions,
    expires: refreshExpiresAt,
    path: '/api/v1/auth', // scope refresh cookie to auth endpoints only
  });
}

function clearAuthCookies(res) {
  res.clearCookie('access_token', { ...baseOptions });
  res.clearCookie('refresh_token', { ...baseOptions, path: '/api/v1/auth' });
}

module.exports = { setAuthCookies, clearAuthCookies };
