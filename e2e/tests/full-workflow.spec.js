import { test, expect } from '@playwright/test';

function uniqueEmail() {
  return `e2e_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`;
}

test.describe('Full personal finance workflow', () => {
  const email = uniqueEmail();
  const password = 'Password123';

  test('1. registers a new user', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel(/full name/i).fill('E2E Test User');
    await page.getByLabel(/^email$/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('2. logs in with the created credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('3-4. creates an account, an income transaction, and an expense transaction', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Create an account first (required for any transaction)
    await page.goto('/accounts');
    await page.getByLabel(/account name/i).fill('E2E Wallet');
    await page.getByRole('button', { name: /add account/i }).click();
    await expect(page.getByText('E2E Wallet')).toBeVisible();

    // Income transaction
    await page.goto('/transactions/new');
    await page.getByRole('button', { name: 'Income' }).click();
    await page.getByLabel(/amount/i).fill('1000');
    await page.getByLabel(/^account$/i).selectOption({ label: /E2E Wallet/ });
    await page.getByLabel(/description/i).fill('E2E salary');
    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(page).toHaveURL(/\/transactions$/);
    await expect(page.getByText('E2E salary')).toBeVisible();

    // Expense transaction
    await page.goto('/transactions/new');
    await page.getByLabel(/amount/i).fill('300');
    await page.getByLabel(/^account$/i).selectOption({ label: /E2E Wallet/ });
    await page.getByLabel(/description/i).fill('E2E groceries');
    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(page.getByText('E2E groceries')).toBeVisible();
  });

  test('5. dashboard statistics reflect the recorded transactions', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /log in/i }).click();

    await page.goto('/dashboard');
    await expect(page.getByText(/total income/i)).toBeVisible();
    await expect(page.getByText(/700/)).toBeVisible(); // net savings 1000 - 300
  });

  test('6-7. creates a monthly budget and verifies utilization', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /log in/i }).click();

    await page.goto('/budgets');
    const now = new Date();
    await page.getByLabel(/^total budget$/i).fill('1000');
    await page.getByRole('button', { name: /create budget/i }).click();

    await expect(page.getByText(new RegExp(`${now.getFullYear()}`))).toBeVisible();
    // 300 spent of 1000 budget = 30% utilization
    await expect(page.getByText(/30\.0%/)).toBeVisible();
  });

  test('8-9. edits and deletes a transaction, and 10. dashboard updates accordingly', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /log in/i }).click();

    await page.goto('/transactions');
    await page.getByText('E2E groceries').locator('..').getByRole('link', { name: /edit/i }).click();
    await page.getByLabel(/amount/i).fill('200');
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page).toHaveURL(/\/transactions$/);

    await page.goto('/dashboard');
    await expect(page.getByText(/800/)).toBeVisible(); // net savings now 1000 - 200

    // Delete the edited expense transaction
    await page.goto('/transactions');
    await page.getByText('E2E groceries').locator('..').getByRole('button', { name: /delete/i }).click();
    await page.getByRole('button', { name: /^delete$/i }).click();
    await expect(page.getByText('E2E groceries')).not.toBeVisible();

    await page.goto('/dashboard');
    await expect(page.getByText(/1,000|1000/)).toBeVisible(); // net savings back to full income
  });

  test('11. logs out and cannot access protected routes', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole('button', { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Cross-user data isolation (UI level)', () => {
  test('12. a second user never sees the first user\'s transactions', async ({ page }) => {
    const emailA = uniqueEmail();
    const emailB = uniqueEmail();
    const password = 'Password123';

    // User A creates a transaction
    await page.goto('/register');
    await page.getByLabel(/full name/i).fill('User A');
    await page.getByLabel(/^email$/i).fill(emailA);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/accounts');
    await page.getByLabel(/account name/i).fill('User A Wallet');
    await page.getByRole('button', { name: /add account/i }).click();

    await page.goto('/transactions/new');
    await page.getByLabel(/amount/i).fill('555');
    await page.getByLabel(/^account$/i).selectOption({ label: /User A Wallet/ });
    await page.getByLabel(/description/i).fill('User A secret expense');
    await page.getByRole('button', { name: /add transaction/i }).click();

    await page.getByRole('button', { name: /log out/i }).click();

    // User B registers fresh and should see none of User A's data
    await page.goto('/register');
    await page.getByLabel(/full name/i).fill('User B');
    await page.getByLabel(/^email$/i).fill(emailB);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/transactions');
    await expect(page.getByText('User A secret expense')).not.toBeVisible();
    await expect(page.getByText(/no transactions found/i)).toBeVisible();
  });
});
