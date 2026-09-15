const { query, withTransaction } = require('./pool');

async function create(userId, { month, year, currency, totalBudget, categories }) {
  return withTransaction(async (client) => {
    const budgetRes = await client.query(
      `INSERT INTO budgets (user_id, month, year, currency, total_budget)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, month, year, currency, totalBudget]
    );
    const budget = budgetRes.rows[0];

    for (const cat of categories || []) {
      // eslint-disable-next-line no-await-in-loop
      await client.query(
        `INSERT INTO budget_categories (budget_id, category_id, limit_amount) VALUES ($1, $2, $3)`,
        [budget.id, cat.categoryId, cat.limitAmount]
      );
    }
    return budget;
  });
}

async function listByUser(userId, { year } = {}) {
  const res = await query(
    `SELECT * FROM budgets WHERE user_id = $1 ${year ? 'AND year = $2' : ''} ORDER BY year DESC, month DESC`,
    year ? [userId, year] : [userId]
  );
  return res.rows;
}

async function findById(userId, budgetId) {
  const budgetRes = await query(`SELECT * FROM budgets WHERE id = $1 AND user_id = $2`, [budgetId, userId]);
  const budget = budgetRes.rows[0];
  if (!budget) return null;
  const catRes = await query(
    `SELECT bc.*, c.name AS category_name, c.color FROM budget_categories bc
     JOIN categories c ON c.id = bc.category_id WHERE bc.budget_id = $1`,
    [budgetId]
  );
  return { ...budget, categories: catRes.rows };
}

async function findByPeriod(userId, month, year, currency) {
  const res = await query(
    `SELECT * FROM budgets WHERE user_id = $1 AND month = $2 AND year = $3 AND currency = $4`,
    [userId, month, year, currency]
  );
  return res.rows[0] || null;
}

async function update(userId, budgetId, { totalBudget, categories }) {
  return withTransaction(async (client) => {
    const res = await client.query(
      `UPDATE budgets SET total_budget = COALESCE($3, total_budget), updated_at = now()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [budgetId, userId, totalBudget ?? null]
    );
    if (res.rowCount === 0) return null;

    if (categories) {
      await client.query(`DELETE FROM budget_categories WHERE budget_id = $1`, [budgetId]);
      for (const cat of categories) {
        // eslint-disable-next-line no-await-in-loop
        await client.query(
          `INSERT INTO budget_categories (budget_id, category_id, limit_amount) VALUES ($1, $2, $3)`,
          [budgetId, cat.categoryId, cat.limitAmount]
        );
      }
    }
    return res.rows[0];
  });
}

async function remove(userId, budgetId) {
  const res = await query(`DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id`, [budgetId, userId]);
  return res.rowCount > 0;
}

/**
 * Sum of EXPENSE transactions within a category during a given month/year,
 * used to compute per-category budget utilization. "Eligible" expenses are
 * those dated within the calendar month, regardless of when they were
 * created/edited — i.e. utilization always reflects the transaction's
 * current transaction_date, so editing a date moves it between budget
 * periods, and deleting a transaction immediately reduces utilization.
 */
async function categorySpend(userId, categoryId, month, year, currency) {
  const res = await query(
    `SELECT COALESCE(SUM(amount), 0)::text AS total
     FROM transactions
     WHERE user_id = $1 AND category_id = $2 AND type = 'EXPENSE' AND currency = $3
       AND EXTRACT(MONTH FROM transaction_date) = $4 AND EXTRACT(YEAR FROM transaction_date) = $5`,
    [userId, categoryId, currency, month, year]
  );
  return res.rows[0].total;
}

async function totalSpend(userId, month, year, currency) {
  const res = await query(
    `SELECT COALESCE(SUM(amount), 0)::text AS total
     FROM transactions
     WHERE user_id = $1 AND type = 'EXPENSE' AND currency = $2
       AND EXTRACT(MONTH FROM transaction_date) = $3 AND EXTRACT(YEAR FROM transaction_date) = $4`,
    [userId, currency, month, year]
  );
  return res.rows[0].total;
}

module.exports = { create, listByUser, findById, findByPeriod, update, remove, categorySpend, totalSpend };
