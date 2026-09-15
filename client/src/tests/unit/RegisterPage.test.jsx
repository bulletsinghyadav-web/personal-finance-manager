import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from '../../pages/RegisterPage';
import { AuthProvider } from '../../context/AuthContext';

vi.mock('../../services/authApi', () => ({
  authApi: {
    me: vi.fn().mockRejectedValue({ response: { status: 401 } }),
    register: vi.fn(),
  },
}));

import { authApi } from '../../services/authApi';

function renderRegister() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  authApi.me.mockRejectedValue({ response: { status: 401 } });
});

describe('RegisterPage', () => {
  it('renders all required fields', async () => {
    renderRegister();
    expect(await screen.findByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/default currency/i)).toBeInTheDocument();
  });

  it('submits the form and calls the register API with entered values', async () => {
    authApi.register.mockResolvedValue({ user: { id: '1', email: 'new@user.com', name: 'New User' } });
    renderRegister();
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/full name/i), 'New User');
    await user.type(screen.getByLabelText(/^email$/i), 'new@user.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New User', email: 'new@user.com', password: 'Password123' })
      );
    });
  });

  it('surfaces a server-side validation error to the user', async () => {
    authApi.register.mockRejectedValue({
      response: { data: { error: { message: 'An account with this email already exists.' } } },
    });
    renderRegister();
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/full name/i), 'Dup User');
    await user.type(screen.getByLabelText(/^email$/i), 'dup@user.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('already exists');
  });
});
