import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

import { TaskResponse, TaskStatus } from '../core/api.service';

@Injectable()
export class TaskBoardSyncService {
  private readonly statusChanges = new Subject<{ task: TaskResponse; previousStatus: TaskStatus }>();
  readonly statusChanges$ = this.statusChanges.asObservable();

  publishStatusChange(task: TaskResponse, previousStatus: TaskStatus): void {
    if (task.status === previousStatus) {
      return;
    }

    this.statusChanges.next({ task, previousStatus });
  }
}
