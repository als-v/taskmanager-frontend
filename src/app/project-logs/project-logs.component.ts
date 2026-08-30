import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, finalize } from 'rxjs';

import {
  ApiService,
  AuditAction,
  AuditLogResponse,
  ProjectMemberResponse,
  ProjectResponse,
  TaskStatus
} from '../core/api.service';
import { getHttpErrorMessage } from '../core/http-error-message';
import { NotificationService } from '../core/notification.service';
import { PaginationComponent } from '../shared/pagination/pagination.component';

// Membros do filtro "Usuario" carregam de forma incremental (scroll infinito), igual ao
// padrao ja usado em board.component.ts (loadMembers/onMembersScroll) para o painel de
// membros do projeto.
const MEMBERS_PAGE_SIZE = 20;
const SCROLL_THRESHOLD_PX = 80;

const ACTION_LABELS: Record<AuditAction, string> = {
  TASK_CREATED: 'Tarefa criada',
  TASK_UPDATED: 'Tarefa atualizada',
  STATUS_CHANGED: 'Status alterado',
  PRIORITY_CHANGED: 'Prioridade alterada',
  ASSIGNEE_CHANGED: 'Responsavel alterado',
  DUE_DATE_CHANGED: 'Prazo alterado',
  TASK_DELETED: 'Tarefa removida'
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'A fazer',
  IN_PROGRESS: 'Em andamento',
  DONE: 'Concluido'
};

@Component({
  selector: 'app-project-logs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './project-logs.component.html',
  styleUrl: './project-logs.component.css'
})
export class ProjectLogsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly projectId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly project = signal<ProjectResponse | null>(null);

  readonly loading = signal(false);
  readonly logs = signal<AuditLogResponse[]>([]);
  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly totalElements = signal(0);
  readonly totalPages = signal(1);
  readonly pageSizeOptions = [10, 20, 50, 100];

  readonly membersLoading = signal(false);
  readonly membersLoadingMore = signal(false);
  readonly members = signal<ProjectMemberResponse[]>([]);
  readonly membersPage = signal(0);
  readonly membersTotalPages = signal(1);
  readonly membersHasMore = computed(() => this.membersPage() + 1 < this.membersTotalPages());

  readonly actorMenuOpen = signal(false);
  readonly selectedActorId = signal('');
  readonly selectedActorLabel = computed(() => {
    const actorId = this.selectedActorId();
    if (!actorId) {
      return 'Todos';
    }
    return this.members().find((member) => member.user_id === actorId)?.name ?? `Usuario #${actorId.slice(0, 8)}`;
  });

  readonly actionOptions: { value: AuditAction; label: string }[] = (Object.keys(ACTION_LABELS) as AuditAction[]).map(
    (value) => ({ value, label: ACTION_LABELS[value] })
  );

  readonly filterForm = this.fb.nonNullable.group({
    actorId: [''],
    action: ['']
  });

  readonly hasActiveFilters = computed(() => {
    const { actorId, action } = this.filterForm.getRawValue();
    return Boolean(actorId || action);
  });

  private actorIdFilter = '';
  private actionFilter: AuditAction | '' = '';

  ngOnInit(): void {
    this.loadProject();
    this.loadMembers(true);
    this.load();

    this.filterForm.valueChanges.pipe(debounceTime(300)).subscribe(({ actorId, action }) => {
      this.actorIdFilter = actorId ?? '';
      this.actionFilter = (action as AuditAction) ?? '';
      this.selectedActorId.set(actorId ?? '');
      this.page.set(0);
      this.load();
    });
  }

  goBack(): void {
    void this.router.navigate(['/projetos', this.projectId]);
  }

  clearFilters(): void {
    this.filterForm.reset({ actorId: '', action: '' });
    this.selectedActorId.set('');
  }

  toggleActorMenu(): void {
    this.actorMenuOpen.update((open) => !open);
  }

  selectActor(actorId: string): void {
    this.selectedActorId.set(actorId);
    this.filterForm.patchValue({ actorId });
    this.actorMenuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  closeActorMenu(): void {
    this.actorMenuOpen.set(false);
  }

  onMembersScroll(event: Event): void {
    if (this.membersLoading() || this.membersLoadingMore() || !this.membersHasMore()) {
      return;
    }

    const element = event.target as HTMLElement;
    const reachedBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - SCROLL_THRESHOLD_PX;
    if (reachedBottom) {
      this.membersPage.update((p) => p + 1);
      this.loadMembers(false);
    }
  }

  onPageChange(page: number): void {
    this.page.set(page);
    this.load();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.page.set(0);
    this.load();
  }

  actionLabel(action: AuditAction): string {
    return ACTION_LABELS[action] ?? action;
  }

  statusLabel(status: TaskStatus | null): string {
    return status ? STATUS_LABELS[status] : '-';
  }

  actorName(actorId: string): string {
    const member = this.members().find((candidate) => candidate.user_id === actorId);
    return member?.name ?? `Usuario #${actorId.slice(0, 8)}`;
  }

  taskLabel(taskId: string): string {
    return `Tarefa #${taskId.slice(0, 8)}`;
  }

  private loadProject(): void {
    this.api.getProject(this.projectId).subscribe({
      next: (project) => this.project.set(project),
      error: (error) => this.notifications.error('Falha ao carregar projeto', getHttpErrorMessage(error))
    });
  }

  private loadMembers(reset: boolean): void {
    if (reset) {
      this.membersPage.set(0);
      this.members.set([]);
      this.membersTotalPages.set(1);
    }

    const currentPage = this.membersPage();

    if (currentPage === 0) {
      this.membersLoading.set(true);
    } else {
      this.membersLoadingMore.set(true);
    }

    this.api
      .getProjectMembers(this.projectId, currentPage, MEMBERS_PAGE_SIZE)
      .pipe(finalize(() => (currentPage === 0 ? this.membersLoading.set(false) : this.membersLoadingMore.set(false))))
      .subscribe({
        next: (response) => {
          this.members.update((prev) => (currentPage === 0 ? response.content : [...prev, ...response.content]));
          this.membersTotalPages.set(Math.max(1, response.total_pages));
        },
        error: (error) => this.notifications.error('Falha ao carregar membros', getHttpErrorMessage(error))
      });
  }

  private load(): void {
    this.loading.set(true);

    this.api
      .getAuditLogs(this.projectId, this.page(), this.pageSize(), this.actorIdFilter || undefined, this.actionFilter || undefined)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.logs.set(response.content);
          this.totalElements.set(response.total_elements);
          this.totalPages.set(Math.max(1, response.total_pages));
        },
        error: (error) => this.notifications.error('Falha ao carregar logs', getHttpErrorMessage(error))
      });
  }
}
