import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TransactionsPage from '../../pages/TransactionsPage';
import { ToastProvider } from '../../context/ToastContext';

vi.mock('../../services/resourceApis', () => ({
  transactionsApi: {
    list: vi.fn(),
    remove: vi.fn(),
  },
  accountsApi: { list: vi.fn().mockResolvedValue([{ id: 'acc1', name: 'Wallet', currency: 'INR' }]) },
  categoriesApi: { list: vi.fn().mockResolvedValue([{ id: 'cat1', name: 'Food & Dining', type: 'EXPENSE' }]) },
}));

import { transactionsApi } from '../../services/resourceApis';

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <TransactionsPage />
      </ToastProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TransactionsPage', () => {
  it('shows an empty state when there are no transactions', async () => {
    transactionsApi.list.mockResolvedValue({ data: [], pagination: { page: 1, total: 0, totalPages: 1 } });
    renderPage();
    expect(await screen.findByText(/no transactions found/i)).toBeInTheDocument();
  });

  it('renders a list of transactions from the API', async () => {
    transactionsApi.list.mockResolvedValue({
      data: [
        {
          id: 't1',
          type: 'INCOME',
          amount: '500.00',
          currency: 'INR',
          transaction_date: '2026-01-05T00:00:00.000Z',
          description: 'Freelance job',
          category_name: 'Freelance',
          account_name: 'Wallet',
        },
      ],
      pagination: { page: 1, total: 1, totalPages: 1 },
    });
    renderPage();
    expect(await screen.findByText('Freelance job')).toBeInTheDocument();
    expect(screen.getByText(/\+.*500/)).toBeInTheDocument();
  });

  it('shows an error state gracefully when the API call fails', async () => {
    transactionsApi.list.mockRejectedValue(new Error('Network error'));
    renderPage();
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('re-fetches transactions when the search filter changes', async () => {
    transactionsApi.list.mockResolvedValue({ data: [], pagination: { page: 1, total: 0, totalPages: 1 } });
    renderPage();
    await screen.findByText(/no transactions found/i);

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/search description/i), 'coffee');

    await waitFor(() => {
      const lastCall = transactionsApi.list.mock.calls.at(-1)[0];
      expect(lastCall.search).toBe('coffee');
    });
  });
});
