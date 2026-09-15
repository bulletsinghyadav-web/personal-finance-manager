import { api } from './apiClient';

export const accountsApi = {
  list: () => api.get('/accounts').then((r) => r.data.accounts),
  get: (id) => api.get(`/accounts/${id}`).then((r) => r.data.account),
  create: (data) => api.post('/accounts', data).then((r) => r.data.account),
  update: (id, data) => api.patch(`/accounts/${id}`, data).then((r) => r.data.account),
  remove: (id) => api.delete(`/accounts/${id}`),
};

export const categoriesApi = {
  list: (type) => api.get('/categories', { params: type ? { type } : {} }).then((r) => r.data.categories),
  create: (data) => api.post('/categories', data).then((r) => r.data.category),
  update: (id, data) => api.patch(`/categories/${id}`, data).then((r) => r.data.category),
  remove: (id) => api.delete(`/categories/${id}`),
};

export const transactionsApi = {
  list: (params) => api.get('/transactions', { params }).then((r) => r.data),
  get: (id) => api.get(`/transactions/${id}`).then((r) => r.data.transaction),
  create: (data) => api.post('/transactions', data).then((r) => r.data),
  update: (id, data) => api.patch(`/transactions/${id}`, data).then((r) => r.data.transaction),
  remove: (id) => api.delete(`/transactions/${id}`),
};

export const budgetsApi = {
  list: (year) => api.get('/budgets', { params: year ? { year } : {} }).then((r) => r.data.budgets),
  get: (id) => api.get(`/budgets/${id}`).then((r) => r.data.budget),
  create: (data) => api.post('/budgets', data).then((r) => r.data.budget),
  update: (id, data) => api.patch(`/budgets/${id}`, data).then((r) => r.data.budget),
  remove: (id) => api.delete(`/budgets/${id}`),
};

export const dashboardApi = {
  summary: (currency) => api.get('/dashboard/summary', { params: currency ? { currency } : {} }).then((r) => r.data),
  incomeVsExpenses: (months) => api.get('/dashboard/income-vs-expenses', { params: { months } }).then((r) => r.data.series),
  categoryDistribution: (params) => api.get('/dashboard/category-distribution', { params }).then((r) => r.data.breakdown),
};

export const reportsApi = {
  monthly: (params) => api.get('/reports/monthly', { params }).then((r) => r.data),
};

export const currencyApi = {
  list: () => api.get('/currencies').then((r) => r.data.currencies),
  setDefault: (currency) => api.post('/currencies/default', { currency }).then((r) => r.data),
  rate: (base, quote) => api.get('/currencies/rate', { params: { base, quote } }).then((r) => r.data),
};
