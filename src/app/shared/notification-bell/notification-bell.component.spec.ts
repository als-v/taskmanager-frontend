import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';

import { NotificationResponse } from '../../core/api.service';
import { NotificationInboxService } from '../../core/notification-inbox.service';
import { NotificationBellComponent } from './notification-bell.component';

function makeNotification(overrides: Partial<NotificationResponse> = {}): NotificationResponse {
  return {
    id: 'notif-1',
    type: 'TASK_ASSIGNED',
    message: 'Uma tarefa foi atribuida a voce',
    project_id: 'project-1',
    task_id: 'task-1',
    created_by: 'user-1',
    created_at: new Date().toISOString(),
    read_at: null,
    unread: true,
    ...overrides
  };
}

describe('NotificationBellComponent', () => {
  let fixture: ComponentFixture<NotificationBellComponent>;
  let inbox: {
    items: ReturnType<typeof signal<NotificationResponse[]>>;
    unreadCount: ReturnType<typeof signal<number>>;
    loading: ReturnType<typeof signal<boolean>>;
    start: jasmine.Spy;
    stop: jasmine.Spy;
    markAsRead: jasmine.Spy;
  };
  let router: { navigate: jasmine.Spy };

  beforeEach(async () => {
    inbox = {
      items: signal<NotificationResponse[]>([]),
      unreadCount: signal(0),
      loading: signal(false),
      start: jasmine.createSpy('start'),
      stop: jasmine.createSpy('stop'),
      markAsRead: jasmine.createSpy('markAsRead')
    };
    router = { navigate: jasmine.createSpy('navigate') };

    await TestBed.configureTestingModule({
      imports: [NotificationBellComponent],
      providers: [
        { provide: NotificationInboxService, useValue: inbox },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationBellComponent);
  });

  it('should create and start polling on init', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(inbox.start).toHaveBeenCalled();
  });

  it('stops polling when destroyed', () => {
    fixture.detectChanges();
    fixture.destroy();
    expect(inbox.stop).toHaveBeenCalled();
  });

  it('shows the unread badge only when there are unread notifications', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.bell-badge')).toBeNull();

    inbox.unreadCount.set(2);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.bell-badge').textContent.trim()).toBe('2');

    inbox.unreadCount.set(15);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.bell-badge').textContent.trim()).toBe('9+');
  });

  it('toggles the panel when the bell button is clicked', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.notification-panel')).toBeNull();

    const bellButton: HTMLButtonElement = fixture.nativeElement.querySelector('.bell-button');
    bellButton.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.notification-panel')).toBeTruthy();

    bellButton.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.notification-panel')).toBeNull();
  });

  it('marks a notification as read and navigates to its project when clicked', () => {
    inbox.items.set([makeNotification({ id: 'notif-1', project_id: 'project-42' })]);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.bell-button').click();
    fixture.detectChanges();

    const item: HTMLButtonElement = fixture.nativeElement.querySelector('.notification-item');
    item.click();
    fixture.detectChanges();

    expect(inbox.markAsRead).toHaveBeenCalledWith('notif-1');
    expect(router.navigate).toHaveBeenCalledWith(['/projetos', 'project-42']);
    expect(fixture.nativeElement.querySelector('.notification-panel')).toBeNull();
  });

  it('does not navigate when the notification has no related project', () => {
    inbox.items.set([makeNotification({ id: 'notif-2', project_id: null })]);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.bell-button').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.notification-item').click();

    expect(inbox.markAsRead).toHaveBeenCalledWith('notif-2');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('maps notification types to display labels', () => {
    expect(fixture.componentInstance.typeLabel('TASK_ASSIGNED')).toBe('Tarefa atribuida');
    expect(fixture.componentInstance.typeLabel('PROJECT_ADDED')).toBe('Projeto');
  });
});
