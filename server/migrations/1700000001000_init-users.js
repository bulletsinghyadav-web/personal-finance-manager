exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createExtension('pgcrypto', { ifNotExists: true });
  pgm.createExtension('citext', { ifNotExists: true });

  pgm.createType('currency_code', ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']);
  pgm.createType('transaction_type', ['INCOME', 'EXPENSE', 'TRANSFER']);
  pgm.createType('account_type', ['CASH', 'BANK', 'SAVINGS', 'CREDIT_CARD', 'OTHER']);

  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    email: { type: 'citext', notNull: true, unique: true },
    password_hash: { type: 'text', notNull: true },
    name: { type: 'text', notNull: true },
    default_currency: { type: 'currency_code', notNull: true, default: 'INR' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('users');
  pgm.dropType('account_type');
  pgm.dropType('transaction_type');
  pgm.dropType('currency_code');
};
