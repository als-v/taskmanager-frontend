import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import {
  ApiService,
  ProjectMemberResponse,
  TaskFilterOptions,
  TaskPriority,
  TaskResponse,
  TaskStatus,
  UpdateTaskPayload
} from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { getHttpErrorMessage } from '../../core/http-error-message';
import { NotificationService } from '../../core/notification.service';
import { TaskBoardSyncService } from '../../board/task-board-sync.service';
import { AvatarComponent } from '../avatar/avatar.component';
import { ModalComponent } from '../modal/modal.component';
import { TaskCardComponent } from '../task-card/task-card.component';

const PAGE_SIZE = 20;
const SCROLL_THRESHOLD_PX = 80;

type DetailField = 'title' | 'description' | 'status' | 'priority' | 'assignee' | 'dueDate';

@Component({
  selector: 'app-task-column',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AvatarComponent, ModalComponent, TaskCardComponent, CdkDropList, CdkDrag],
  templateUrl: './task-column.component.html',
  styleUrl: './task-column.component.css'
})
export class TaskColumnComponent implements OnInit, OnChanges {
  @Input({ required: true }) projectId!: string;
  @Input({ required: true }) status!: TaskStatus;
  @Input({ required: true }) title!: string;
  @Input() members: ProjectMemberResponse[] = [];
  @Input() filters: TaskFilterOptions = {};

  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly boardSync = inject(TaskBoardSyncService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly tasks = signal<TaskResponse[]>([]);
  readonly page = signal(0);
  readonly totalElements = signal(0);
  readonly totalPages = signal(1);
  readonly hasMore = computed(() => this.page() + 1 < this.totalPages());

  readonly showCreateModal = signal(false);
  readonly creating = signal(false);
  readonly createForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(2000)]],
    priority: ['MEDIUM' as TaskPriority, [Validators.required]],
    assigneeId: [''],
    dueDate: ['']
  });

  readonly statusOptions: { value: TaskStatus; label: string }[] = [
    { value: 'TODO', label: 'A fazer' },
    { value: 'IN_PROGRESS', label: 'Em andamento' },
    { value: 'DONE', label: 'Concluido' }
  ];

  readonly priorityOptions: { value: TaskPriority; label: string }[] = [
    { value: 'LOW', label: 'Baixa' },
    { value: 'MEDIUM', label: 'Media' },
    { value: 'HIGH', label: 'Alta' },
    { value: 'CRITICAL', label: 'Critica' }
  ];

  readonly priorityLabels: Record<string, string> = {
    LOW: 'Baixa',
    MEDIUM: 'Media',
    HIGH: 'Alta',
    CRITICAL: 'Critica'
  };

  readonly showDetailModal = signal(false);
  readonly selectedTask = signal<TaskResponse | null>(null);
  readonly savingField = signal<DetailField | null>(null);
  readonly confirmingDelete = signal(false);
  readonly deletingTask = signal(false);

  readonly editingTitle = signal(false);
  readonly titleDraft = signal('');

  readonly editingDescription = signal(false);
  readonly descriptionDraft = signal('');

  readonly editingDueDate = signal(false);
  readonly dueDateDraft = signal('');

  readonly statusMenuOpen = signal(false);
  readonly priorityMenuOpen = signal(false);
  readonly assigneeMenuOpen = signal(false);

  readonly currentUserId = computed(() => this.auth.session()?.user?.id ?? null);

  ngOnInit(): void {
    this.load(true);

    this.boardSync.statusChanges$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ task, previousStatus }) => {
      if (task.status === this.status) {
        this.tasks.update((list) => {
          const idx = list.findIndex((t) => t.id === task.id);

          if (idx === -1) {
            this.totalElements.update((n) => n + 1);
            return [task, ...list];
          }

          const copy = [...list];
          copy[idx] = task;

          return copy;
        });

      } else if (previousStatus === this.status) {
        this.tasks.update((list) => {
          if (!list.some((t) => t.id === task.id)) {
            return list;
          }

          this.totalElements.update((n) => Math.max(0, n - 1));
          return list.filter((t) => t.id !== task.id);
        });
      }
    });
  }

  onDrop(event: CdkDragDrop<TaskResponse[]>): void {
    const task = event.item.data as TaskResponse;
    const previousStatus = task.status;
    const newStatus = this.status;

    if (event.previousContainer === event.container || newStatus === previousStatus) {
      return;
    }

    const optimisticTask: TaskResponse = { ...task, status: newStatus };
    this.boardSync.publishStatusChange(optimisticTask, previousStatus);

    this.api.updateTaskStatus(this.projectId, task.id, newStatus).subscribe({
      next: (confirmed) => this.boardSync.publishStatusChange(confirmed, previousStatus),
      error: (error) => {
        this.boardSync.publishStatusChange(task, newStatus);
        this.notifications.error('Falha ao mover tarefa', getHttpErrorMessage(error));
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters'] && !changes['filters'].firstChange) {
      this.load(true);
    }
  }

  onScroll(event: Event): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) {
      return;
    }

    const element = event.target as HTMLElement;
    const reachedBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - SCROLL_THRESHOLD_PX;

    if (reachedBottom) {
      this.page.update((p) => p + 1);
      this.load(false);
    }
  }

  openCreateModal(): void {
    this.createForm.reset({ title: '', description: '', priority: 'MEDIUM', assigneeId: '', dueDate: '' });
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    if (this.creating()) {
      return;
    }

    this.showCreateModal.set(false);
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      this.notifications.warning('Revise os dados', 'Informe um titulo valido para a tarefa.');
      return;
    }

    const { title, description, priority, assigneeId, dueDate } = this.createForm.getRawValue();
    this.creating.set(true);

    this.api
      .createTask(this.projectId, {
        title,
        description: description?.trim() ? description.trim() : null,
        status: this.status,
        priority,
        assignee_id: assigneeId?.trim() ? assigneeId.trim() : null,
        due_date: dueDate?.trim() ? this.toLocalDateTime(dueDate) : null
      })
      .pipe(finalize(() => this.creating.set(false)))
      .subscribe({
        next: () => {
          this.showCreateModal.set(false);
          this.notifications.success('Tarefa criada', `"${title}" foi criada com sucesso.`);
          this.load(true);
        },
        error: (error) => this.notifications.error('Falha ao criar tarefa', getHttpErrorMessage(error))
      });
  }

  openDetailModal(task: TaskResponse): void {
    this.selectedTask.set(task);
    this.titleDraft.set(task.title);
    this.descriptionDraft.set(task.description ?? '');
    this.dueDateDraft.set(task.due_date ? task.due_date.slice(0, 10) : '');
    this.editingTitle.set(false);
    this.editingDescription.set(false);
    this.editingDueDate.set(false);
    this.statusMenuOpen.set(false);
    this.priorityMenuOpen.set(false);
    this.assigneeMenuOpen.set(false);
    this.confirmingDelete.set(false);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    if (this.savingField() || this.deletingTask()) {
      return;
    }

    this.confirmingDelete.set(false);
    this.showDetailModal.set(false);
  }

  requestDeleteTask(): void {
    this.confirmingDelete.set(true);
  }

  cancelDeleteTask(): void {
    this.confirmingDelete.set(false);
  }

  confirmDeleteTask(): void {
    const task = this.selectedTask();

    if (!task) {
      return;
    }

    this.deletingTask.set(true);

    this.api
      .deleteTask(this.projectId, task.id)
      .pipe(finalize(() => this.deletingTask.set(false)))
      .subscribe({
        next: () => {
          this.confirmingDelete.set(false);
          this.showDetailModal.set(false);
          this.load(true);
          this.notifications.success('Tarefa excluida', `A tarefa "${task.title}" foi removida.`);
        },
        error: (error) => this.notifications.error('Falha ao excluir tarefa', getHttpErrorMessage(error))
      });
  }

  @HostListener('document:keydown.escape')
  closeDetailMenus(): void {
    this.statusMenuOpen.set(false);
    this.priorityMenuOpen.set(false);
    this.assigneeMenuOpen.set(false);
  }

  statusLabel(status: TaskStatus): string {
    return this.statusOptions.find((option) => option.value === status)?.label ?? status;
  }

  isOverdue(task: TaskResponse): boolean {
    if (!task.due_date || task.status === 'DONE') {
      return false;
    }

    return new Date(task.due_date).getTime() < Date.now();
  }

  startEditTitle(): void {
    const task = this.selectedTask();
    if (!task) {
      return;
    }

    this.titleDraft.set(task.title);
    this.editingTitle.set(true);
  }

  cancelEditTitle(): void {
    this.titleDraft.set(this.selectedTask()?.title ?? '');
    this.editingTitle.set(false);
  }

  saveTitle(): void {
    const task = this.selectedTask();

    if (!task) {
      return;
    }

    const value = this.titleDraft().trim();

    if (!value) {
      this.notifications.warning('Revise os dados', 'Informe um titulo valido para a tarefa.');
      return;
    }

    if (value.length > 200) {
      this.notifications.warning('Revise os dados', 'O titulo deve ter no maximo 200 caracteres.');
      return;
    }

    if (value === task.title) {
      this.editingTitle.set(false);
      return;
    }

    this.patchTask({ title: value }, 'title', `Titulo atualizado para "${value}".`, () => this.editingTitle.set(false));
  }

  startEditDescription(): void {
    this.descriptionDraft.set(this.selectedTask()?.description ?? '');
    this.editingDescription.set(true);
  }

  cancelEditDescription(): void {
    this.descriptionDraft.set(this.selectedTask()?.description ?? '');
    this.editingDescription.set(false);
  }

  saveDescription(): void {
    const task = this.selectedTask();

    if (!task) {
      return;
    }

    const value = this.descriptionDraft().trim();

    if (value.length > 2000) {
      this.notifications.warning('Revise os dados', 'A descricao deve ter no maximo 2000 caracteres.');
      return;
    }

    if (value === (task.description ?? '')) {
      this.editingDescription.set(false);
      return;
    }

    this.patchTask({ description: value ? value : null }, 'description', 'Descricao atualizada.', () =>
      this.editingDescription.set(false)
    );
  }

  toggleStatusMenu(): void {
    const next = !this.statusMenuOpen();
    this.statusMenuOpen.set(next);
    this.priorityMenuOpen.set(false);
    this.assigneeMenuOpen.set(false);
  }

  selectStatus(status: TaskStatus): void {
    this.statusMenuOpen.set(false);
    const task = this.selectedTask();

    if (!task || status === task.status) {
      return;
    }

    this.patchTask({ status }, 'status', 'Etapa da tarefa atualizada.');
  }

  togglePriorityMenu(): void {
    const next = !this.priorityMenuOpen();
    this.priorityMenuOpen.set(next);
    this.statusMenuOpen.set(false);
    this.assigneeMenuOpen.set(false);
  }

  selectPriority(priority: TaskPriority): void {
    this.priorityMenuOpen.set(false);
    const task = this.selectedTask();

    if (!task || priority === task.priority) {
      return;
    }

    this.patchTask({ priority }, 'priority', 'Prioridade da tarefa atualizada.');
  }

  toggleAssigneeMenu(): void {
    const next = !this.assigneeMenuOpen();
    this.assigneeMenuOpen.set(next);
    this.statusMenuOpen.set(false);
    this.priorityMenuOpen.set(false);
  }

  joinTask(): void {
    const userId = this.currentUserId();

    if (!userId) {
      return;
    }

    this.assigneeMenuOpen.set(false);
    const task = this.selectedTask();

    if (task?.assignee?.id === userId) {
      return;
    }

    this.patchTask({ assignee_id: userId }, 'assignee', 'Voce entrou na tarefa.');
  }

  selectAssignee(userId: string | null): void {
    this.assigneeMenuOpen.set(false);
    const task = this.selectedTask();

    if (!task || (task.assignee?.id ?? null) === userId) {
      return;
    }

    const message = userId ? 'Responsavel da tarefa atualizado.' : 'Responsavel removido da tarefa.';
    this.patchTask({ assignee_id: userId }, 'assignee', message);
  }

  startEditDueDate(): void {
    const task = this.selectedTask();
    this.dueDateDraft.set(task?.due_date ? task.due_date.slice(0, 10) : '');
    this.editingDueDate.set(true);
  }

  cancelEditDueDate(): void {
    this.editingDueDate.set(false);
  }

  saveDueDate(value: string): void {
    this.dueDateDraft.set(value);
    const task = this.selectedTask();

    if (!task) {
      return;
    }

    const currentValue = task.due_date ? task.due_date.slice(0, 10) : '';

    if (value === currentValue) {
      this.editingDueDate.set(false);
      return;
    }

    const payload = value ? this.toLocalDateTime(value) : null;

    this.patchTask({ due_date: payload }, 'dueDate', value ? 'Prazo da tarefa atualizado.' : 'Prazo removido da tarefa.', () =>
      this.editingDueDate.set(false)
    );
  }

  clearDueDate(): void {
    this.dueDateDraft.set('');
    const task = this.selectedTask();
    
    if (!task || !task.due_date) {
      this.editingDueDate.set(false);
      return;
    }

    this.patchTask({ due_date: null }, 'dueDate', 'Prazo removido da tarefa.', () => this.editingDueDate.set(false));
  }

  private patchTask(patch: UpdateTaskPayload, field: DetailField, successMessage: string, onSuccess?: () => void): void {
    const task = this.selectedTask();
    if (!task) {
      return;
    }

    const previousStatus = task.status;
    this.savingField.set(field);

    this.api
      .updateTask(this.projectId, task.id, patch)
      .pipe(finalize(() => this.savingField.set(null)))
      .subscribe({
        next: (updated) => {
          this.selectedTask.set(updated);
          this.titleDraft.set(updated.title);
          this.descriptionDraft.set(updated.description ?? '');
          this.dueDateDraft.set(updated.due_date ? updated.due_date.slice(0, 10) : '');
          this.notifications.success('Tarefa atualizada', successMessage);
          onSuccess?.();
          
          if (field === 'status') {
            this.boardSync.publishStatusChange(updated, previousStatus);
          } else {
            this.load(true);
          }
        },
        error: (error) => this.notifications.error('Falha ao atualizar tarefa', getHttpErrorMessage(error))
      });
  }

  private toLocalDateTime(dateValue: string): string {
    return dateValue.length === 10 ? `${dateValue}T23:59:59` : dateValue;
  }

  private load(reset: boolean): void {
    if (reset) {
      this.page.set(0);
      this.tasks.set([]);
      this.totalPages.set(1);
    }

    const currentPage = this.page();

    if (currentPage === 0) {
      this.loading.set(true);
    } else {
      this.loadingMore.set(true);
    }

    this.api
      .getTasks(this.projectId, { status: this.status, page: currentPage, size: PAGE_SIZE, ...this.filters })
      .pipe(finalize(() => (currentPage === 0 ? this.loading.set(false) : this.loadingMore.set(false))))
      .subscribe({
        next: (response) => {
          this.tasks.update((prev) => (currentPage === 0 ? response.content : [...prev, ...response.content]));
          this.totalElements.set(response.total_elements);
          this.totalPages.set(Math.max(1, response.total_pages));
        },
        error: (error) => this.notifications.error('Falha ao carregar tarefas', getHttpErrorMessage(error))
      });
  }
}
