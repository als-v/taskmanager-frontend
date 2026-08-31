import { HttpErrorResponse } from '@angular/common/http';

import { API_ERROR_MESSAGES_PT_BR } from './error-messages.pt-br';

const EMAIL_IN_USE_CODE = 'error.auth.email-in-use';

export function getHttpErrorMessage(error: unknown, fallback = 'Nao foi possivel concluir a operacao.'): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  const code = readApiCode(error);
  const translated = code ? translateErrorCode(code) : undefined;

  if (translated) {
    return translated;
  }

  const apiMessage = readApiMessage(error);

  if (error.status === 0) {
    return 'Nao foi possivel conectar ao servidor.';
  }

  if (error.status === 400) {
    return apiMessage || 'Os dados enviados nao foram aceitos.';
  }

  if (error.status === 401 || error.status === 403) {
    return 'Voce nao tem permissao para executar esta operacao.';
  }

  if (error.status === 404) {
    return 'O recurso solicitado nao foi encontrado.';
  }

  if (error.status >= 500) {
    return 'O servidor encontrou um erro. Tente novamente em instantes.';
  }

  return apiMessage || fallback;
}

export function isExistingUserError(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 409 && readApiCode(error) === EMAIL_IN_USE_CODE;
}

function translateErrorCode(code: string): string | undefined {
  if (API_ERROR_MESSAGES_PT_BR[code]) {
    return API_ERROR_MESSAGES_PT_BR[code];
  }

  if (code.startsWith('error.validation.')) {
    return API_ERROR_MESSAGES_PT_BR['error.validation.failed'];
  }

  return undefined;
}

function readApiCode(error: HttpErrorResponse): string | undefined {
  if (error.error && typeof error.error === 'object') {
    const code = (error.error as Record<string, unknown>)['code'];
    return typeof code === 'string' ? code : undefined;
  }

  return undefined;
}

function readApiMessage(error: HttpErrorResponse): string {
  if (typeof error.error === 'string') {
    return error.error;
  }

  if (error.error && typeof error.error === 'object') {
    const body = error.error as Record<string, unknown>;
    const msg = body['detail'] ?? body['msg'] ?? body['message'] ?? body['error'];
    return typeof msg === 'string' ? msg : JSON.stringify(body);
  }

  return error.message || '';
}
