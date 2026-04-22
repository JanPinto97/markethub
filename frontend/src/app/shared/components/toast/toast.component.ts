import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    @if (svc.toast(); as t) {
      <div
        class="toast"
        [class.toast-success]="t.type === 'success'"
        [class.toast-error]="t.type === 'error'"
        [class.toast-info]="t.type === 'info'"
        [class.toast-visible]="t.visible"
        [class.toast-hidden]="!t.visible">
        <span class="toast-icon">
          @if (t.type === 'success') { ✅ }
          @else if (t.type === 'error') { ⚠️ }
          @else { ℹ️ }
        </span>
        <span class="toast-message">{{ t.message }}</span>
        <button class="toast-close" (click)="svc.dismiss()" aria-label="Close">×</button>
      </div>
    }
  `,
  styles: [`
    :host {
      position: fixed;
      top: var(--spacing-4, 1rem);
      right: var(--spacing-4, 1rem);
      z-index: 9999;
      pointer-events: none;
    }

    .toast {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: var(--spacing-3, 0.75rem);
      padding: var(--spacing-3, 0.75rem) var(--spacing-4, 1rem);
      background-color: var(--surface-container-lowest, #ffffff);
      border-radius: var(--radius-md, 0.75rem);
      box-shadow: var(--shadow-ambient, 0 20px 40px rgba(13, 28, 50, 0.06));
      font-family: var(--font-body, 'Inter', sans-serif);
      font-size: var(--text-body-md, 0.875rem);
      color: var(--on-surface, #191c1e);
      min-width: 260px;
      max-width: 420px;
      transform: translateX(120%);
      opacity: 0;
      transition: transform 0.2s ease, opacity 0.2s ease;
    }

    .toast-visible {
      transform: translateX(0);
      opacity: 1;
    }

    .toast-hidden {
      transform: translateX(120%);
      opacity: 0;
    }

    .toast-icon {
      flex-shrink: 0;
      font-size: var(--text-body-lg, 1rem);
    }

    .toast-message {
      flex: 1;
      min-width: 0;
      word-break: break-word;
    }

    .toast-close {
      flex-shrink: 0;
      background: none;
      border: none;
      color: var(--on-surface-variant, #44474d);
      font-size: 1.2rem;
      cursor: pointer;
      padding: 0;
      line-height: 1;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-full, 9999px);
      transition: background-color 0.15s;
    }

    .toast-close:hover {
      background-color: var(--surface-container-high, #e6e8ea);
    }
  `],
})
export class ToastComponent {
  svc = inject(ToastService);
}
