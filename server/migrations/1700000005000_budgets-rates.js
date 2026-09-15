exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('budgets', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    month: { type: 'integer', notNull: true },
    year: { type: 'integer', notNull: true },
    currency: { type: 'currency_code', notNull: true },
    total_budget: { type: 'decimal(18,2)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('budgets', 'budgets_month_range', 'CHECK (month BETWEEN 1 AND 12)');
  pgm.addConstraint('budgets', 'budgets_total_positive', 'CHECK (total_budget >= 0)');
  pgm.addConstraint(
    'budgets',
    'budgets_user_period_currency_unique',
    'UNIQUE(user_id, month, year, currency)'
  );
  pgm.createIndex('budgets', 'user_id');

  pgm.createTable('budget_categories', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    budget_id: { type: 'uuid', notNull: true, references: 'budgets', onDelete: 'CASCADE' },
    category_id: { type: 'uuid', notNull: true, references: 'categories', onDelete: 'CASCADE' },
    limit_amount: { type: 'decimal(18,2)', notNull: true },
  });
  pgm.addConstraint(
    'budget_categories',
    'budget_categories_unique',
    'UNIQUE(budget_id, category_id)'
  );
  pgm.addConstraint('budget_categories', 'budget_categories_limit_positive', 'CHECK (limit_amount >= 0)');

  pgm.createTable('exchange_rates', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    base_currency: { type: 'currency_code', notNull: true },
    quote_currency: { type: 'currency_code', notNull: true },
    rate: { type: 'decimal(18,6)', notNull: true },
    as_of_date: { type: 'date', notNull: true },
    source: { type: 'text', notNull: true, default: 'manual' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint(
    'exchange_rates',
    'exchange_rates_unique',
    'UNIQUE(base_currency, quote_currency, as_of_date)'
  );
  pgm.createIndex('exchange_rates', ['base_currency', 'quote_currency']);
};

exports.down = (pgm) => {
  pgm.dropTable('exchange_rates');
  pgm.dropTable('budget_categories');
  pgm.dropTable('budgets');
};
