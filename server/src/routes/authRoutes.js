const express = require('express');
const authController = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/requireAuth');
const { csrfGuard } = require('../middleware/csrfGuard');
const { authLimiter, loginLimiter } = require('../middleware/rateLimiters');
const {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  deleteAccountSchema,
} = require('../validators/schemas');

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/logout', csrfGuard, authController.logout);
router.post('/refresh', authController.refresh);
router.get('/me', requireAuth, authController.me);
router.patch('/me', requireAuth, csrfGuard, validate(updateProfileSchema), authController.updateProfile);
router.post(
  '/change-password',
  requireAuth,
  csrfGuard,
  validate(changePasswordSchema),
  authController.changePassword
);
router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post(
  '/delete-account',
  requireAuth,
  csrfGuard,
  validate(deleteAccountSchema),
  authController.deleteAccount
);

module.exports = router;
