import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface AuthUser {
  id?: string;
  email: string;
  nome?: string;
  perfil?: string;
  isAdmin?: boolean;
  roles?: Record<string, unknown>;
}

export interface LoginResponse {
  token: string;
}

export interface RegisterPayload {
  nome: string;
  email: string;
  telefone?: string;
  perfil_solicitado?: string;
  mensagem?: string;
}

export interface RoleOption {
  codigo: string;
  nome: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly apiUrl = environment.apiUrl.replace(/\/$/, '');

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/api/auth/login`, { email, password });
  }

  register(payload: RegisterPayload): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/api/auth/register`, payload);
  }

  getProfile(token: string): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.apiUrl}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  listRoles(): Observable<RoleOption[]> {
    return this.http.get<RoleOption[]>(`${this.apiUrl}/api/roles`);
  }
}
