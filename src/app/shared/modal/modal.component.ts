import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css'
})
export class ModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() subtitle = '';
  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }
}
