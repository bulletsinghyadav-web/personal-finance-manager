require('dotenv').config();

function required(name, fallback) {
  const val = process.env[name] ?? fallback;
  if (val === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

function buildAllowedOrigins() {
  const configured = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_ORIGIN || 'http://localhost:5176')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const defaultLocalDevOrigins = [];
  for (let port = 5173; port <= 5195; port += 1) {
    defaultLocalDevOrigins.push(`http://localhost:${port}`);
    defaultLocalDevOrigins.push(`http://127.0.0.1:${port}`);
  }

  return [...new Set([...defaultLocalDevOrigins, ...configured])];
}

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4001', 10),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5176',
  allowedOrigins: buildAllowedOrigins(),
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'insecure_dev_secret_access'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'insecure_dev_secret_refresh'),
    accessTtl: process.env.ACCESS_TOKEN_TTL || '15m',
    refreshTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '30', 10),
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Finance App <no-reply@example.com>',
  },
  exchangeRateProvider: process.env.EXCHANGE_RATE_PROVIDER || 'static',
};

module.exports = config;
