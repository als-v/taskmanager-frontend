import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';

import { ApiService, AuthResponse, AuthUser, SignUpPayload } from './api.service';

const TOKEN_STORAGE_KEY = 'taskmanager.jwt';
const REFRESH_STORAGE_KEY = 'taskmanager.refresh';
const PROFILE_STORAGE_KEY = 'taskmanager.profile';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly tokenState = signal<string | null>(readSessionToken());
  private readonly profileState = signal<AuthSession | null>(readStoredSession());

  readonly isAuthenticated = computed(() => Boolean(this.tokenState()));
  readonly session = computed(() => this.profileState());

  constructor() {
    clearLegacyLocalStorage();
  }

  get token(): string | null {
    return this.tokenState();
  }

  private get refreshTokenValue(): string | null {
    return this.profileState()?.refreshToken ?? sessionStorage.getItem(REFRESH_STORAGE_KEY);
  }

  login(email: string, password: string): Observable<AuthSession> {
    const normalizedEmail = normalizeEmail(email);

    return this.api.login(normalizedEmail, password).pipe(
      map((response) => this.buildSession(response)),
      tap((session) => this.setSession(session))
    );
  }

  signUp(payload: SignUpPayload): Observable<AuthUser> {
    return this.api.signUp({ ...payload, email: normalizeEmail(payload.email) });
  }

  refreshSession(): Observable<AuthSession> {
    const refreshToken = this.refreshTokenValue;

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.api.refresh(refreshToken).pipe(
      map((response) => this.buildSession(response)),
      tap((session) => this.setSession(session))
    );
  }

  logout(): void {
    const refreshToken = this.refreshTokenValue;

    const clearLocal = () => {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(REFRESH_STORAGE_KEY);
      sessionStorage.removeItem(PROFILE_STORAGE_KEY);
      clearLegacyLocalStorage();
      this.tokenState.set(null);
      this.profileState.set(null);
    };

    if (refreshToken) {
      this.api
        .logout(refreshToken)
        .pipe(catchError(() => of(void 0)))
        .subscribe(clearLocal);
      return;
    }

    clearLocal();
  }

  private buildSession(response: AuthResponse): AuthSession {
    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      user: response.user
    };
  }

  private setSession(session: AuthSession): void {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, session.accessToken);
    sessionStorage.setItem(REFRESH_STORAGE_KEY, session.refreshToken);
    sessionStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(session));
    clearLegacyLocalStorage();
    this.tokenState.set(session.accessToken);
    this.profileState.set(session);
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readSessionToken(): string | null {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

function readStoredSession(): AuthSession | null {
  const raw = sessionStorage.getItem(PROFILE_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    sessionStorage.removeItem(PROFILE_STORAGE_KEY);
    return null;
  }
}

function clearLegacyLocalStorage(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(PROFILE_STORAGE_KEY);
}
