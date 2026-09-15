const accountRepo = require('../db/accountRepo');
const { ApiError } = require('../middleware/errorHandler');

async function list(req, res, next) {
  try {
    const accounts = await accountRepo.listByUser(req.userId);
    res.json({ accounts });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const account = await accountRepo.create(req.userId, req.body);
    res.status(201).json({ account });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const account = await accountRepo.findById(req.userId, req.params.id);
    if (!account) throw new ApiError(404, 'Account not found.');
    res.json({ account });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const account = await accountRepo.update(req.userId, req.params.id, req.body);
    if (!account) throw new ApiError(404, 'Account not found.');
    res.json({ account });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const inUse = await accountRepo.hasTransactions(req.params.id);
    if (inUse) {
      throw new ApiError(
        409,
        'This account has transactions and cannot be deleted. Archive it instead to hide it from active use.'
      );
    }
    const deleted = await accountRepo.remove(req.userId, req.params.id);
    if (!deleted) throw new ApiError(404, 'Account not found.');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, getOne, update, remove };
