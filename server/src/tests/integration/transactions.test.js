const request = require('supertest');
const { app, truncateAll, pool } = require('./setup');

let agent;
let accountId;
let incomeCategoryId;
let expenseCategoryId;

beforeEach(async () => {
  await truncateAll();
  agent = request.agent(app);
  await agent.post('/api/v1/auth/register').send({
    email: 'txuser@example.com',
    password: 'Password123',
    name: 'Tx User',
  });

  const accRes = await agent
    .post('/api/v1/accounts')
    .set('X-Requested-With', 'finance-app')
    .send({ name: 'Wallet', type: 'CASH', currency: 'INR', openingBalance: 0 });
  accountId = accRes.body.account.id;

  const cats = await agent.get('/api/v1/categories');
  incomeCategoryId = cats.body.categories.find((c) => c.type === 'INCOME').id;
  expenseCategoryId = cats.body.categories.find((c) => c.type === 'EXPENSE').id;
});

afterAll(async () => {
  await pool.end();
});

describe('POST /api/v1/transactions', () => {
  it('creates an income transaction', async () => {
    const res = await agent
      .post('/api/v1/transactions')
      .set('X-Requested-With', 'finance-app')
      .send({
        accountId,
        categoryId: incomeCategoryId,
        type: 'INCOME',
        amount: 1000,
        currency: 'INR',
        transactionDate: '2026-01-15',
        description: 'Freelance payment',
      });
    expect(res.status).toBe(201);
    expect(res.body.transaction.amount).toBe('1000.00');
  });

  it('rejects a negative or zero amount', async () => {
    const res = await agent
      .post('/api/v1/transactions')
      .set('X-Requested-With', 'finance-app')
      .send({
        accountId,
        categoryId: expenseCategoryId,
        type: 'EXPENSE',
        amount: -50,
        currency: 'INR',
        transactionDate: '2026-01-15',
        description: 'Bad amount',
      });
    expect(res.status).toBe(422);
  });

  it('rejects an unknown account id', async () => {
    const res = await agent
      .post('/api/v1/transactions')
      .set('X-Requested-With', 'finance-app')
      .send({
        accountId: '00000000-0000-0000-0000-000000000000',
        type: 'EXPENSE',
        categoryId: expenseCategoryId,
        amount: 50,
        currency: 'INR',
        transactionDate: '2026-01-15',
        description: 'Nope',
      });
    expect(res.status).toBe(404);
  });

  it('creates a transfer as two linked, currency-correct legs neither counted as income/expense', async () => {
    const acc2 = await agent
      .post('/api/v1/accounts')
      .set('X-Requested-With', 'finance-app')
      .send({ name: 'Savings', type: 'SAVINGS', currency: 'INR' });

    const res = await agent
      .post('/api/v1/transactions')
      .set('X-Requested-With', 'finance-app')
      .send({
        accountId,
        toAccountId: acc2.body.account.id,
        type: 'TRANSFER',
        amount: 200,
        currency: 'INR',
        transactionDate: '2026-01-16',
        description: 'Move funds',
      });
    expect(res.status).toBe(201);
    expect(res.body.transaction.transfer_group_id).toBe(res.body.linkedTransaction.transfer_group_id);
    expect(res.body.transaction.transfer_direction).toBe('OUT');
    expect(res.body.linkedTransaction.transfer_direction).toBe('IN');

    const dashboard = await agent.get('/api/v1/dashboard/summary');
    expect(dashboard.body.totals.totalIncome).toBe(0);
    expect(dashboard.body.totals.totalExpenses).toBe(0);
  });

  it('rejects a transfer to the same account', async () => {
    const res = await agent
      .post('/api/v1/transactions')
      .set('X-Requested-With', 'finance-app')
      .send({
        accountId,
        toAccountId: accountId,
        type: 'TRANSFER',
        amount: 100,
        currency: 'INR',
        transactionDate: '2026-01-16',
        description: 'Self transfer',
      });
    expect(res.status).toBe(422);
  });
});

