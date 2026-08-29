import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../core/auth.service';
import { getHttpErrorMessage } from '../core/http-error-message';
import { NotificationService } from '../core/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  readonly loading = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notifications.warning('Revise os dados', 'Informe email e senha para continuar.');
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.loading.set(true);

    this.auth
      .login(email, password)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.notifications.success('Login realizado', 'Bem-vindo ao painel.');
          void this.router.navigate(['/']);
        },
        error: (error) => this.notifications.error('Falha no login', getHttpErrorMessage(error, 'Nao foi possivel entrar com essas credenciais.'))
      });
  }
}
