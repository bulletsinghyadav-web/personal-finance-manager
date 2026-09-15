const transactionRepo = require('../db/transactionRepo');
const accountRepo = require('../db/accountRepo');
const categoryRepo = require('../db/categoryRepo');
const { ApiError } = require('../middleware/errorHandler');

async function assertOwnedAccount(userId, accountId) {
  const account = await accountRepo.findById(userId, accountId);
  if (!account) throw new ApiError(404, 'Account not found.');
  return account;
}

async function assertOwnedCategory(userId, categoryId) {
  if (!categoryId) return null;
  const category = await categoryRepo.findById(userId, categoryId);
  if (!category) throw new ApiError(404, 'Category not found.');
  return category;
}

async function list(req, res, next) {
  try {
    const result = await transactionRepo.list(req.userId, req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const transaction = await transactionRepo.findById(req.userId, req.params.id);
    if (!transaction) throw new ApiError(404, 'Transaction not found.');
    res.json({ transaction });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = req.body;
    await assertOwnedAccount(req.userId, data.accountId);

    if (data.type === 'TRANSFER') {
      if (!data.toAccountId) throw new ApiError(422, 'toAccountId is required for transfers.');
      if (data.toAccountId === data.accountId) {
        throw new ApiError(422, 'Cannot transfer to the same account.');
      }
      await assertOwnedAccount(req.userId, data.toAccountId);
      const result = await transactionRepo.createTransfer(req.userId, data);
      return res.status(201).json({ transaction: result.debit, linkedTransaction: result.credit });
    }

    if (data.type === 'INCOME' || data.type === 'EXPENSE') {
      await assertOwnedCategory(req.userId, data.categoryId);
    }

    const transaction = await transactionRepo.create(req.userId, data);
    res.status(201).json({ transaction });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const existing = await transactionRepo.findById(req.userId, req.params.id);
    if (!existing) throw new ApiError(404, 'Transaction not found.');
    if (existing.type === 'TRANSFER') {
      throw new ApiError(400, 'Transfers cannot be edited. Delete and recreate instead.');
    }

    if (req.body.accountId) await assertOwnedAccount(req.userId, req.body.accountId);
    if (req.body.categoryId) await assertOwnedCategory(req.userId, req.body.categoryId);

    const transaction = await transactionRepo.update(req.userId, req.params.id, req.body);
    res.json({ transaction });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const deleted = await transactionRepo.remove(req.userId, req.params.id);
    if (!deleted) throw new ApiError(404, 'Transaction not found.');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove };
