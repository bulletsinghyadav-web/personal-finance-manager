const budgetRepo = require('../db/budgetRepo');
const { ApiError } = require('../middleware/errorHandler');
const { calculateBudgetUtilization, Decimal } = require('../utils/money');

async function attachUtilization(userId, budget) {
  const spent = await budgetRepo.totalSpend(userId, budget.month, budget.year, budget.currency);
  const utilization = calculateBudgetUtilization(spent, budget.total_budget);
  const remaining = new Decimal(budget.total_budget).minus(new Decimal(spent)).toNumber();

  let categories = budget.categories;
  if (categories) {
    categories = await Promise.all(
      categories.map(async (c) => {
        const catSpent = await budgetRepo.categorySpend(userId, c.category_id, budget.month, budget.year, budget.currency);
        return {
          ...c,
          spent: catSpent,
          utilizationPercent: calculateBudgetUtilization(catSpent, c.limit_amount),
          remaining: new Decimal(c.limit_amount).minus(new Decimal(catSpent)).toNumber(),
        };
      })
    );
  }

  return {
    ...budget,
    spent,
    remaining,
    utilizationPercent: utilization,
    isOverBudget: utilization !== null && utilization > 100,
    isNearLimit: utilization !== null && utilization >= 80 && utilization <= 100,
    categories,
  };
}

async function list(req, res, next) {
  try {
    const budgets = await budgetRepo.listByUser(req.userId, { year: req.query.year ? Number(req.query.year) : undefined });
    const enriched = await Promise.all(budgets.map((b) => attachUtilization(req.userId, b)));
    res.json({ budgets: enriched });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const budget = await budgetRepo.findById(req.userId, req.params.id);
    if (!budget) throw new ApiError(404, 'Budget not found.');
    res.json({ budget: await attachUtilization(req.userId, budget) });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const existing = await budgetRepo.findByPeriod(req.userId, req.body.month, req.body.year, req.body.currency);
    if (existing) {
      throw new ApiError(409, 'A budget for this month, year, and currency already exists. Edit it instead.');
    }
    const budget = await budgetRepo.create(req.userId, req.body);
    const full = await budgetRepo.findById(req.userId, budget.id);
    res.status(201).json({ budget: await attachUtilization(req.userId, full) });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const updated = await budgetRepo.update(req.userId, req.params.id, req.body);
    if (!updated) throw new ApiError(404, 'Budget not found.');
    const full = await budgetRepo.findById(req.userId, req.params.id);
    res.json({ budget: await attachUtilization(req.userId, full) });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const deleted = await budgetRepo.remove(req.userId, req.params.id);
    if (!deleted) throw new ApiError(404, 'Budget not found.');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove };
