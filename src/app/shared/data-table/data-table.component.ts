import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

export interface DataTableSelectOption {
  value: string;
  label: string;
}

export interface DataTableColumn {
  key: string;
  label: string;
  type?: 'text' | 'status' | 'select' | 'badge';
  options?: DataTableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
}

export interface DataTableAction {
  key: string;
  label: string;
  labelKey?: string;
  tone?: 'default' | 'danger';
}

export interface TableActionEvent<T extends Record<string, unknown> = Record<string, unknown>> {
  action: string;
  row: T;
}

export interface TableSelectEvent<T extends Record<string, unknown> = Record<string, unknown>> {
  key: string;
  value: string;
  row: T;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.css'
})
export class DataTableComponent {
  private readonly _rows = signal<Record<string, unknown>[]>([]);
  private readonly _pageSize = signal(10);

  readonly page = signal(1);
  readonly openMenuRow = signal<number | null>(null);
  readonly pageSizeOptions = [10, 25, 50, 100];

  @Input({ required: true })
  set rows(value: Record<string, unknown>[]) {
    this._rows.set(value ?? []);
    this.page.set(1);
    this.openMenuRow.set(null);
  }

  get rows(): Record<string, unknown>[] {
    return this._rows();
  }

  @Input()
  set pageSize(value: number) {
    this._pageSize.set(clampPageSize(value));
  }

  get pageSize(): number {
    return this._pageSize();
  }

  @Input() columns: DataTableColumn[] = [];
  @Input() actions: DataTableAction[] = [];
  @Input() loading = false;
  @Input() emptyMessage = 'Nenhum registro encontrado.';

  @Output() action = new EventEmitter<TableActionEvent>();
  @Output() selectChange = new EventEmitter<TableSelectEvent>();

  readonly totalItems = computed(() => this._rows().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this._pageSize())));
  readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));
  readonly visibleRows = computed(() => {
    const pageSize = this._pageSize();
    const start = (this.currentPage() - 1) * pageSize;
    return this._rows().slice(start, start + pageSize);
  });
  readonly startItem = computed(() => (this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this._pageSize() + 1));
  readonly endItem = computed(() => Math.min(this.currentPage() * this._pageSize(), this.totalItems()));

  cellValue(row: Record<string, unknown>, key: string): string {
    const value = row[key];
    return value === null || value === undefined || value === '' ? '-' : String(value);
  }

  selectValue(row: Record<string, unknown>, key: string): string {
    return String(row[key] ?? '');
  }

  badgeClass(row: Record<string, unknown>, key: string): string {
    return 'badge-' + this.normalize(row[key]);
  }

  isActiveValue(row: Record<string, unknown>, key: string): boolean {
    const value = row[key];
    return value === true || value === 1 || value === '1' || String(value ?? '').toLowerCase() === 'true';
  }

  normalize(value: unknown): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/s+/g, '-');
  }

  toggleActions(rowIndex: number): void {
    this.openMenuRow.update((current) => (current === rowIndex ? null : rowIndex));
  }

  actionLabel(action: DataTableAction, row: Record<string, unknown>): string {
    const dynamicLabel = action.labelKey ? row[action.labelKey] : null;
    return typeof dynamicLabel === 'string' && dynamicLabel.trim() ? dynamicLabel : action.label;
  }

  runAction(action: DataTableAction, row: Record<string, unknown>): void {
    this.openMenuRow.set(null);
    this.action.emit({ action: action.key, row });
  }

  onSelectChange(row: Record<string, unknown>, key: string, value: string): void {
    this.selectChange.emit({ key, value, row });
  }

  onPageSizeChange(value: string): void {
    this._pageSize.set(clampPageSize(Number(value)));
    this.page.set(1);
    this.openMenuRow.set(null);
  }

  previousPage(): void {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
    }
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) {
      this.page.update((p) => p + 1);
    }
  }
}

function clampPageSize(value: number): number {
  const parsed = Number(value) || 10;
  return Math.min(100, Math.max(1, parsed));
}
