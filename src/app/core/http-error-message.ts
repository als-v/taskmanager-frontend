import { HttpErrorResponse } from '@angular/common/http';

export function getHttpErrorMessage(error: unknown, fallback = 'Nao foi possivel concluir a operacao.'): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  const apiMessage = readApiMessage(error);

  if (/user already exist/i.test(apiMessage)) {
    return 'Este usuario ja existe. Entre com suas credenciais ou utilize a recuperacao de acesso.';
  }

  if (error.status === 0) {
    return 'Nao foi possivel conectar ao servidor. Verifique se a API esta ativa.';
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
  return error instanceof HttpErrorResponse && error.status === 400 && /user already exist/i.test(readApiMessage(error));
}

function readApiMessage(error: HttpErrorResponse): string {
  if (typeof error.error === 'string') {
    return error.error;
  }

  if (error.error && typeof error.error === 'object') {
    const body = error.error as Record<string, unknown>;
    const msg = body['msg'] ?? body['message'] ?? body['error'];
    return typeof msg === 'string' ? msg : JSON.stringify(body);
  }

  return error.message || '';
}
