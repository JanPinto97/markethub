import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav>
      <a routerLink="/">Home</a>
      <a routerLink="/markets">Markets</a>
      <a routerLink="/community">Community</a>
      <a routerLink="/login">Login</a>
      <a routerLink="/register">Register</a>
    </nav>
  `
})
export class NavbarComponent {}
