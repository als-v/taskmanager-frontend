import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './placeholder.component.html',
  styleUrl: './placeholder.component.css'
})
export class PlaceholderComponent {
  private readonly route = inject(ActivatedRoute);

  readonly title = (this.route.snapshot.data['title'] as string) ?? 'Pagina';
  readonly description = this.route.snapshot.data['description'] as string;
}
