import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from './shared/components/header/header.component';
import { TickerComponent } from './shared/components/ticker/ticker.component';
import { ToastComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, TickerComponent, ToastComponent],
  template: `
    @if (showGlobalChrome()) {
      <app-header />
      <app-ticker />
    }
    <router-outlet />
    <app-toast />
  `
})
export class App {
  private router = inject(Router);
  private currentUrl = signal<string>(this.router.url);

  showGlobalChrome = computed(() => {
    const url = this.currentUrl().split('?')[0].split('#')[0];
    return url !== '/' && url !== '';
  });

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => this.currentUrl.set(e.urlAfterRedirects || e.url));
  }
}
