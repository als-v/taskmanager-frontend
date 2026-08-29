import { HttpClient, HttpParams } from '@angular/common/http';
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

export interface CreateProjectPayload {
  name: string;
  description?: string | null;
}

export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  current_user_role: 'ADMIN' | 'MEMBER';
  created_at: string;
  updated_at: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  total_elements: number;
  total_pages: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly apiUrl = environment.apiUrl.replace(/\/$/, '');

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/api/auth/login`, { email, password });
  }

  getProjects(
    page: number,
    size: number,
    sort = 'created_at,ASC',
    name?: string,
    description?: string
  ): Observable<PageResponse<ProjectResponse>> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size)).set('sort', sort);

    if (name?.trim()) {
      params = params.set('name', name.trim());
    }
    if (description?.trim()) {
      params = params.set('description', description.trim());
    }

    return this.http.get<PageResponse<ProjectResponse>>(`${this.apiUrl}/api/projects`, { params });
  }

  createProject(payload: CreateProjectPayload): Observable<ProjectResponse> {
    return this.http.post<ProjectResponse>(`${this.apiUrl}/api/projects`, payload);
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
