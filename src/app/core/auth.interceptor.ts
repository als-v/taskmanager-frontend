import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

const SESSION_EXPIRED_MESSAGE = 'Sessao expirada ou invalida. Faca login novamente.';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notifications = inject(NotificationService);
  const token = auth.token;
  const apiUrl = environment.apiUrl.replace(/\/$/, '');

  if (!token || !apiUrl || !request.url.startsWith(apiUrl)) {
    return next(request);
  }

  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && auth.isAuthenticated()) {
        auth.logout();
        notifications.warning(SESSION_EXPIRED_MESSAGE);
        router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
};
