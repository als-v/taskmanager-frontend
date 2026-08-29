import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: AuthUser;
}

export interface SignUpPayload {
  name: string;
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly apiUrl = environment.apiUrl.replace(/\/$/, '');

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/api/auth/login`, { email, password });
  }

  signUp(payload: SignUpPayload): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${this.apiUrl}/api/auth/signup`, payload);
  }

  refresh(refreshToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/api/auth/refresh`, { refresh_token: refreshToken });
  }

  logout(refreshToken: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/api/auth/logout`, { refresh_token: refreshToken });
  }
}
