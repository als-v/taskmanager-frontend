import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

const SESSION_EXPIRED_MESSAGE = 'Sessao expirada ou invalida. Faca login novamente.';
const AUTH_ENDPOINTS = ['/api/auth/login', '/api/auth/signup', '/api/auth/refresh', '/api/auth/logout'];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notifications = inject(NotificationService);
  const token = auth.token;
  const apiUrl = environment.apiUrl.replace(/\/$/, '');
  const isApiRequest = apiUrl ? request.url.startsWith(apiUrl) : request.url.startsWith('/api/');
  const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => request.url.startsWith(`${apiUrl}${path}`));

  if (!token || !isApiRequest || isAuthEndpoint) {
    return next(request);
  }

  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || !auth.isAuthenticated()) {
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
