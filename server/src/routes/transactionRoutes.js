const express = require('express');
const controller = require('../controllers/transactionController');
const { validate } = require('../middleware/validate');
const { csrfGuard } = require('../middleware/csrfGuard');
const {
  transactionSchema,
  transactionUpdateSchema,
  transactionQuerySchema,
} = require('../validators/schemas');

const router = express.Router();

router.get('/', validate(transactionQuerySchema, 'query'), controller.list);
router.post('/', csrfGuard, validate(transactionSchema), controller.create);
router.get('/:id', controller.getOne);
router.patch('/:id', csrfGuard, validate(transactionUpdateSchema), controller.update);
router.delete('/:id', csrfGuard, controller.remove);

module.exports = router;
