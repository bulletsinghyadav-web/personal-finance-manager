const { query } = require('./pool');

async function create(userId, { name, type, currency, openingBalance }) {
  const res = await query(
    `INSERT INTO accounts (user_id, name, type, currency, opening_balance)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, name, type, currency, openingBalance ?? 0]
  );
  return res.rows[0];
}

async function listByUser(userId, { includeArchived = false } = {}) {
  const res = await query(
    `SELECT a.*,
       a.opening_balance
         + COALESCE((
             SELECT SUM(
               CASE
                 WHEN t.type = 'INCOME' THEN t.amount
                 WHEN t.type = 'EXPENSE' THEN -t.amount
                 WHEN t.type = 'TRANSFER' AND t.transfer_direction = 'OUT' THEN -t.amount
                 WHEN t.type = 'TRANSFER' AND t.transfer_direction = 'IN' THEN t.amount
                 ELSE 0
               END
             )
             FROM transactions t WHERE t.account_id = a.id
           ), 0) AS current_balance
     FROM accounts a
     WHERE a.user_id = $1 ${includeArchived ? '' : 'AND a.is_archived = false'}
     ORDER BY a.created_at ASC`,
    [userId]
  );
  return res.rows;
}

async function findById(userId, accountId) {
  const res = await query(`SELECT * FROM accounts WHERE id = $1 AND user_id = $2`, [accountId, userId]);
  return res.rows[0] || null;
}

async function update(userId, accountId, fields) {
  const res = await query(
    `UPDATE accounts SET
       name = COALESCE($3, name),
       type = COALESCE($4, type),
       is_archived = COALESCE($5, is_archived),
       updated_at = now()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [accountId, userId, fields.name ?? null, fields.type ?? null, fields.isArchived ?? null]
  );
  return res.rows[0] || null;
}

async function remove(userId, accountId) {
  const res = await query(`DELETE FROM accounts WHERE id = $1 AND user_id = $2 RETURNING id`, [
    accountId,
    userId,
  ]);
  return res.rowCount > 0;
}

async function hasTransactions(accountId) {
  const res = await query(`SELECT 1 FROM transactions WHERE account_id = $1 LIMIT 1`, [accountId]);
  return res.rowCount > 0;
}

module.exports = { create, listByUser, findById, update, remove, hasTransactions };
