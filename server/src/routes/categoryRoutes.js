const express = require('express');
const { z } = require('zod');
const controller = require('../controllers/categoryController');
const { validate } = require('../middleware/validate');
const { csrfGuard } = require('../middleware/csrfGuard');
const { categorySchema } = require('../validators/schemas');

const router = express.Router();

router.get('/', controller.list);
router.post('/', csrfGuard, validate(categorySchema), controller.create);
router.patch(
  '/:id',
  csrfGuard,
  validate(
    z.object({
      name: z.string().min(1).max(80).optional(),
      icon: z.string().max(40).optional().nullable(),
      color: z.string().max(20).optional().nullable(),
    })
  ),
  controller.update
);
router.delete('/:id', csrfGuard, controller.remove);

module.exports = router;
