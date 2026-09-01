import { Locator, Page, expect, test } from '@playwright/test';

const ADMIN_EMAIL = 'usuario@usuario.com';
const ADMIN_PASSWORD = '123mudarA@';
const BOARD_PROJECT_NAME = 'Projeto Board E2E';

const DRAG_TASK_TITLE = 'Tarefa Arraste E2E';
const WIP_TARGET_TASK_TITLE = 'Tarefa Alvo WIP E2E';

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Senha').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/');
}

async function openBoardProject(page: Page): Promise<void> {
  await page.goto('/projetos');
  await page.locator('.card', { hasText: BOARD_PROJECT_NAME }).click();
  await expect(page.locator('#board-title')).toHaveText(BOARD_PROJECT_NAME);
}

function taskCardIn(page: Page, status: string, title: string): Locator {
  return page.locator(`section.task-column[data-status="${status}"] app-task-card`).filter({ hasText: title });
}

async function dragTaskToColumn(page: Page, title: string, fromStatus: string, toStatus: string): Promise<void> {
  const source = taskCardIn(page, fromStatus, title);
  const target = page.locator(`section.task-column[data-status="${toStatus}"] .column-body`);

  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error('Nao foi possivel localizar origem/destino do drag-and-drop.');
  }

  const startX = sourceBox.x + sourceBox.width / 2;
  const startY = sourceBox.y + sourceBox.height / 2;
  const endX = targetBox.x + targetBox.width / 2;
  const endY = targetBox.y + Math.min(40, targetBox.height / 2);

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 5, startY + 5, { steps: 5 });
  await page.mouse.move(endX, endY, { steps: 15 });
  await page.mouse.move(endX, endY, { steps: 2 });
  await page.mouse.up();
}

test.describe('Board: drag-and-drop entre colunas', () => {
  test('arrastar um card de "A fazer" para "Em andamento" muda a etapa da tarefa', async ({ page }) => {
    await login(page);
    await openBoardProject(page);

    await expect(taskCardIn(page, 'TODO', DRAG_TASK_TITLE)).toBeVisible();

    await dragTaskToColumn(page, DRAG_TASK_TITLE, 'TODO', 'IN_PROGRESS');

    await expect(taskCardIn(page, 'IN_PROGRESS', DRAG_TASK_TITLE)).toBeVisible({ timeout: 10_000 });
    await expect(taskCardIn(page, 'TODO', DRAG_TASK_TITLE)).toHaveCount(0);
  });
});

test.describe('Board: limite de WIP', () => {
  test('mover uma 6a tarefa do responsavel para "Em andamento" e bloqueado pelo limite de WIP', async ({ page }) => {
    await login(page);
    await openBoardProject(page);

    await expect(taskCardIn(page, 'TODO', WIP_TARGET_TASK_TITLE)).toBeVisible();

    await dragTaskToColumn(page, WIP_TARGET_TASK_TITLE, 'TODO', 'IN_PROGRESS');

    await expect(page.locator('.toast.error strong')).toHaveText('Falha ao mover tarefa');
    await expect(page.locator('.toast.error p')).toHaveText(
      'O responsável já atingiu o limite de tarefas em andamento neste projeto.'
    );

    // A tarefa deve permanecer em "A fazer": a mudanca otimista e desfeita quando a API rejeita o WIP.
    await expect(taskCardIn(page, 'TODO', WIP_TARGET_TASK_TITLE)).toBeVisible();
    await expect(taskCardIn(page, 'IN_PROGRESS', WIP_TARGET_TASK_TITLE)).toHaveCount(0);
  });
});
