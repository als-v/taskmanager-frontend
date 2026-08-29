import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';

import { ApiService, ProjectResponse } from '../core/api.service';
import { getHttpErrorMessage } from '../core/http-error-message';
import { NotificationService } from '../core/notification.service';
import { ModalComponent } from '../shared/modal/modal.component';

@Component({
  selector: 'app-projetos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent],
  templateUrl: './projetos.component.html',
  styleUrl: './projetos.component.css'
})
export class ProjetosComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly projects = signal<ProjectResponse[]>([]);
  readonly page = signal(0); 
  readonly pageSize = signal(10);
  readonly totalElements = signal(0);
  readonly totalPages = signal(1);
  readonly pageSizeOptions = [10, 25, 50, 100];

  readonly startItem = computed(() => (this.totalElements() === 0 ? 0 : this.page() * this.pageSize() + 1));
  readonly endItem = computed(() => Math.min((this.page() + 1) * this.pageSize(), this.totalElements()));

  readonly showCreateModal = signal(false);
  readonly creating = signal(false);
  readonly createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', [Validators.maxLength(2000)]]
  });

  readonly filterForm = this.fb.nonNullable.group({
    name: [''],
    description: ['']
  });
  readonly hasActiveFilters = computed(() => !!(this.nameFilter() || this.descriptionFilter()));

  private readonly nameFilter = signal('');
  private readonly descriptionFilter = signal('');

  ngOnInit(): void {
    this.load();

    this.filterForm.valueChanges.pipe(debounceTime(350), distinctUntilChanged((a, b) => a.name === b.name && a.description === b.description)).subscribe(({ name, description }) => {
      this.nameFilter.set(name?.trim() ?? '');
      this.descriptionFilter.set(description?.trim() ?? '');
      this.page.set(0);
      this.load();
    });
  }

  clearFilters(): void {
    this.filterForm.reset({ name: '', description: '' });
  }

  refresh(): void {
    this.load();
  }

  previousPage(): void {
    if (this.page() > 0) {
      this.page.update((p) => p - 1);
      this.load();
    }
  }

  nextPage(): void {
    if (this.page() + 1 < this.totalPages()) {
      this.page.update((p) => p + 1);
      this.load();
    }
  }

  onPageSizeChange(value: string): void {
    this.pageSize.set(Number(value) || 5);
    this.page.set(0);
    this.load();
  }

  openCreateModal(): void {
    this.createForm.reset({ name: '', description: '' });
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
      this.notifications.warning('Revise os dados', 'Informe um nome valido para o projeto.');
      return;
    }

    const { name, description } = this.createForm.getRawValue();
    this.creating.set(true);

    this.api
      .createProject({ name, description: description?.trim() ? description.trim() : null })
      .pipe(finalize(() => this.creating.set(false)))
      .subscribe({
        next: () => {
          this.showCreateModal.set(false);
          this.notifications.success('Projeto criado', `"${name}" foi criado com sucesso.`);
          this.page.set(0);
          this.load();
        },
        error: (error) => this.notifications.error('Falha ao criar projeto', getHttpErrorMessage(error))
      });
  }

  private load(): void {
    this.loading.set(true);

    this.api
      .getProjects(this.page(), this.pageSize(), undefined, this.nameFilter(), this.descriptionFilter())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.projects.set(response.content);
          this.totalElements.set(response.total_elements);
          this.totalPages.set(Math.max(1, response.total_pages));
        },
        error: (error) => this.notifications.error('Falha ao carregar projetos', getHttpErrorMessage(error))
      });
  }
}
