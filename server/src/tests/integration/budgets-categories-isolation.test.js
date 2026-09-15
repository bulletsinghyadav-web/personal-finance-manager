const request = require('supertest');
const { app, truncateAll, pool } = require('./setup');

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await truncateAll();
});

describe('Budgets', () => {
  let agent;
  let accountId;
  let expenseCategoryId;

  beforeEach(async () => {
    agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send({
      email: 'budgetuser@example.com',
      password: 'Password123',
      name: 'Budget User',
    });
    const accRes = await agent
      .post('/api/v1/accounts')
      .set('X-Requested-With', 'finance-app')
      .send({ name: 'Wallet', type: 'CASH', currency: 'INR' });
    accountId = accRes.body.account.id;
    const cats = await agent.get('/api/v1/categories');
    expenseCategoryId = cats.body.categories.find((c) => c.type === 'EXPENSE').id;
  });

  it('creates a budget with a category limit', async () => {
    const res = await agent
      .post('/api/v1/budgets')
      .set('X-Requested-With', 'finance-app')
      .send({
        month: 4,
        year: 2026,
        currency: 'INR',
        totalBudget: 1000,
        categories: [{ categoryId: expenseCategoryId, limitAmount: 300 }],
      });
    expect(res.status).toBe(201);
    expect(res.body.budget.categories.length).toBe(1);
    expect(res.body.budget.utilizationPercent).toBe(0); // no spend yet against a positive budget -> 0%
  });

  it('rejects a duplicate budget for the same month/year/currency', async () => {
    const payload = { month: 5, year: 2026, currency: 'INR', totalBudget: 500, categories: [] };
    await agent.post('/api/v1/budgets').set('X-Requested-With', 'finance-app').send(payload);
    const res = await agent.post('/api/v1/budgets').set('X-Requested-With', 'finance-app').send(payload);
    expect(res.status).toBe(409);
  });

  it('computes utilization percentage correctly as spending occurs', async () => {
    await agent.post('/api/v1/budgets').set('X-Requested-With', 'finance-app').send({
      month: 6,
      year: 2026,
      currency: 'INR',
      totalBudget: 1000,
      categories: [],
    });
    await agent
      .post('/api/v1/transactions')
      .set('X-Requested-With', 'finance-app')
      .send({
        accountId,
        categoryId: expenseCategoryId,
        type: 'EXPENSE',
        amount: 250,
        currency: 'INR',
        transactionDate: '2026-06-15',
        description: 'Utility bill',
      });
    const res = await agent.get('/api/v1/budgets?year=2026');
    const june = res.body.budgets.find((b) => b.month === 6);
    expect(june.utilizationPercent).toBe(25);
    expect(june.remaining).toBe(750);
    expect(june.isOverBudget).toBe(false);
  });

  it('flags over-budget when spending exceeds the limit', async () => {
    await agent.post('/api/v1/budgets').set('X-Requested-With', 'finance-app').send({
      month: 7,
      year: 2026,
      currency: 'INR',
      totalBudget: 100,
      categories: [],
    });
    await agent
      .post('/api/v1/transactions')
      .set('X-Requested-With', 'finance-app')
      .send({
        accountId,
        categoryId: expenseCategoryId,
        type: 'EXPENSE',
        amount: 150,
        currency: 'INR',
        transactionDate: '2026-07-01',
        description: 'Overspend',
      });
    const res = await agent.get('/api/v1/budgets?year=2026');
    const july = res.body.budgets.find((b) => b.month === 7);
    expect(july.utilizationPercent).toBe(150);
    expect(july.isOverBudget).toBe(true);
  });

  it('reduces utilization immediately when the underlying transaction is deleted', async () => {
    await agent.post('/api/v1/budgets').set('X-Requested-With', 'finance-app').send({
      month: 8,
      year: 2026,
      currency: 'INR',
      totalBudget: 200,
      categories: [],
    });
    const tx = await agent
      .post('/api/v1/transactions')
      .set('X-Requested-With', 'finance-app')
      .send({
        accountId,
        categoryId: expenseCategoryId,
        type: 'EXPENSE',
        amount: 100,
        currency: 'INR',
        transactionDate: '2026-08-05',
        description: 'Will delete',
      });
    let res = await agent.get('/api/v1/budgets?year=2026');
    expect(res.body.budgets.find((b) => b.month === 8).utilizationPercent).toBe(50);

    await agent.delete(`/api/v1/transactions/${tx.body.transaction.id}`).set('X-Requested-With', 'finance-app');

    res = await agent.get('/api/v1/budgets?year=2026');
    expect(res.body.budgets.find((b) => b.month === 8).utilizationPercent).toBe(0);
  });

  it('rejects negative budget amounts', async () => {
    const res = await agent
      .post('/api/v1/budgets')
      .set('X-Requested-With', 'finance-app')
      .send({ month: 9, year: 2026, currency: 'INR', totalBudget: -50, categories: [] });
    expect(res.status).toBe(422);
  });
});

