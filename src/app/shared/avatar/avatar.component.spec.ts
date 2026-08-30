import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvatarComponent } from './avatar.component';

describe('AvatarComponent', () => {
  let fixture: ComponentFixture<AvatarComponent>;
  let component: AvatarComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvatarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AvatarComponent);
    component = fixture.componentInstance;
  });

  function setName(name: string): void {
    fixture.componentRef.setInput('name', name);
    fixture.detectChanges();
  }

  it('should create', () => {
    setName('Ana');
    expect(component).toBeTruthy();
  });

  it('shows "?" when the name is empty', () => {
    setName('');
    expect(component.initials).toBe('?');
    expect(fixture.nativeElement.querySelector('.app-avatar').textContent.trim()).toBe('?');
  });

  it('shows a single uppercase letter for a one-word name', () => {
    setName('ana');
    expect(component.initials).toBe('A');
  });

  it('shows the first and last initials for a multi-word name', () => {
    setName('Ana Silva');
    expect(component.initials).toBe('AS');
  });

  it('applies the size modifier classes', () => {
    setName('Ana Silva');

    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();
    let span: HTMLElement = fixture.nativeElement.querySelector('.app-avatar');
    expect(span.classList).toContain('app-avatar-sm');
    expect(span.classList).not.toContain('app-avatar-lg');

    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();
    span = fixture.nativeElement.querySelector('.app-avatar');
    expect(span.classList).toContain('app-avatar-lg');
    expect(span.classList).not.toContain('app-avatar-sm');
  });
});
