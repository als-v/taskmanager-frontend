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

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ProjectMemberResponse {
  user_id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  joined_at: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
}

export interface TaskAssigneeResponse {
  id: string;
  name: string;
  email: string;
}

export interface TaskResponse {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: TaskAssigneeResponse | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: string | null;
  due_date?: string | null;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string | null;
  due_date?: string | null;
}

export interface TaskFilterOptions {
  q?: string;
  priority?: TaskPriority;
  assigneeId?: string;
  unassigned?: boolean;
  dueDate?: string;
  sort?: string;
}

export type AuditAction =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'STATUS_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'ASSIGNEE_CHANGED'
  | 'DUE_DATE_CHANGED'
  | 'TASK_DELETED';

export interface AuditLogResponse {
  id: string;
  project_id: string;
  task_id: string;
  actor_id: string;
  action: AuditAction;
  from_status: TaskStatus | null;
  to_status: TaskStatus | null;
  created_at: string;
}

export interface DashboardProjectResponse {
  id: string;
  name: string;
}

export interface DashboardResponse {
  projects_total: number;
  tasks_total: number;
  by_status: Record<TaskStatus, number>;
  by_priority: Record<TaskPriority, number>;
  overdue: number;
  due_soon: number;
  projects: DashboardProjectResponse[];
  selected_project_id: string | null;
  generated_at: string;
}

export interface DashboardWipItemResponse {
  user_id: string;
  name: string;
  email: string;
  in_progress: number;
}

export interface DashboardWipResponse {
  items: DashboardWipItemResponse[];
  selected_project_id: string | null;
  generated_at: string;
}

export type NotificationType = 'TASK_ASSIGNED' | 'PROJECT_ADDED';

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  message: string;
  project_id: string | null;
  task_id: string | null;
  created_by: string | null;
  created_at: string;
  read_at: string | null;
  unread: boolean;
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

  getProject(id: string): Observable<ProjectResponse> {
    return this.http.get<ProjectResponse>(`${this.apiUrl}/api/projects/${id}`);
  }

  getProjectMembers(
    projectId: string,
    page: number,
    size: number,
    name?: string,
    email?: string
  ): Observable<PageResponse<ProjectMemberResponse>> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));

    if (name?.trim()) {
      params = params.set('name', name.trim());
    }
    if (email?.trim()) {
      params = params.set('email', email.trim());
    }

    return this.http.get<PageResponse<ProjectMemberResponse>>(`${this.apiUrl}/api/projects/${projectId}/members`, { params });
  }

  addProjectMembers(projectId: string, userIds: string[]): Observable<ProjectMemberResponse[]> {
    return this.http.post<ProjectMemberResponse[]>(`${this.apiUrl}/api/projects/${projectId}/members`, { user_ids: userIds });
  }

  searchAddableUsers(
    projectId: string,
    page: number,
    size: number,
    name?: string,
    email?: string
  ): Observable<PageResponse<UserResponse>> {
    let params = new HttpParams().set('project_id', projectId).set('page', String(page)).set('size', String(size));

    if (name?.trim()) {
      params = params.set('name', name.trim());
    }

    if (email?.trim()) {
      params = params.set('email', email.trim());
    }

    return this.http.get<PageResponse<UserResponse>>(`${this.apiUrl}/api/users`, { params });
  }

  getTasks(
    projectId: string,
    opts: TaskFilterOptions & { status: TaskStatus; page: number; size: number }
  ): Observable<PageResponse<TaskResponse>> {
    let params = new HttpParams().set('status', opts.status).set('page', String(opts.page)).set('size', String(opts.size));

    if (opts.q?.trim()) {
      params = params.set('q', opts.q.trim());
    }

    if (opts.priority) {
      params = params.set('priority', opts.priority);
    }

    if (opts.unassigned) {
      params = params.set('unassigned', 'true');
    } else if (opts.assigneeId) {
      params = params.set('assignee_id', opts.assigneeId);
    }
    
    if (opts.dueDate) {
      params = params.set('due_date_from', `${opts.dueDate}T00:00:00`).set('due_date_to', `${opts.dueDate}T23:59:59`);
    }

    if (opts.sort?.trim()) {
      params = params.set('sort', opts.sort.trim());
    }

    return this.http.get<PageResponse<TaskResponse>>(`${this.apiUrl}/api/projects/${projectId}/tasks`, { params });
  }

  createTask(projectId: string, payload: CreateTaskPayload): Observable<TaskResponse> {
    return this.http.post<TaskResponse>(`${this.apiUrl}/api/projects/${projectId}/tasks`, payload);
  }

  updateTask(projectId: string, taskId: string, payload: UpdateTaskPayload): Observable<TaskResponse> {
    return this.http.patch<TaskResponse>(`${this.apiUrl}/api/projects/${projectId}/tasks/${taskId}`, payload);
  }

  getAuditLogs(
    projectId: string,
    page: number,
    size: number,
    actorId?: string,
    action?: AuditAction
  ): Observable<PageResponse<AuditLogResponse>> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));

    if (actorId) {
      params = params.set('actor_id', actorId);
    }
    if (action) {
      params = params.set('action', action);
    }

    return this.http.get<PageResponse<AuditLogResponse>>(`${this.apiUrl}/api/projects/${projectId}/logs`, { params });
  }

  getDashboard(projectId?: string): Observable<DashboardResponse> {
    let params = new HttpParams();
    if (projectId) {
      params = params.set('project_id', projectId);
    }

    return this.http.get<DashboardResponse>(`${this.apiUrl}/api/dashboard`, { params });
  }

  getDashboardWip(projectId?: string): Observable<DashboardWipResponse> {
    let params = new HttpParams();
    if (projectId) {
      params = params.set('project_id', projectId);
    }

    return this.http.get<DashboardWipResponse>(`${this.apiUrl}/api/dashboard/wip`, { params });
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

  getNotifications(unread?: boolean, page = 0, size = 20): Observable<PageResponse<NotificationResponse>> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));

    if (unread !== undefined) {
      params = params.set('unread', String(unread));
    }

    return this.http.get<PageResponse<NotificationResponse>>(`${this.apiUrl}/api/notifications`, { params });
  }

  markNotificationRead(notificationId: string): Observable<NotificationResponse> {
    return this.http.patch<NotificationResponse>(`${this.apiUrl}/api/notifications/${notificationId}/read`, {});
  }
}
