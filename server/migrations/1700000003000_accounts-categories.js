exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('accounts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    name: { type: 'text', notNull: true },
    type: { type: 'account_type', notNull: true },
    currency: { type: 'currency_code', notNull: true },
    opening_balance: { type: 'decimal(18,2)', notNull: true, default: 0 },
    is_archived: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('accounts', 'accounts_user_name_unique', 'UNIQUE(user_id, name)');
  pgm.createIndex('accounts', 'user_id');

  pgm.createTable('categories', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    name: { type: 'text', notNull: true },
    type: { type: 'transaction_type', notNull: true },
    icon: { type: 'text' },
    color: { type: 'text' },
    is_default: { type: 'boolean', notNull: true, default: false },
    is_deleted: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('categories', 'categories_user_name_type_unique', 'UNIQUE(user_id, name, type)');
  pgm.createIndex('categories', 'user_id');
};

exports.down = (pgm) => {
  pgm.dropTable('categories');
  pgm.dropTable('accounts');
};
