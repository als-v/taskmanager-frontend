import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { ApiService, ProjectMemberResponse, TaskFilterOptions, TaskPriority, TaskResponse, TaskStatus } from '../../core/api.service';
import { getHttpErrorMessage } from '../../core/http-error-message';
import { NotificationService } from '../../core/notification.service';
import { ModalComponent } from '../modal/modal.component';
import { TaskCardComponent } from '../task-card/task-card.component';

const PAGE_SIZE = 20;
const SCROLL_THRESHOLD_PX = 80;

@Component({
  selector: 'app-task-column',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, TaskCardComponent],
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

  ngOnInit(): void {
    this.load(true);
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
