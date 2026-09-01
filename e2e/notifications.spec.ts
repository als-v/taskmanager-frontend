import { test, expect } from '@playwright/test';

const ASSIGNEE_EMAIL = 'usuario2@usuario2.com';
const ASSIGNEE_PASSWORD = '123mudarA@';

test.describe('Testes notificacoes', () => {
  test('usuario loga e ve as notificacoes de projeto/tarefa no sino', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(ASSIGNEE_EMAIL);
    await page.getByLabel('Senha').fill(ASSIGNEE_PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL('/');

    const bellButton = page.getByRole('button', { name: 'Abrir notificacoes' });
    await expect(page.locator('.bell-badge')).toHaveText('2', { timeout: 10_000 });

    await bellButton.click();

    const messages = page.locator('.notification-message');
    await expect(messages).toHaveCount(2);
    await expect(messages.filter({ hasText: 'Tarefa E2E' })).toBeVisible();
    await expect(messages.filter({ hasText: 'Projeto E2E' })).toBeVisible();
  });
});
