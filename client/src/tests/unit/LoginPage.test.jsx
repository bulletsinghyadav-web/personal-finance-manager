import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../../pages/LoginPage';
import { AuthProvider } from '../../context/AuthContext';

vi.mock('../../services/authApi', () => ({
  authApi: {
    me: vi.fn().mockRejectedValue({ response: { status: 401 } }),
    login: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

import { authApi } from '../../services/authApi';

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  authApi.me.mockRejectedValue({ response: { status: 401 } });
});

describe('LoginPage', () => {
  it('renders email and password fields', async () => {
    renderLogin();
    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('submits credentials and calls the login API', async () => {
    authApi.login.mockResolvedValue({ user: { id: '1', email: 'a@b.com', name: 'A' } });
    renderLogin();

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'Password123' });
    });
  });

  it('shows an error message on invalid credentials', async () => {
    authApi.login.mockRejectedValue({ response: { data: { error: { message: 'Invalid email or password.' } } } });
    renderLogin();

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'WrongPassword');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
  });

  it('shows a loading state while submitting', async () => {
    let resolveLogin;
    authApi.login.mockReturnValue(new Promise((resolve) => { resolveLogin = resolve; }));
    renderLogin();

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled();
    resolveLogin({ user: { id: '1', email: 'a@b.com', name: 'A' } });
  });
});
