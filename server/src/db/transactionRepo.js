const { query, withTransaction } = require('./pool');
const { v4: uuidv4 } = require('uuid');

function buildFilters(userId, filters, startIndex) {
  const clauses = [`t.user_id = $1`];
  const params = [userId];
  let i = startIndex;

  if (filters.type) {
    clauses.push(`t.type = $${i++}`);
    params.push(filters.type);
  }
  if (filters.categoryId) {
    clauses.push(`t.category_id = $${i++}`);
    params.push(filters.categoryId);
  }
  if (filters.accountId) {
    clauses.push(`t.account_id = $${i++}`);
    params.push(filters.accountId);
  }
  if (filters.startDate) {
    clauses.push(`t.transaction_date >= $${i++}`);
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    clauses.push(`t.transaction_date <= $${i++}`);
    params.push(filters.endDate);
  }
  if (filters.search) {
    clauses.push(`(t.description ILIKE $${i} OR t.notes ILIKE $${i})`);
    params.push(`%${filters.search}%`);
    i++;
  }
  return { where: clauses.join(' AND '), params, nextIndex: i };
}

const SORT_COLUMN_MAP = {
  transactionDate: 'transaction_date',
  amount: 'amount',
};

async function list(userId, filters) {
  const { where, params, nextIndex } = buildFilters(userId, filters, 2);
  const sortCol = SORT_COLUMN_MAP[filters.sortBy] || 'transaction_date';
  const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
  const limit = filters.pageSize;
  const offset = (filters.page - 1) * filters.pageSize;

  const dataParams = [...params, limit, offset];
  const dataRes = await query(
    `SELECT t.*, c.name AS category_name, c.color AS category_color, a.name AS account_name
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     JOIN accounts a ON a.id = t.account_id
     WHERE ${where}
     ORDER BY t.${sortCol} ${sortOrder}, t.created_at ${sortOrder}
     LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
    dataParams
  );

  const countRes = await query(`SELECT COUNT(*)::int AS total FROM transactions t WHERE ${where}`, params);

  return {
    data: dataRes.rows,
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total: countRes.rows[0].total,
      totalPages: Math.max(1, Math.ceil(countRes.rows[0].total / filters.pageSize)),
    },
  };
}

async function findById(userId, id) {
  const res = await query(
    `SELECT t.*, c.name AS category_name, a.name AS account_name
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     JOIN accounts a ON a.id = t.account_id
     WHERE t.id = $1 AND t.user_id = $2`,
    [id, userId]
  );
  return res.rows[0] || null;
}

async function create(userId, data) {
  const res = await query(
    `INSERT INTO transactions
       (user_id, account_id, category_id, type, amount, currency, transaction_date, description, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      userId,
      data.accountId,
      data.categoryId || null,
      data.type,
      data.amount,
      data.currency,
      data.transactionDate,
      data.description,
      data.notes || null,
    ]
  );
  return res.rows[0];
}

/**
 * Create a transfer between two of the user's own accounts as two atomically
 * linked ledger rows (debit from source, credit to destination), sharing a
 * transfer_group_id so it can be displayed/undone as a single event. Neither
 * leg is counted as income or expense in reports.
 */
async function createTransfer(userId, { accountId, toAccountId, amount, currency, transactionDate, description, notes }) {
  const transferGroupId = uuidv4();
  return withTransaction(async (client) => {
    const debit = await client.query(
      `INSERT INTO transactions
        (user_id, account_id, category_id, type, amount, currency, transaction_date, description, notes, transfer_group_id, transfer_direction)
       VALUES ($1, $2, NULL, 'TRANSFER', $3, $4, $5, $6, $7, $8, 'OUT') RETURNING *`,
      [userId, accountId, amount, currency, transactionDate, description, notes || null, transferGroupId]
    );
    const credit = await client.query(
      `INSERT INTO transactions
        (user_id, account_id, category_id, type, amount, currency, transaction_date, description, notes, transfer_group_id, transfer_direction)
       VALUES ($1, $2, NULL, 'TRANSFER', $3, $4, $5, $6, $7, $8, 'IN') RETURNING *`,
      [userId, toAccountId, amount, currency, transactionDate, description, notes || null, transferGroupId]
    );
    return { debit: debit.rows[0], credit: credit.rows[0] };
  });
}

async function update(userId, id, data) {
  const res = await query(
    `UPDATE transactions SET
       account_id = COALESCE($3, account_id),
       category_id = $4,
       amount = COALESCE($5, amount),
       currency = COALESCE($6, currency),
       transaction_date = COALESCE($7, transaction_date),
       description = COALESCE($8, description),
       notes = $9,
       updated_at = now()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [
      id,
      userId,
      data.accountId ?? null,
      data.categoryId ?? null,
      data.amount ?? null,
      data.currency ?? null,
      data.transactionDate ?? null,
      data.description ?? null,
      data.notes ?? null,
    ]
  );
  return res.rows[0] || null;
}

async function remove(userId, id) {
  const res = await query(`DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id`, [id, userId]);
  return res.rowCount > 0;
}

/** Aggregate totals (income/expense) for a user within an optional date range, in a single currency bucket per row. */
async function aggregateTotalsByCurrency(userId, { startDate, endDate } = {}) {
  const clauses = [`user_id = $1`, `type IN ('INCOME','EXPENSE')`];
  const params = [userId];
  let i = 2;
  if (startDate) {
    clauses.push(`transaction_date >= $${i++}`);
    params.push(startDate);
  }
  if (endDate) {
    clauses.push(`transaction_date <= $${i++}`);
    params.push(endDate);
  }
  const res = await query(
    `SELECT currency, type, SUM(amount)::text AS total
     FROM transactions WHERE ${clauses.join(' AND ')}
     GROUP BY currency, type`,
    params
  );
  return res.rows;
}

async function categoryBreakdown(userId, { startDate, endDate, type = 'EXPENSE' } = {}) {
  const clauses = [`t.user_id = $1`, `t.type = $2`];
  const params = [userId, type];
  let i = 3;
  if (startDate) {
    clauses.push(`t.transaction_date >= $${i++}`);
    params.push(startDate);
  }
  if (endDate) {
    clauses.push(`t.transaction_date <= $${i++}`);
    params.push(endDate);
  }
  const res = await query(
    `SELECT c.id AS category_id, c.name AS category_name, c.color, t.currency, SUM(t.amount)::text AS total
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE ${clauses.join(' AND ')}
     GROUP BY c.id, c.name, c.color, t.currency
     ORDER BY total DESC`,
    params
  );
  return res.rows;
}

/** Monthly income/expense series for the trailing N months (for charting). */
async function monthlySeries(userId, months = 12) {
  const res = await query(
    `SELECT to_char(date_trunc('month', transaction_date), 'YYYY-MM') AS month,
            currency, type, SUM(amount)::text AS total
     FROM transactions
     WHERE user_id = $1
       AND type IN ('INCOME', 'EXPENSE')
       AND transaction_date >= (date_trunc('month', CURRENT_DATE) - ($2 || ' months')::interval)
     GROUP BY 1, currency, type
     ORDER BY 1 ASC`,
    [userId, months - 1]
  );
  return res.rows;
}

module.exports = {
  list,
  findById,
  create,
  createTransfer,
  update,
  remove,
  aggregateTotalsByCurrency,
  categoryBreakdown,
  monthlySeries,
};
