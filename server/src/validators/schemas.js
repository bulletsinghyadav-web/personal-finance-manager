const { z } = require('zod');
const { SUPPORTED_CURRENCIES } = require('../utils/money');

const currencyEnum = z.enum(SUPPORTED_CURRENCIES);
const transactionTypeEnum = z.enum(['INCOME', 'EXPENSE', 'TRANSFER']);
const accountTypeEnum = z.enum(['CASH', 'BANK', 'SAVINGS', 'CREDIT_CARD', 'OTHER']);

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), {
    message: 'Password must contain at least one letter and one number',
  });

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: passwordSchema,
  name: z.string().min(1).max(120),
  defaultCurrency: currencyEnum.optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: passwordSchema,
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  defaultCurrency: currencyEnum.optional(),
});

const deleteAccountSchema = z.object({
  password: z.string().min(1),
  confirm: z.literal(true),
});

const accountSchema = z.object({
  name: z.string().min(1).max(120),
  type: accountTypeEnum,
  currency: currencyEnum,
  openingBalance: z.number().finite().default(0),
});

const categorySchema = z.object({
  name: z.string().min(1).max(80),
  type: z.enum(['INCOME', 'EXPENSE']),
  icon: z.string().max(40).optional().nullable(),
  color: z.string().max(20).optional().nullable(),
});

const transactionSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional().nullable(),
  type: transactionTypeEnum,
  amount: z.number().positive('Amount must be positive'),
  currency: currencyEnum,
  transactionDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date'),
  description: z.string().min(1).max(255),
  notes: z.string().max(1000).optional().nullable(),
  // Only used for TRANSFER type
  toAccountId: z.string().uuid().optional(),
});

const transactionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  type: transactionTypeEnum.optional(),
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  search: z.string().max(255).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['transactionDate', 'amount']).default('transactionDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const transactionUpdateSchema = z.object({
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  amount: z.number().positive().optional(),
  currency: currencyEnum.optional(),
  transactionDate: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date')
    .optional(),
  description: z.string().min(1).max(255).optional(),
  notes: z.string().max(1000).optional().nullable(),
});

const budgetCategorySchema = z.object({
  categoryId: z.string().uuid(),
  limitAmount: z.number().nonnegative(),
});

const budgetSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  currency: currencyEnum,
  totalBudget: z.number().nonnegative(),
  categories: z.array(budgetCategorySchema).optional().default([]),
});

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  deleteAccountSchema,
  accountSchema,
  categorySchema,
  transactionSchema,
  transactionUpdateSchema,
  transactionQuerySchema,
  budgetSchema,
};
