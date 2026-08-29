import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../core/auth.service';
import { getHttpErrorMessage, isExistingUserError } from '../core/http-error-message';
import { NotificationService } from '../core/notification.service';

const RATE_LIMIT_KEY = 'register-rate-limit';
const MAX_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

interface CaptchaChallenge {
  a: number;
  b: number;
}

interface RateLimitState {
  count: number;
  resetAt: number;
}

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.css'
})
export class RegistroComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  readonly loading = signal(false);
  readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator }
  );

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notifications.warning('Revise os dados', 'Preencha os campos obrigatorios para criar a conta.');
      return;
    }


    this.loading.set(true);
    const { name, email, password } = this.form.getRawValue();

    this.auth
      .signUp({ name, email, password })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.form.reset({
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
          });
          this.notifications.success('Conta criada', 'Agora voce pode entrar com suas credenciais.');
          this.router.navigate(['/login']);
        },
        error: (error) => {
          if (isExistingUserError(error)) {
            this.notifications.warning('Usuario ja existente', 'E-mail ja em uso.');
            return;
          }

          this.notifications.error('Falha ao criar conta', getHttpErrorMessage(error));
        }
      });
  }

}

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  return password && confirmPassword && password !== confirmPassword ? { passwordMismatch: true } : null;
}
