const express = require('express');
const controller = require('../controllers/reportController');

const router = express.Router();

router.get('/monthly', controller.monthlyReport);

module.exports = router;
