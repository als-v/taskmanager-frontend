import { Routes } from '@angular/router';

import { authGuard } from './core/auth.guard';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LoginComponent } from './login/login.component';
import { RegistroComponent } from './registro/registro.component';
import { ShellComponent } from './shell/shell.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegistroComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [{ path: '', pathMatch: 'full', component: DashboardComponent }]
  },
  { path: '**', redirectTo: '' }
];
