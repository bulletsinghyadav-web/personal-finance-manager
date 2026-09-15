const express = require('express');
const controller = require('../controllers/dashboardController');

const router = express.Router();

router.get('/summary', controller.summary);
router.get('/income-vs-expenses', controller.incomeVsExpenses);
router.get('/category-distribution', controller.categoryDistribution);

module.exports = router;
