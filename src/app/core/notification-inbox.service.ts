import { Injectable, inject, signal } from '@angular/core';
import { Subscription, switchMap, timer } from 'rxjs';

import { ApiService, NotificationResponse, NotificationType, PageResponse } from './api.service';
import { getHttpErrorMessage } from './http-error-message';
import { NotificationService } from './notification.service';

const POLL_INTERVAL_MS = 60_000;
const PAGE_SIZE = 50;

const TOAST_TITLE_BY_TYPE: Record<NotificationType, string> = {
  TASK_ASSIGNED: 'Nova tarefa atribuida',
  PROJECT_ADDED: 'Adicionado a um projeto'
};

@Injectable({ providedIn: 'root' })
export class NotificationInboxService {
  private readonly api = inject(ApiService);
  private readonly toasts = inject(NotificationService);

  readonly items = signal<NotificationResponse[]>([]);
  readonly unreadCount = signal(0);
  readonly loading = signal(false);

  private pollSubscription?: Subscription;
  private seenIds = new Set<string>();
  private baselineDone = false;

  start(): void {
    if (this.pollSubscription) {
      return;
    }

    this.loading.set(true);
    this.pollSubscription = timer(0, POLL_INTERVAL_MS)
      .pipe(switchMap(() => this.api.getNotifications(true, 0, PAGE_SIZE)))
      .subscribe({
        next: (response) => this.handlePollResult(response),
        error: () => this.loading.set(false)
      });
  }

  stop(): void {
    this.pollSubscription?.unsubscribe();
    this.pollSubscription = undefined;
    this.baselineDone = false;
    this.seenIds.clear();
  }

  markAsRead(notificationId: string): void {
    const wasUnread = this.items().some((item) => item.id === notificationId && item.unread);

    this.api.markNotificationRead(notificationId).subscribe({
      next: () => {
        this.items.update((items) => items.filter((item) => item.id !== notificationId));
        if (wasUnread) {
          this.unreadCount.update((count) => Math.max(0, count - 1));
        }
      },
      error: (error) => this.toasts.error('Falha ao marcar notificacao como lida', getHttpErrorMessage(error))
    });
  }

  private handlePollResult(response: PageResponse<NotificationResponse>): void {
    this.loading.set(false);
    this.items.set(response.content);
    this.unreadCount.set(response.total_elements);

    const currentIds = new Set(response.content.map((item) => item.id));

    if (!this.baselineDone) {
      this.seenIds = currentIds;
      this.baselineDone = true;
      return;
    }

    for (const item of response.content) {
      if (!this.seenIds.has(item.id)) {
        this.toasts.info(TOAST_TITLE_BY_TYPE[item.type] ?? 'Nova notificacao', item.message);
      }
    }

    this.seenIds = currentIds;
  }
}
