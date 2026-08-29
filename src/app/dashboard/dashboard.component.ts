import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface DashboardCard {
  titulo: string;
  valor: string;
  descricao: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  readonly cards: DashboardCard[] = [
    { titulo: 'Projetos', valor: '0', descricao: 'Projetos ativos na equipe' },
    { titulo: 'Tarefas', valor: '0', descricao: 'Tarefas em andamento' },
    { titulo: 'Concluidas', valor: '0', descricao: 'Tarefas finalizadas' },
    { titulo: 'Membros', valor: '0', descricao: 'Usuarios com acesso' }
  ];
}
