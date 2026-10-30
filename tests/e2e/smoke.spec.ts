import { expect, test } from '@playwright/test';

test('landing page loads', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Run the floor from one calm workspace.' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start a company' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create a company' })).toBeVisible();
});

test('signup page renders', async ({ page }) => {
  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: 'Create the company' })).toBeVisible();
  await expect(page.getByLabel('Company name')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
});

test('customer login page renders', async ({ page }) => {
  await page.goto('/customer-login');
  await expect(
    page.getByText('Customer entrance for one company. Operators use a different gate.'),
  ).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create one' })).toBeVisible();
});

test('unauthenticated /customer redirects to customer login', async ({ page }) => {
  await page.goto('/customer');
  await expect(page).toHaveURL(/\/customer-login$/);
  await expect(
    page.getByText('Customer entrance for one company. Operators use a different gate.'),
  ).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
});
