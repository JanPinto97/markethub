import { Injectable, signal } from '@angular/core';

export interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toast = signal<Toast | null>(null);
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  show(message: string, type: 'success' | 'error' | 'info' = 'success', duration?: number): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.toast.set({ message, type, visible: true });
    const ms = duration ?? 3000;
    if (ms >= 0) {
      this.hideTimer = setTimeout(() => this.dismiss(), ms);
    }
  }

  dismiss(): void {
    const current = this.toast();
    if (!current) return;
    this.toast.set({ ...current, visible: false });
    setTimeout(() => this.toast.set(null), 200);
  }
}
