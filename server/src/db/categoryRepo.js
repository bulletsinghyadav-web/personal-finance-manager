const { query } = require('./pool');

const DEFAULT_INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Investments', 'Other Income'];
const DEFAULT_EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Housing',
  'Bills & Utilities',
  'Healthcare',
  'Education',
  'Entertainment',
  'Travel',
  'Other Expenses',
];

async function seedDefaultCategories(client, userId) {
  const rows = [
    ...DEFAULT_INCOME_CATEGORIES.map((name) => [userId, name, 'INCOME']),
    ...DEFAULT_EXPENSE_CATEGORIES.map((name) => [userId, name, 'EXPENSE']),
  ];
  for (const [uid, name, type] of rows) {
    // eslint-disable-next-line no-await-in-loop
    await client.query(
      `INSERT INTO categories (user_id, name, type, is_default) VALUES ($1, $2, $3, true)
       ON CONFLICT (user_id, name, type) DO NOTHING`,
      [uid, name, type]
    );
  }
}

async function create(userId, { name, type, icon, color }) {
  const res = await query(
    `INSERT INTO categories (user_id, name, type, icon, color) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, name, type, icon ?? null, color ?? null]
  );
  return res.rows[0];
}

async function listByUser(userId, { type } = {}) {
  const res = await query(
    `SELECT * FROM categories WHERE user_id = $1 AND is_deleted = false ${type ? 'AND type = $2' : ''}
     ORDER BY is_default DESC, name ASC`,
    type ? [userId, type] : [userId]
  );
  return res.rows;
}

async function findById(userId, categoryId) {
  const res = await query(`SELECT * FROM categories WHERE id = $1 AND user_id = $2 AND is_deleted = false`, [
    categoryId,
    userId,
  ]);
  return res.rows[0] || null;
}

async function update(userId, categoryId, { name, icon, color }) {
  const res = await query(
    `UPDATE categories SET
       name = COALESCE($3, name), icon = COALESCE($4, icon), color = COALESCE($5, color), updated_at = now()
     WHERE id = $1 AND user_id = $2 AND is_deleted = false
     RETURNING *`,
    [categoryId, userId, name ?? null, icon ?? null, color ?? null]
  );
  return res.rows[0] || null;
}

/**
 * Soft-delete a category. Historical transactions keep their category_id
 * (and the category record itself is preserved, just hidden from active
 * lists) so past reports remain accurate. New transactions cannot select
 * a deleted category.
 */
async function softDelete(userId, categoryId) {
  const res = await query(
    `UPDATE categories SET is_deleted = true, updated_at = now() WHERE id = $1 AND user_id = $2 RETURNING id`,
    [categoryId, userId]
  );
  return res.rowCount > 0;
}

async function isInUseByBudget(categoryId) {
  const res = await query(`SELECT 1 FROM budget_categories WHERE category_id = $1 LIMIT 1`, [categoryId]);
  return res.rowCount > 0;
}

module.exports = {
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
  seedDefaultCategories,
  create,
  listByUser,
  findById,
  update,
  softDelete,
  isInUseByBudget,
};
