process.env.NODE_ENV = 'test';
require('dotenv').config();

const { pool } = require('../../db/pool');
const { createApp } = require('../../app');

const app = createApp();

async function truncateAll() {
  await pool.query(`
    TRUNCATE TABLE
      refresh_tokens, password_reset_tokens,
      budget_categories, budgets,
      transactions, categories, accounts,
      exchange_rates, users
    RESTART IDENTITY CASCADE
  `);
}

module.exports = { app, pool, truncateAll };
