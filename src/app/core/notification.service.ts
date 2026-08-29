import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private nextId = 1;
  readonly notifications = signal<AppNotification[]>([]);

  success(title: string, message?: string): void {
    this.show('success', title, message);
  }

  error(title: string, message?: string): void {
    this.show('error', title, message);
  }

  warning(title: string, message?: string): void {
    this.show('warning', title, message);
  }

  info(title: string, message?: string): void {
    this.show('info', title, message);
  }

  dismiss(id: number): void {
    this.notifications.update((notifications) => notifications.filter((notification) => notification.id !== id));
  }

  private show(type: NotificationType, title: string, message?: string): void {
    const notification: AppNotification = { id: this.nextId++, type, title, message };
    this.notifications.update((notifications) => [notification, ...notifications].slice(0, 4));

    window.setTimeout(() => this.dismiss(notification.id), type === 'error' ? 7000 : 4500);
  }
}
