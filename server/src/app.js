const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config/env');
const { requireAuth } = require('./middleware/requireAuth');
const { apiLimiter } = require('./middleware/rateLimiters');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { healthCheck } = require('./db/pool');

const authRoutes = require('./routes/authRoutes');
const accountRoutes = require('./routes/accountRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const currencyRoutes = require('./routes/currencyRoutes');

function createApp() {
  const app = express();
  app.set('trust proxy', 1)

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  if (config.nodeEnv !== 'test') {
    app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
  }

  // Health checks (unauthenticated, used by hosting platforms / Docker)
  app.get('/health', async (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });
  app.get('/health/db', async (req, res) => {
    try {
      const ok = await healthCheck();
      res.json({ status: ok ? 'ok' : 'degraded' });
    } catch (err) {
      res.status(503).json({ status: 'unavailable', error: err.message });
    }
  });

  const api = express.Router();
  api.use(apiLimiter);

  api.use('/auth', authRoutes);
  api.use('/accounts', requireAuth, accountRoutes);
  api.use('/categories', requireAuth, categoryRoutes);
  api.use('/transactions', requireAuth, transactionRoutes);
  api.use('/budgets', requireAuth, budgetRoutes);
  api.use('/dashboard', requireAuth, dashboardRoutes);
  api.use('/reports', requireAuth, reportRoutes);
  api.use('/currencies', requireAuth, currencyRoutes);

  app.use('/api/v1', api);

  try {
    // eslint-disable-next-line global-require
    const { serveApiDocs } = require('./docs/swagger');
    serveApiDocs(app);
  } catch (err) {
    // Swagger docs are optional; app still runs without them.
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
