import { Routes } from '@angular/router';

import { authGuard } from './core/auth.guard';
import { BoardComponent } from './board/board.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LoginComponent } from './login/login.component';
import { ProjectLogsComponent } from './project-logs/project-logs.component';
import { ProjetosComponent } from './projetos/projetos.component';
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
      { path: 'projetos', component: ProjetosComponent },
      { path: 'projetos/:id/logs', component: ProjectLogsComponent },
      { path: 'projetos/:id', component: BoardComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
