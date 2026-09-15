const { Pool } = require('pg');
require('dotenv').config();

const connectionString =
  process.env.NODE_ENV === 'test'
    ? process.env.TEST_DATABASE_URL
    : process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  // Idle client errors should not crash the whole process; log and continue.
  // eslint-disable-next-line no-console
  console.error('Unexpected PostgreSQL pool error', err);
});

async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Run a callback inside a single client transaction (BEGIN/COMMIT/ROLLBACK).
 * Use this for any operation that touches more than one table atomically
 * (e.g. transfers, budget + budget_categories creation).
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function healthCheck() {
  const res = await pool.query('SELECT 1 as ok');
  return res.rows[0].ok === 1;
}

async function closePool() {
  await pool.end();
}

module.exports = { pool, query, withTransaction, healthCheck, closePool };
