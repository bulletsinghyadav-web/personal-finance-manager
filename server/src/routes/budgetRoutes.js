const express = require('express');
const { z } = require('zod');
const controller = require('../controllers/budgetController');
const { validate } = require('../middleware/validate');
const { csrfGuard } = require('../middleware/csrfGuard');
const { budgetSchema, budgetCategorySchema: _bc } = require('../validators/schemas');

const router = express.Router();

const budgetUpdateSchema = z.object({
  totalBudget: z.number().nonnegative().optional(),
  categories: z
    .array(z.object({ categoryId: z.string().uuid(), limitAmount: z.number().nonnegative() }))
    .optional(),
});

router.get('/', controller.list);
router.post('/', csrfGuard, validate(budgetSchema), controller.create);
router.get('/:id', controller.getOne);
router.patch('/:id', csrfGuard, validate(budgetUpdateSchema), controller.update);
router.delete('/:id', csrfGuard, controller.remove);

module.exports = router;
