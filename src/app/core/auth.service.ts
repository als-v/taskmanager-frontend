import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, switchMap, tap } from 'rxjs';

import { ApiService, AuthUser, RegisterPayload } from './api.service';

const TOKEN_STORAGE_KEY = 'taskmanager.jwt';
const PROFILE_STORAGE_KEY = 'taskmanager.profile';

export interface AuthSession {
  token: string;
  email: string;
  nome?: string;
  perfil: string;
  isAdmin: boolean;
  roles?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly tokenState = signal<string | null>(readSessionToken());
  private readonly profileState = signal<AuthSession | null>(readStoredSession());

  readonly isAuthenticated = computed(() => Boolean(this.tokenState()));
  readonly session = computed(() => this.profileState());
  readonly isAdmin = computed(() => this.session()?.isAdmin ?? false);

  constructor() {
    clearLegacyLocalStorage();
  }

  get token(): string | null {
    return this.tokenState();
  }

  login(email: string, password: string): Observable<AuthSession> {
    const normalizedEmail = normalizeEmail(email);

    return this.api.login(normalizedEmail, password).pipe(
      map((response) => response.token ?? ''),
      switchMap((token) =>
        this.api.getProfile(token).pipe(map((user) => this.buildSession(token, user)))
      ),
      tap((session) => this.setSession(session))
    );
  }

  register(payload: RegisterPayload): Observable<void> {
    return this.api.register(payload);
  }

  logout(): void {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(PROFILE_STORAGE_KEY);
    clearLegacyLocalStorage();
    this.tokenState.set(null);
    this.profileState.set(null);
  }

  private buildSession(token: string, user: AuthUser): AuthSession {
    const isAdmin = user.isAdmin ?? user.perfil?.toLowerCase() === 'admin';

    return {
      token,
      email: user.email,
      nome: user.nome,
      perfil: user.perfil ?? (isAdmin ? 'admin' : ''),
      isAdmin,
      roles: user.roles
    };
  }

  private setSession(session: AuthSession): void {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, session.token);
    sessionStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(session));
    clearLegacyLocalStorage();
    this.tokenState.set(session.token);
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
