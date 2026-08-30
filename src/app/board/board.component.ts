import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';

import {
  ApiService,
  ProjectMemberResponse,
  ProjectResponse,
  TaskFilterOptions,
  TaskPriority,
  TaskStatus,
  UserResponse
} from '../core/api.service';
import { getHttpErrorMessage } from '../core/http-error-message';
import { NotificationService } from '../core/notification.service';
import { AvatarComponent } from '../shared/avatar/avatar.component';
import { ModalComponent } from '../shared/modal/modal.component';
import { TaskColumnComponent } from '../shared/task-column/task-column.component';

interface BoardColumn {
  status: TaskStatus;
  title: string;
}

const CANDIDATES_PAGE_SIZE = 20;
const MEMBERS_PAGE_SIZE = 20;
const SCROLL_THRESHOLD_PX = 80;

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AvatarComponent, ModalComponent, TaskColumnComponent],
  templateUrl: './board.component.html',
  styleUrl: './board.component.css'
})
export class BoardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly projectId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly project = signal<ProjectResponse | null>(null);
  readonly isAdmin = computed(() => this.project()?.current_user_role === 'ADMIN');

  readonly columns: BoardColumn[] = [
    { status: 'TODO', title: 'A fazer' },
    { status: 'IN_PROGRESS', title: 'Em andamento' },
    { status: 'DONE', title: 'Concluido' }
  ];

  readonly taskFilterForm = this.fb.nonNullable.group({
    title: [''],
    status: [''],
    assigneeId: [''],
    priority: [''],
    dueDate: ['']
  });

  private readonly taskFilterValues = signal(this.taskFilterForm.getRawValue());

  readonly hasActiveTaskFilters = computed(() => {
    const filters = this.taskFilterValues();
    return Boolean(filters.title || filters.status || filters.assigneeId || filters.priority || filters.dueDate);
  });

  readonly visibleColumns = computed(() => {
    const status = this.taskFilterValues().status;
    return status ? this.columns.filter((column) => column.status === status) : this.columns;
  });

  readonly columnFilters = computed<TaskFilterOptions>(() => {
    const filters = this.taskFilterValues();
    const result: TaskFilterOptions = {};

    if (filters.title.trim()) {
      result.title = filters.title.trim();
    }
    if (filters.priority) {
      result.priority = filters.priority as TaskPriority;
    }
    if (filters.assigneeId === 'unassigned') {
      result.unassigned = true;
    } else if (filters.assigneeId) {
      result.assigneeId = filters.assigneeId;
    }
    if (filters.dueDate) {
      result.dueDate = filters.dueDate;
    }

    return result;
  });

  readonly membersLoading = signal(false);
  readonly membersLoadingMore = signal(false);
  readonly members = signal<ProjectMemberResponse[]>([]);
  readonly membersPage = signal(0);
  readonly membersTotalElements = signal(0);
  readonly membersTotalPages = signal(1);
  readonly membersHasMore = computed(() => this.membersPage() + 1 < this.membersTotalPages());

  readonly showAddMemberModal = signal(false);
  readonly addingMembers = signal(false);
  readonly candidatesLoading = signal(false);
  readonly candidatesLoadingMore = signal(false);
  readonly candidates = signal<UserResponse[]>([]);
  readonly candidatesPage = signal(0);
  readonly candidatesTotalElements = signal(0);
  readonly candidatesTotalPages = signal(1);
  readonly candidatesHasMore = computed(() => this.candidatesPage() + 1 < this.candidatesTotalPages());
  readonly selectedUserIds = signal<Set<string>>(new Set());
  readonly hasSelectedUsers = computed(() => this.selectedUserIds().size > 0);

  readonly addMemberSearchForm = this.fb.nonNullable.group({
    name: [''],
    email: ['']
  });

  private candidateNameFilter = '';
  private candidateEmailFilter = '';

  ngOnInit(): void {
    this.loadProject();
    this.loadMembers(true);

    this.addMemberSearchForm.valueChanges
      .pipe(
        debounceTime(350),
        distinctUntilChanged((a, b) => a.name === b.name && a.email === b.email)
      )
      .subscribe(({ name, email }) => {
        this.candidateNameFilter = name?.trim() ?? '';
        this.candidateEmailFilter = email?.trim() ?? '';
        this.loadCandidates(true);
      });

    this.taskFilterForm.valueChanges.pipe(debounceTime(300)).subscribe(() => {
      this.taskFilterValues.set(this.taskFilterForm.getRawValue());
    });
  }

  goBack(): void {
    void this.router.navigate(['/projetos']);
  }

  openLogs(): void {
    void this.router.navigate(['/projetos', this.projectId, 'logs']);
  }

  clearTaskFilters(): void {
    this.taskFilterForm.reset({ title: '', status: '', assigneeId: '', priority: '', dueDate: '' });
    this.taskFilterValues.set(this.taskFilterForm.getRawValue());
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

  openAddMemberModal(): void {
    this.addMemberSearchForm.reset({ name: '', email: '' });
    this.candidateNameFilter = '';
    this.candidateEmailFilter = '';
    this.selectedUserIds.set(new Set());
    this.showAddMemberModal.set(true);
    this.loadCandidates(true);
  }

  closeAddMemberModal(): void {
    if (this.addingMembers()) {
      return;
    }

    this.showAddMemberModal.set(false);
  }

  onCandidatesScroll(event: Event): void {
    if (this.candidatesLoading() || this.candidatesLoadingMore() || !this.candidatesHasMore()) {
      return;
    }

    const element = event.target as HTMLElement;
    const reachedBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - SCROLL_THRESHOLD_PX;

    if (reachedBottom) {
      this.candidatesPage.update((p) => p + 1);
      this.loadCandidates(false);
    }
  }

  isSelected(userId: string): boolean {
    return this.selectedUserIds().has(userId);
  }

  toggleCandidate(userId: string): void {
    const next = new Set(this.selectedUserIds());
    
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }

    this.selectedUserIds.set(next);
  }

  submitAddMembers(): void {
    if (!this.hasSelectedUsers()) {
      this.notifications.warning('Selecione ao menos um usuario', 'Marque os usuarios que deseja adicionar ao projeto.');
      return;
    }

    const userIds = Array.from(this.selectedUserIds());
    this.addingMembers.set(true);

    this.api
      .addProjectMembers(this.projectId, userIds)
      .pipe(finalize(() => this.addingMembers.set(false)))
      .subscribe({
        next: () => {
          this.showAddMemberModal.set(false);
          this.notifications.success('Membros adicionados', 'Os usuarios selecionados agora fazem parte do projeto.');
          this.loadMembers(true);
        },
        error: (error) => this.notifications.error('Falha ao adicionar membros', getHttpErrorMessage(error))
      });
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
          this.membersTotalElements.set(response.total_elements);
          this.membersTotalPages.set(Math.max(1, response.total_pages));
        },
        error: (error) => this.notifications.error('Falha ao carregar membros', getHttpErrorMessage(error))
      });
  }

  private loadCandidates(reset: boolean): void {
    if (reset) {
      this.candidatesPage.set(0);
      this.candidates.set([]);
      this.candidatesTotalPages.set(1);
    }

    const currentPage = this.candidatesPage();
    
    if (currentPage === 0) {
      this.candidatesLoading.set(true);
    } else {
      this.candidatesLoadingMore.set(true);
    }

    this.api
      .searchAddableUsers(this.projectId, currentPage, CANDIDATES_PAGE_SIZE, this.candidateNameFilter, this.candidateEmailFilter)
      .pipe(finalize(() => (currentPage === 0 ? this.candidatesLoading.set(false) : this.candidatesLoadingMore.set(false))))
      .subscribe({
        next: (response) => {
          this.candidates.update((prev) => (currentPage === 0 ? response.content : [...prev, ...response.content]));
          this.candidatesTotalElements.set(response.total_elements);
          this.candidatesTotalPages.set(Math.max(1, response.total_pages));
        },
        error: (error) => this.notifications.error('Falha ao buscar usuarios', getHttpErrorMessage(error))
      });
  }
}
