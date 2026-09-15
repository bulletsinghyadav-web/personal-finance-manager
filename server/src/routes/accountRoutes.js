const express = require('express');
const controller = require('../controllers/accountController');
const { validate } = require('../middleware/validate');
const { csrfGuard } = require('../middleware/csrfGuard');
const { accountSchema } = require('../validators/schemas');
const { z } = require('zod');

const router = express.Router();

router.get('/', controller.list);
router.post('/', csrfGuard, validate(accountSchema), controller.create);
router.get('/:id', controller.getOne);
router.patch(
  '/:id',
  csrfGuard,
  validate(
    z.object({
      name: z.string().min(1).max(120).optional(),
      type: z.enum(['CASH', 'BANK', 'SAVINGS', 'CREDIT_CARD', 'OTHER']).optional(),
      isArchived: z.boolean().optional(),
    })
  ),
  controller.update
);
router.delete('/:id', csrfGuard, controller.remove);

module.exports = router;
