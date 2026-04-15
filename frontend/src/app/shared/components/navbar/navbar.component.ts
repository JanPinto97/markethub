import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav>
      <a routerLink="/">Home</a>
      <a routerLink="/markets">Markets</a>
      <a routerLink="/community">Community</a>

      @if (auth.isAuthenticated()) {
        <span>
          <img [src]="auth.currentUser()?.avatar || 'https://via.placeholder.com/24'" alt="" width="24" height="24" />
          {{ auth.currentUser()?.username }}
        </span>
        <button type="button" (click)="logout()">Logout</button>
      } @else {
        <a routerLink="/login">Login</a>
        <a routerLink="/register">Register</a>
      }
    </nav>
  `
})
export class NavbarComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  logout() {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/']),
      error: () => this.router.navigate(['/'])
    });
  }
}
