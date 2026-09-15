exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('transfer_direction', ['OUT', 'IN']);
  pgm.addColumn('transactions', {
    transfer_direction: { type: 'transfer_direction' },
  });
  pgm.addConstraint(
    'transactions',
    'transactions_transfer_direction_consistency',
    "CHECK ((type = 'TRANSFER' AND transfer_direction IS NOT NULL) OR (type != 'TRANSFER' AND transfer_direction IS NULL))"
  );
};

exports.down = (pgm) => {
  pgm.dropConstraint('transactions', 'transactions_transfer_direction_consistency');
  pgm.dropColumn('transactions', 'transfer_direction');
  pgm.dropType('transfer_direction');
};
