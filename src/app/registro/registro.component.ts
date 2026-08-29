import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../core/auth.service';
import { getHttpErrorMessage, isExistingUserError } from '../core/http-error-message';
import { ApiService, RoleOption } from '../core/api.service';
import { NotificationService } from '../core/notification.service';

const RATE_LIMIT_KEY = 'register-rate-limit';
const MAX_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_PERFIL = 'membro';

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
export class RegistroComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  readonly loading = signal(false);
  readonly perfis = signal<RoleOption[]>([]);
  readonly captcha = signal<CaptchaChallenge>(createCaptcha());
  readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    telefone: [''],
    perfil_solicitado: [DEFAULT_PERFIL, [Validators.required]],
    mensagem: [''],
    captchaAnswer: ['', [Validators.required]],
    website: ['']
  });

  ngOnInit(): void {
    this.api.listRoles().subscribe({
      next: (perfis) => this.perfis.set(perfis),
      error: () => this.perfis.set([])
    });
  }

  get captchaQuestion(): string {
    const captcha = this.captcha();
    return `${captcha.a} + ${captcha.b}`;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notifications.warning('Revise os dados', 'Preencha os campos obrigatorios para criar a conta.');
      return;
    }

    if (this.form.controls.website.value.trim()) {
      this.notifications.error('Registro bloqueado');
      return;
    }

    if (isRateLimited()) {
      this.notifications.warning('Muitas tentativas', 'Aguarde alguns minutos para enviar novamente.');
      return;
    }

    if (!this.isCaptchaValid()) {
      registerRateLimitAttempt();
      this.rotateCaptcha();
      this.notifications.warning('Resposta incorreta', 'Resolva a validacao para enviar o registro.');
      return;
    }

    this.loading.set(true);
    const { captchaAnswer: _captchaAnswer, website: _website, ...payload } = this.form.getRawValue();

    this.auth
      .register(payload)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          clearRateLimit();
          this.rotateCaptcha();
          this.form.reset({
            nome: '',
            email: '',
            telefone: '',
            perfil_solicitado: DEFAULT_PERFIL,
            mensagem: '',
            captchaAnswer: '',
            website: ''
          });
          this.notifications.success('Conta criada', 'Agora voce pode entrar com suas credenciais.');
          this.router.navigate(['/login']);
        },
        error: (error) => {
          registerRateLimitAttempt();
          this.rotateCaptcha();
          if (isExistingUserError(error)) {
            this.notifications.warning('Usuario ja existente', 'Use o login ou recupere o acesso se ja possui conta.');
            return;
          }
          this.notifications.error('Falha ao criar conta', getHttpErrorMessage(error));
        }
      });
  }

  private isCaptchaValid(): boolean {
    const captcha = this.captcha();
    const answer = Number(this.form.controls.captchaAnswer.value.trim());

    return Number.isFinite(answer) && answer === captcha.a + captcha.b;
  }

  private rotateCaptcha(): void {
    this.captcha.set(createCaptcha());
    this.form.controls.captchaAnswer.setValue('');
  }
}

function createCaptcha(): CaptchaChallenge {
  return { a: randomInt(2, 9), b: randomInt(2, 9) };
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isRateLimited(): boolean {
  const state = readRateLimitState();
  return state.count >= MAX_ATTEMPTS && Date.now() < state.resetAt;
}

function registerRateLimitAttempt(): void {
  const now = Date.now();
  const state = readRateLimitState();
  const nextState = now >= state.resetAt ? { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS } : { count: state.count + 1, resetAt: state.resetAt };

  sessionStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(nextState));
}

function clearRateLimit(): void {
  sessionStorage.removeItem(RATE_LIMIT_KEY);
}

function readRateLimitState(): RateLimitState {
  const fallback = { count: 0, resetAt: 0 };
  const raw = sessionStorage.getItem(RATE_LIMIT_KEY);

  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RateLimitState>;
    return { count: Number(parsed.count) || 0, resetAt: Number(parsed.resetAt) || 0 };
  } catch {
    sessionStorage.removeItem(RATE_LIMIT_KEY);
    return fallback;
  }
}
