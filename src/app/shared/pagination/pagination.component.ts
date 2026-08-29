import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.css'
})
export class PaginationComponent {
  @Input({ required: true }) page = 0; // 0-based
  @Input({ required: true }) pageSize = 10;
  @Input() pageSizeOptions: number[] = [10, 25, 50, 100];
  @Input({ required: true }) totalElements = 0;
  @Input({ required: true }) totalPages = 1;
  @Input() loading = false;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get startItem(): number {
    return this.totalElements === 0 ? 0 : this.page * this.pageSize + 1;
  }

  get endItem(): number {
    return Math.min((this.page + 1) * this.pageSize, this.totalElements);
  }

  previousPage(): void {
    if (this.page > 0) {
      this.pageChange.emit(this.page - 1);
    }
  }

  nextPage(): void {
    if (this.page + 1 < this.totalPages) {
      this.pageChange.emit(this.page + 1);
    }
  }

  onPageSizeChange(value: string): void {
    this.pageSizeChange.emit(Number(value) || this.pageSizeOptions[0]);
  }
}
