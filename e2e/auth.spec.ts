import { test, expect } from '@playwright/test';

const SEEDED_EMAIL = 'usuario@usuario.com';

test.describe('Fluxo: registro e login com sucesso', () => {
  test('usuario se registra e consegue logar com as credenciais criadas', async ({ page }) => {
    const email = `usuario-${Date.now()}@usuario.com`;
    const password = '123mudarA@';

    await page.goto('/registro');
    await page.getByLabel('Nome').fill('Usuario Novo');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByLabel('Confirmar senha').fill(password);
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(page).toHaveURL('/login');
    await expect(page.locator('.toast.success strong')).toHaveText('Conta criada');

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL('/');
  });
});

test.describe('Fluxo: login com senha invalida', () => {
  test('login com senha incorreta falha e mantem o usuario na tela de login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(SEEDED_EMAIL);
    await page.getByLabel('Senha').fill('SenhaErrada@999');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL('/login');
    await expect(page.locator('.toast.error strong')).toHaveText('Falha no login');
    await expect(page.locator('.toast.error p')).toHaveText('Email ou senha incorretos.');
  });
});
