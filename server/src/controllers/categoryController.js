const categoryRepo = require('../db/categoryRepo');
const { ApiError } = require('../middleware/errorHandler');

async function list(req, res, next) {
  try {
    const categories = await categoryRepo.listByUser(req.userId, { type: req.query.type });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const category = await categoryRepo.create(req.userId, req.body);
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const category = await categoryRepo.update(req.userId, req.params.id, req.body);
    if (!category) throw new ApiError(404, 'Category not found.');
    res.json({ category });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const category = await categoryRepo.findById(req.userId, req.params.id);
    if (!category) throw new ApiError(404, 'Category not found.');
    if (category.is_default) {
      throw new ApiError(400, 'Default categories cannot be deleted, only custom categories.');
    }
    // Soft delete: historical transactions keep their reference to this
    // category so past reports/statistics remain accurate; the category is
    // simply hidden from selection in new transactions/budgets.
    await categoryRepo.softDelete(req.userId, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
