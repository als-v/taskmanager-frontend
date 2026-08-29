import { Routes } from '@angular/router';

import { adminGuard } from './core/admin.guard';
import { authGuard } from './core/auth.guard';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LoginComponent } from './login/login.component';
import { PlaceholderComponent } from './placeholder/placeholder.component';
import { RegistroComponent } from './registro/registro.component';
import { ShellComponent } from './shell/shell.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegistroComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', component: DashboardComponent },
      { path: 'admin', component: PlaceholderComponent, canActivate: [adminGuard], data: { title: 'Administracao', description: 'Configuracoes administrativas do sistema.' } }
    ]
  },
  { path: '**', redirectTo: '' }
];
