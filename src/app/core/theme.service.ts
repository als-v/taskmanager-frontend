import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

const THEME_STORAGE_KEY = 'taskmanager.theme';
type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly themeState = signal<Theme>(readTheme());

  readonly theme = computed(() => this.themeState());
  readonly isDark = computed(() => this.themeState() === 'dark');

  constructor() {
    effect(() => {
      const theme = this.themeState();
      this.document.body.classList.toggle('theme-dark', theme === 'dark');
      this.document.body.classList.toggle('theme-light', theme === 'light');
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    });
  }

  toggleTheme(): void {
    this.themeState.update((theme) => (theme === 'dark' ? 'light' : 'dark'));
  }
}

function readTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);

  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
