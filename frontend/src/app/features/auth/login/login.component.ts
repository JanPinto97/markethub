import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <h1>Login</h1>
    <form (ngSubmit)="submit()">
      <label>
        Email
        <input type="email" name="email" [(ngModel)]="email" required />
      </label>
      <label>
        Password
        <input type="password" name="password" [(ngModel)]="password" required />
      </label>
      <button type="submit" [disabled]="loading()">Log in</button>
    </form>
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    <p>No account? <a routerLink="/register">Register</a></p>
  `
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  error = signal<string | null>(null);
  loading = signal(false);

  submit() {
    this.error.set(null);
    this.loading.set(true);
    this.auth.login(this.email, this.password).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/markets']); },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Login failed');
      }
    });
  }
}
