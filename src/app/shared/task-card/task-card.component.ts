import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { TaskResponse } from '../../core/api.service';
import { AvatarComponent } from '../avatar/avatar.component';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule, AvatarComponent],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskCardComponent {
  @Input({ required: true }) task!: TaskResponse;
  @Output() open = new EventEmitter<void>();

  readonly priorityLabels: Record<string, string> = {
    LOW: 'Baixa',
    MEDIUM: 'Media',
    HIGH: 'Alta',
    CRITICAL: 'Critica'
  };

  get isOverdue(): boolean {
    if (!this.task.due_date || this.task.status === 'DONE') {
      return false;
    }
    
    return new Date(this.task.due_date).getTime() < Date.now();
  }
}
