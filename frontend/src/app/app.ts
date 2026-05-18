import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from './shared/components/header/header.component';
import { TickerComponent } from './shared/components/ticker/ticker.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { AssistantPopupComponent } from './features/assistant/popup/assistant-popup.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, TickerComponent, FooterComponent, ToastComponent, AssistantPopupComponent],
  template: `
    <app-header />
    @if (showTicker()) {
      <app-ticker />
    }
    <router-outlet />
    @if (showFooter()) {
      <app-footer />
    }
    <app-toast />
    <app-assistant-popup />
  `
})
export class App {
  private router = inject(Router);
  private currentUrl = signal<string>(this.router.url);

  private path = computed(() => this.currentUrl().split('?')[0].split('#')[0]);

  showTicker = computed(() => true);
  showFooter = computed(() => {
    const p = this.path();
    return p === '/' || p === '/markets';
  });

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => this.currentUrl.set(e.urlAfterRedirects || e.url));
  }
}
