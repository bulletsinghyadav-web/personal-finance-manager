exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('transactions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    account_id: { type: 'uuid', notNull: true, references: 'accounts', onDelete: 'CASCADE' },
    category_id: { type: 'uuid', references: 'categories', onDelete: 'SET NULL' },
    type: { type: 'transaction_type', notNull: true },
    amount: { type: 'decimal(18,2)', notNull: true },
    currency: { type: 'currency_code', notNull: true },
    transaction_date: { type: 'date', notNull: true },
    description: { type: 'text', notNull: true },
    notes: { type: 'text' },
    transfer_group_id: { type: 'uuid' },
    exchange_rate_to_base: { type: 'decimal(18,6)' },
    base_currency: { type: 'currency_code' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('transactions', 'transactions_amount_positive', 'CHECK (amount > 0)');

  pgm.createIndex('transactions', 'user_id');
  pgm.createIndex('transactions', ['user_id', 'transaction_date']);
  pgm.createIndex('transactions', ['user_id', 'type']);
  pgm.createIndex('transactions', ['user_id', 'category_id']);
  pgm.createIndex('transactions', ['user_id', 'account_id']);
  pgm.createIndex('transactions', 'transfer_group_id');
};

exports.down = (pgm) => {
  pgm.dropTable('transactions');
};
