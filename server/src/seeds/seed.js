/* eslint-disable no-console */
require('dotenv').config();
const { pool } = require('../db/pool');
const { hashPassword } = require('../utils/auth');
const categoryRepo = require('../db/categoryRepo');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding development sample data...');
    await client.query('BEGIN');

    const passwordHash = await hashPassword('DemoPass123');
    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, name, default_currency)
       VALUES ('demo@example.com', $1, 'Demo User', 'INR')
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [passwordHash]
    );
    const userId = userRes.rows[0].id;

    await categoryRepo.seedDefaultCategories(client, userId);

    const accRes = await client.query(
      `INSERT INTO accounts (user_id, name, type, currency, opening_balance)
       VALUES ($1, 'Main Bank Account', 'BANK', 'INR', 25000)
       ON CONFLICT (user_id, name) DO UPDATE SET opening_balance = EXCLUDED.opening_balance
       RETURNING id`,
      [userId]
    );
    const accountId = accRes.rows[0].id;

    const cats = await client.query(`SELECT id, name, type FROM categories WHERE user_id = $1`, [userId]);
    const salary = cats.rows.find((c) => c.name === 'Salary');
    const food = cats.rows.find((c) => c.name === 'Food & Dining');
    const transport = cats.rows.find((c) => c.name === 'Transportation');

    const sampleTransactions = [
      [salary.id, 'INCOME', 60000, '2026-08-01', 'Monthly salary'],
      [food.id, 'EXPENSE', 3500, '2026-08-05', 'Groceries'],
      [transport.id, 'EXPENSE', 1200, '2026-08-07', 'Fuel'],
      [salary.id, 'INCOME', 60000, '2026-09-01', 'Monthly salary'],
      [food.id, 'EXPENSE', 4200, '2026-09-04', 'Groceries'],
      [transport.id, 'EXPENSE', 900, '2026-09-06', 'Cab rides'],
    ];

    for (const [categoryId, type, amount, date, description] of sampleTransactions) {
      // eslint-disable-next-line no-await-in-loop
      await client.query(
        `INSERT INTO transactions (user_id, account_id, category_id, type, amount, currency, transaction_date, description)
         VALUES ($1, $2, $3, $4, $5, 'INR', $6, $7)`,
        [userId, accountId, categoryId, type, amount, date, description]
      );
    }

    await client.query(
      `INSERT INTO budgets (user_id, month, year, currency, total_budget)
       VALUES ($1, 9, 2026, 'INR', 40000)
       ON CONFLICT (user_id, month, year, currency) DO NOTHING`,
      [userId]
    );

    await client.query('COMMIT');
    console.log('Seed complete. Demo login: demo@example.com / DemoPass123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
