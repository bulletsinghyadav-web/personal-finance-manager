const express = require('express');
const { z } = require('zod');
const controller = require('../controllers/currencyController');
const { validate } = require('../middleware/validate');
const { csrfGuard } = require('../middleware/csrfGuard');

const router = express.Router();

router.get('/', controller.listSupported);
router.get('/rate', controller.getRate);
router.post(
  '/default',
  csrfGuard,
  validate(z.object({ currency: z.string() })),
  controller.setDefaultCurrency
);

module.exports = router;
