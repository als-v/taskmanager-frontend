import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  ApiService,
  DashboardProjectResponse,
  DashboardResponse,
  DashboardWipItemResponse,
  TaskPriority,
  TaskStatus
} from '../core/api.service';
import { getHttpErrorMessage } from '../core/http-error-message';
import { NotificationService } from '../core/notification.service';
import { AvatarComponent } from '../shared/avatar/avatar.component';

const WIP_PAGE_SIZE = 8;
const WIP_SCROLL_THRESHOLD_PX = 80;

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'A fazer',
  IN_PROGRESS: 'Em andamento',
  DONE: 'Concluido'
};

const STATUS_ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Critica'
};

const PRIORITY_ORDER: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

interface BreakdownRow {
  key: string;
  label: string;
  total: number;
  percent: number;
}

interface StatCard {
  titulo: string;
  valor: string;
  alerta?: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, AvatarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly dashboard = signal<DashboardResponse | null>(null);
  readonly wip = signal<DashboardWipItemResponse[]>([]);
  readonly wipVisibleCount = signal(WIP_PAGE_SIZE);
  readonly selectedProjectId = signal<string | null>(null);

  readonly selectedProject = computed<DashboardProjectResponse | null>(() => {
    const id = this.selectedProjectId();
    if (!id) {
      return null;
    }
    return this.dashboard()?.projects.find((project) => project.id === id) ?? null;
  });

  readonly statCards = computed<StatCard[]>(() => {
    const data = this.dashboard();
    if (!data) {
      return [];
    }

    return [
      { titulo: 'Total Projetos', valor: String(data.projects_total)},
      { titulo: 'Total Tarefas', valor: String(data.tasks_total)},
      { titulo: 'Total Concluidas', valor: String(data.by_status.DONE ?? 0) },
      { titulo: 'Em andamento', valor: String(data.by_status.IN_PROGRESS ?? 0) },
      {
        titulo: 'Atrasadas',
        valor: String(data.overdue),
        alerta: data.overdue > 0
      },
      { titulo: 'Total expirando em 7 dias', valor: String(data.due_soon)}
    ];
  });

  readonly statusBreakdown = computed<BreakdownRow[]>(() => this.buildBreakdown(this.dashboard()?.by_status, STATUS_ORDER, STATUS_LABELS));

  readonly priorityBreakdown = computed<BreakdownRow[]>(() =>
    this.buildBreakdown(this.dashboard()?.by_priority, PRIORITY_ORDER, PRIORITY_LABELS)
  );

  readonly sortedWip = computed<DashboardWipItemResponse[]>(() => [...this.wip()].sort((a, b) => b.in_progress - a.in_progress));

  readonly visibleWip = computed<DashboardWipItemResponse[]>(() => this.sortedWip().slice(0, this.wipVisibleCount()));

  readonly hasMoreWip = computed(() => this.wipVisibleCount() < this.sortedWip().length);

  ngOnInit(): void {
    const projectId = this.route.snapshot.queryParamMap.get('project_id');
    this.selectedProjectId.set(projectId);
    this.load();
  }

  selectProject(id: string | null): void {
    if (this.selectedProjectId() === id) {
      return;
    }

    this.selectedProjectId.set(id);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { project_id: id },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
    this.load();
  }

  clearProject(): void {
    this.selectProject(null);
  }

  onWipScroll(event: Event): void {
    if (!this.hasMoreWip()) {
      return;
    }

    const element = event.target as HTMLElement;
    const reachedBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - WIP_SCROLL_THRESHOLD_PX;
    if (reachedBottom) {
      this.wipVisibleCount.update((count) => Math.min(count + WIP_PAGE_SIZE, this.sortedWip().length));
    }
  }

  private load(): void {
    this.loading.set(true);
    const projectId = this.selectedProjectId() ?? undefined;

    this.api
      .getDashboard(projectId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.dashboard.set(response),
        error: (error) => this.notifications.error('Falha ao carregar dashboard', getHttpErrorMessage(error))
      });

    this.api.getDashboardWip(projectId).subscribe({
      next: (response) => {
        this.wipVisibleCount.set(WIP_PAGE_SIZE);
        this.wip.set(response.items);
      },
      error: (error) => this.notifications.error('Falha ao carregar responsaveis', getHttpErrorMessage(error))
    });
  }

  private buildBreakdown<K extends string>(
    counts: Record<K, number> | undefined,
    order: K[],
    labels: Record<K, string>
  ): BreakdownRow[] {
    if (!counts) {
      return [];
    }

    const total = order.reduce((sum, key) => sum + (counts[key] ?? 0), 0);

    return order.map((key) => {
      const value = counts[key] ?? 0;
      return {
        key,
        label: labels[key],
        total: value,
        percent: total > 0 ? Math.round((value / total) * 100) : 0
      };
    });
  }
}
