import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';
import { AvatarComponent } from '../shared/avatar/avatar.component';
import { NotificationBellComponent } from '../shared/notification-bell/notification-bell.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, AvatarComponent, NotificationBellComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css'
})
export class ShellComponent {
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly sidebarCollapsed = signal(false);
  readonly userMenuOpen = signal(false);
  readonly platformName = 'Elotech';

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.userMenuOpen.set(false);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((collapsed) => !collapsed);
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
  }

  toggleTheme(): void {
    this.theme.toggleTheme();
  }

  logout(): void {
    this.userMenuOpen.set(false);
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
