import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

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

  const isRefreshCall = request.url.startsWith(`${apiUrl}/api/auth/refresh`);

  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error: HttpErrorResponse) => {
      if (isRefreshCall || error.status !== 401 || !auth.isAuthenticated()) {
        return throwError(() => error);
      }

      return auth.refreshSession().pipe(
        switchMap((session) =>
          next(request.clone({ setHeaders: { Authorization: `Bearer ${session.accessToken}` } }))
        ),
        catchError(() => {
          auth.logout();
          notifications.warning(SESSION_EXPIRED_MESSAGE);
          router.navigate(['/login']);
          return throwError(() => error);
        })
      );
    })
  );
};
