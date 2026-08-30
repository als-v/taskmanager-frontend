import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationService } from '../core/notification.service';
import { ToastContainerComponent } from './toast-container.component';

describe('ToastContainerComponent', () => {
  let fixture: ComponentFixture<ToastContainerComponent>;
  let notifications: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastContainerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ToastContainerComponent);
    notifications = TestBed.inject(NotificationService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders nothing when there are no toasts', () => {
    expect(fixture.nativeElement.querySelectorAll('.toast').length).toBe(0);
  });

  it('renders a toast with title and message when the toast service emits one', () => {
    notifications.success('Titulo', 'Mensagem');
    fixture.detectChanges();

    const toast: HTMLElement = fixture.nativeElement.querySelector('.toast');
    expect(toast).toBeTruthy();
    expect(toast.classList).toContain('success');
    expect(toast.querySelector('strong')?.textContent).toBe('Titulo');
    expect(toast.querySelector('p')?.textContent).toBe('Mensagem');
  });

  it('removes the toast from the DOM when its close button is clicked', () => {
    notifications.error('Falha');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.toast').length).toBe(1);

    const closeButton: HTMLButtonElement = fixture.nativeElement.querySelector('button[aria-label="Fechar notificacao"]');
    closeButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.toast').length).toBe(0);
  });
});