describe('GET /api/v1/transactions (list/filter/search/sort/paginate)', () => {
  beforeEach(async () => {
    const items = [
      { type: 'INCOME', categoryId: incomeCategoryId, amount: 500, date: '2026-02-01', desc: 'Paycheck one' },
      { type: 'EXPENSE', categoryId: expenseCategoryId, amount: 80, date: '2026-02-03', desc: 'Groceries run' },
      { type: 'EXPENSE', categoryId: expenseCategoryId, amount: 40, date: '2026-02-05', desc: 'Coffee shop' },
      { type: 'INCOME', categoryId: incomeCategoryId, amount: 700, date: '2026-02-10', desc: 'Paycheck two' },
    ];
    for (const item of items) {
      // eslint-disable-next-line no-await-in-loop
      await agent
        .post('/api/v1/transactions')
        .set('X-Requested-With', 'finance-app')
        .send({
          accountId,
          categoryId: item.categoryId,
          type: item.type,
          amount: item.amount,
          currency: 'INR',
          transactionDate: item.date,
          description: item.desc,
        });
    }
  });

  it('paginates results', async () => {
    const res = await agent.get('/api/v1/transactions?page=1&pageSize=2');
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.total).toBe(4);
    expect(res.body.pagination.totalPages).toBe(2);
  });

  it('filters by type', async () => {
    const res = await agent.get('/api/v1/transactions?type=INCOME');
    expect(res.body.data.every((t) => t.type === 'INCOME')).toBe(true);
    expect(res.body.pagination.total).toBe(2);
  });

  it('filters by date range', async () => {
    const res = await agent.get('/api/v1/transactions?startDate=2026-02-04&endDate=2026-02-10');
    expect(res.body.pagination.total).toBe(2);
  });

  it('searches by description text', async () => {
    const res = await agent.get('/api/v1/transactions?search=Paycheck');
    expect(res.body.pagination.total).toBe(2);
  });

  it('sorts by amount ascending', async () => {
    const res = await agent.get('/api/v1/transactions?sortBy=amount&sortOrder=asc&pageSize=10');
    const amounts = res.body.data.map((t) => Number(t.amount));
    expect(amounts).toEqual([...amounts].sort((a, b) => a - b));
  });
});

describe('PATCH/DELETE /api/v1/transactions/:id', () => {
  it('edits a transaction', async () => {
    const created = await agent
      .post('/api/v1/transactions')
      .set('X-Requested-With', 'finance-app')
      .send({
        accountId,
        categoryId: expenseCategoryId,
        type: 'EXPENSE',
        amount: 100,
        currency: 'INR',
        transactionDate: '2026-03-01',
        description: 'Original',
      });
    const res = await agent
      .patch(`/api/v1/transactions/${created.body.transaction.id}`)
      .set('X-Requested-With', 'finance-app')
      .send({ amount: 150, description: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.transaction.amount).toBe('150.00');
    expect(res.body.transaction.description).toBe('Updated');
  });

  it('deletes a transaction and it disappears from listings', async () => {
    const created = await agent
      .post('/api/v1/transactions')
      .set('X-Requested-With', 'finance-app')
      .send({
        accountId,
        categoryId: expenseCategoryId,
        type: 'EXPENSE',
        amount: 30,
        currency: 'INR',
        transactionDate: '2026-03-02',
        description: 'To delete',
      });
    const del = await agent
      .delete(`/api/v1/transactions/${created.body.transaction.id}`)
      .set('X-Requested-With', 'finance-app');
    expect(del.status).toBe(204);

    const getRes = await agent.get(`/api/v1/transactions/${created.body.transaction.id}`);
    expect(getRes.status).toBe(404);
  });

  it('refuses to edit a transfer leg directly', async () => {
    const acc2 = await agent
      .post('/api/v1/accounts')
      .set('X-Requested-With', 'finance-app')
      .send({ name: 'Second', type: 'BANK', currency: 'INR' });
    const created = await agent
      .post('/api/v1/transactions')
      .set('X-Requested-With', 'finance-app')
      .send({
        accountId,
        toAccountId: acc2.body.account.id,
        type: 'TRANSFER',
        amount: 50,
        currency: 'INR',
        transactionDate: '2026-03-03',
        description: 'Transfer',
      });
    const res = await agent
      .patch(`/api/v1/transactions/${created.body.transaction.id}`)
      .set('X-Requested-With', 'finance-app')
      .send({ amount: 999 });
    expect(res.status).toBe(400);
  });
});