describe('Categories', () => {
  let agent;

  beforeEach(async () => {
    agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send({
      email: 'catuser@example.com',
      password: 'Password123',
      name: 'Cat User',
    });
  });

  it('creates a custom category', async () => {
    const res = await agent
      .post('/api/v1/categories')
      .set('X-Requested-With', 'finance-app')
      .send({ name: 'Pet Care', type: 'EXPENSE' });
    expect(res.status).toBe(201);
    expect(res.body.category.name).toBe('Pet Care');
  });

  it('rejects a duplicate category name for the same type', async () => {
    await agent
      .post('/api/v1/categories')
      .set('X-Requested-With', 'finance-app')
      .send({ name: 'Side Hustle', type: 'INCOME' });
    const res = await agent
      .post('/api/v1/categories')
      .set('X-Requested-With', 'finance-app')
      .send({ name: 'Side Hustle', type: 'INCOME' });
    expect(res.status).toBe(409);
  });

  it('prevents deleting default categories', async () => {
    const cats = await agent.get('/api/v1/categories');
    const defaultCat = cats.body.categories.find((c) => c.is_default);
    const res = await agent
      .delete(`/api/v1/categories/${defaultCat.id}`)
      .set('X-Requested-With', 'finance-app');
    expect(res.status).toBe(400);
  });

  it('soft-deletes a custom category without destroying historical transaction data', async () => {
    const created = await agent
      .post('/api/v1/categories')
      .set('X-Requested-With', 'finance-app')
      .send({ name: 'Custom Cat', type: 'EXPENSE' });

    const accRes = await agent
      .post('/api/v1/accounts')
      .set('X-Requested-With', 'finance-app')
      .send({ name: 'Wallet', type: 'CASH', currency: 'INR' });

    const tx = await agent
      .post('/api/v1/transactions')
      .set('X-Requested-With', 'finance-app')
      .send({
        accountId: accRes.body.account.id,
        categoryId: created.body.category.id,
        type: 'EXPENSE',
        amount: 20,
        currency: 'INR',
        transactionDate: '2026-01-01',
        description: 'Uses custom category',
      });

    const del = await agent
      .delete(`/api/v1/categories/${created.body.category.id}`)
      .set('X-Requested-With', 'finance-app');
    expect(del.status).toBe(204);

    // The category no longer appears in active listings...
    const cats = await agent.get('/api/v1/categories');
    expect(cats.body.categories.find((c) => c.id === created.body.category.id)).toBeUndefined();

    // ...but the historical transaction still references it and is intact.
    const getTx = await agent.get(`/api/v1/transactions/${tx.body.transaction.id}`);
    expect(getTx.status).toBe(200);
    expect(getTx.body.transaction.category_id).toBe(created.body.category.id);
  });
});

describe('Cross-user isolation', () => {
  it('prevents one user from reading, editing, or deleting another user\'s data', async () => {
    const alice = request.agent(app);
    const bob = request.agent(app);

    await alice.post('/api/v1/auth/register').send({ email: 'alice2@example.com', password: 'Password123', name: 'Alice' });
    await bob.post('/api/v1/auth/register').send({ email: 'bob2@example.com', password: 'Password123', name: 'Bob' });

    const aliceAccount = await alice
      .post('/api/v1/accounts')
      .set('X-Requested-With', 'finance-app')
      .send({ name: 'Alice Wallet', type: 'CASH', currency: 'INR' });

    const aliceCats = await alice.get('/api/v1/categories');
    const aliceTx = await alice
      .post('/api/v1/transactions')
      .set('X-Requested-With', 'finance-app')
      .send({
        accountId: aliceAccount.body.account.id,
        categoryId: aliceCats.body.categories.find((c) => c.type === 'EXPENSE').id,
        type: 'EXPENSE',
        amount: 42,
        currency: 'INR',
        transactionDate: '2026-01-01',
        description: 'Alice private expense',
      });

    // Bob cannot read Alice's account
    const readAccount = await bob.get(`/api/v1/accounts/${aliceAccount.body.account.id}`);
    expect(readAccount.status).toBe(404);

    // Bob cannot read Alice's transaction
    const readTx = await bob.get(`/api/v1/transactions/${aliceTx.body.transaction.id}`);
    expect(readTx.status).toBe(404);

    // Bob cannot edit Alice's transaction
    const editTx = await bob
      .patch(`/api/v1/transactions/${aliceTx.body.transaction.id}`)
      .set('X-Requested-With', 'finance-app')
      .send({ amount: 999999 });
    expect(editTx.status).toBe(404);

    // Bob cannot delete Alice's transaction
    const delTx = await bob
      .delete(`/api/v1/transactions/${aliceTx.body.transaction.id}`)
      .set('X-Requested-With', 'finance-app');
    expect(delTx.status).toBe(404);

    // Bob's own transaction list is empty (not seeing Alice's data)
    const bobList = await bob.get('/api/v1/transactions');
    expect(bobList.body.pagination.total).toBe(0);

    // Alice's data is untouched
    const stillThere = await alice.get(`/api/v1/transactions/${aliceTx.body.transaction.id}`);
    expect(stillThere.status).toBe(200);
    expect(stillThere.body.transaction.amount).toBe('42.00');
  });
});

describe('Dashboard summary', () => {
  it('returns zeroed, non-crashing stats for a brand-new user with no data', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send({ email: 'empty@example.com', password: 'Password123', name: 'Empty User' });
    const res = await agent.get('/api/v1/dashboard/summary');
    expect(res.status).toBe(200);
    expect(res.body.totals.totalIncome).toBe(0);
    expect(res.body.totals.savingsRate).toBeNull();
    expect(res.body.recentTransactions).toEqual([]);
  });
});
