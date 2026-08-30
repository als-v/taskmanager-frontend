import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { NotificationResponse, NotificationType } from '../../core/api.service';
import { NotificationInboxService } from '../../core/notification-inbox.service';

const TYPE_LABELS: Record<NotificationType, string> = {
  TASK_ASSIGNED: 'Tarefa atribuida',
  PROJECT_ADDED: 'Projeto'
};

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.css'
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  readonly inbox = inject(NotificationInboxService);
  readonly open = signal(false);

  ngOnInit(): void {
    this.inbox.start();
  }

  ngOnDestroy(): void {
    this.inbox.stop();
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.open.set(false);
  }

  toggle(): void {
    this.open.update((open) => !open);
  }

  onItemClick(item: NotificationResponse): void {
    this.inbox.markAsRead(item.id);
    this.open.set(false);

    if (item.project_id) {
      void this.router.navigate(['/projetos', item.project_id]);
    }
  }

  typeLabel(type: NotificationType): string {
    return TYPE_LABELS[type] ?? type;
  }

  relativeTime(createdAt: string): string {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const diffMinutes = Math.round(diffMs / 60_000);

    if (diffMinutes < 1) {
      return 'agora';
    }
    if (diffMinutes < 60) {
      return `ha ${diffMinutes} min`;
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return `ha ${diffHours} h`;
    }

    const diffDays = Math.round(diffHours / 24);
    return `ha ${diffDays} d`;
  }
}
