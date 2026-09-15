const userRepo = require('../db/userRepo');
const exchangeRateRepo = require('../db/exchangeRateRepo');
const { SUPPORTED_CURRENCIES, CURRENCY_META } = require('../utils/money');
const { ApiError } = require('../middleware/errorHandler');

async function listSupported(req, res) {
  res.json({
    currencies: SUPPORTED_CURRENCIES.map((code) => ({ code, ...CURRENCY_META[code] })),
  });
}

async function setDefaultCurrency(req, res, next) {
  try {
    const { currency } = req.body;
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      throw new ApiError(422, 'Unsupported currency code.');
    }
    const user = await userRepo.updateProfile(req.userId, { defaultCurrency: currency });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function getRate(req, res, next) {
  try {
    const { base, quote } = req.query;
    if (!SUPPORTED_CURRENCIES.includes(base) || !SUPPORTED_CURRENCIES.includes(quote)) {
      throw new ApiError(422, 'Unsupported currency code.');
    }
    const asOf = req.query.asOf || new Date().toISOString().slice(0, 10);
    const resolved = await exchangeRateRepo.resolveRate(base, quote, asOf);
    if (!resolved) {
      return res.status(200).json({
        available: false,
        message: `No exchange rate is currently available for ${base} -> ${quote}.`,
      });
    }
    res.json({ available: true, base, quote, ...resolved });
  } catch (err) {
    next(err);
  }
}

module.exports = { listSupported, setDefaultCurrency, getRate };
