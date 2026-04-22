import { Component } from '@angular/core';

@Component({
  selector: 'app-post-skeleton',
  standalone: true,
  template: `
    <div class="sk-card">
      <div class="sk-header">
        <div class="sk-circle"></div>
        <div class="sk-header-lines">
          <div class="sk-line sk-w50"></div>
          <div class="sk-line sk-w30"></div>
        </div>
      </div>
      <div class="sk-body">
        <div class="sk-line sk-w90"></div>
        <div class="sk-line sk-w70"></div>
      </div>
      <div class="sk-footer">
        <div class="sk-line sk-w20"></div>
        <div class="sk-line sk-w20"></div>
      </div>
    </div>
  `,
  styles: [`
    .sk-card {
      background-color: var(--surface-container-lowest);
      border-radius: var(--radius-md);
      padding: var(--spacing-4);
      margin-bottom: var(--spacing-4);
    }

    .sk-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-3);
      margin-bottom: var(--spacing-4);
    }

    .sk-circle {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-full);
      flex-shrink: 0;
    }

    .sk-header-lines {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-2);
    }

    .sk-body {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-2);
      margin-bottom: var(--spacing-4);
    }

    .sk-footer {
      display: flex;
      gap: var(--spacing-6);
    }

    .sk-line {
      height: 14px;
      border-radius: var(--radius-sm);
    }

    .sk-w90 { width: 90%; }
    .sk-w70 { width: 70%; }
    .sk-w50 { width: 50%; }
    .sk-w30 { width: 30%; }
    .sk-w20 { width: 20%; }

    .sk-circle,
    .sk-line {
      background: linear-gradient(
        90deg,
        var(--surface-container) 0%,
        var(--surface-container-high) 50%,
        var(--surface-container) 100%
      );
      background-size: 800px 100%;
      animation: shimmer 1.4s ease-in-out infinite;
    }

    @keyframes shimmer {
      0% { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
  `],
})
export class PostSkeletonComponent {}
