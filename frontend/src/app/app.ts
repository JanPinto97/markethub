import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { TickerComponent } from './shared/components/ticker/ticker.component';
import { ToastComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, TickerComponent, ToastComponent],
  template: `
    <app-header />
    <app-ticker />
    <router-outlet />
    <app-toast />
  `
})
export class App {}
