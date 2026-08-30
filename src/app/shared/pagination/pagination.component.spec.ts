import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  let fixture: ComponentFixture<PaginationComponent>;
  let component: PaginationComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
  });

  function setInputs(inputs: Partial<Record<'page' | 'pageSize' | 'totalElements' | 'totalPages' | 'loading', unknown>>): void {
    Object.entries(inputs).forEach(([key, value]) => fixture.componentRef.setInput(key, value));
    fixture.detectChanges();
  }

  it('should create', () => {
    setInputs({ page: 0, pageSize: 10, totalElements: 0, totalPages: 1 });
    expect(component).toBeTruthy();
  });

  it('does not render the footer when there are no elements', () => {
    setInputs({ page: 0, pageSize: 10, totalElements: 0, totalPages: 1 });
    expect(fixture.nativeElement.querySelector('footer')).toBeNull();
  });

  it('disables "Anterior" and does not emit on the first page', () => {
    setInputs({ page: 0, pageSize: 10, totalElements: 25, totalPages: 3 });

    const [previousButton] = fixture.nativeElement.querySelectorAll('button');
    expect(previousButton.disabled).toBeTrue();

    let emitted = false;
    component.pageChange.subscribe(() => (emitted = true));
    previousButton.click();

    expect(emitted).toBeFalse();
  });

  it('emits pageChange with the next page when "Proxima" is clicked', () => {
    setInputs({ page: 0, pageSize: 10, totalElements: 25, totalPages: 3 });

    const buttons: HTMLButtonElement[] = fixture.nativeElement.querySelectorAll('button');
    const nextButton = buttons[1];

    let emittedPage: number | undefined;
    component.pageChange.subscribe((page) => (emittedPage = page));
    nextButton.click();

    expect(emittedPage).toBe(1);
  });

  it('disables "Proxima" and does not emit on the last page', () => {
    setInputs({ page: 2, pageSize: 10, totalElements: 25, totalPages: 3 });

    const buttons: HTMLButtonElement[] = fixture.nativeElement.querySelectorAll('button');
    const nextButton = buttons[1];
    expect(nextButton.disabled).toBeTrue();

    let emitted = false;
    component.pageChange.subscribe(() => (emitted = true));
    nextButton.click();

    expect(emitted).toBeFalse();
  });

  it('emits pageSizeChange when the page size select changes', () => {
    setInputs({ page: 0, pageSize: 10, totalElements: 25, totalPages: 3 });

    let emittedSize: number | undefined;
    component.pageSizeChange.subscribe((size) => (emittedSize = size));

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    select.value = '50';
    select.dispatchEvent(new Event('change'));

    expect(emittedSize).toBe(50);
  });

  it('computes startItem/endItem for a middle page', () => {
    setInputs({ page: 1, pageSize: 10, totalElements: 15, totalPages: 2 });

    expect(component.startItem).toBe(11);
    expect(component.endItem).toBe(15);
  });
});
