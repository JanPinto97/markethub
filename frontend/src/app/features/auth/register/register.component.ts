import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <h1>Register</h1>
    <form (ngSubmit)="submit()">
      <label>
        Username
        <input name="username" [(ngModel)]="username" required />
      </label>
      <label>
        Email
        <input type="email" name="email" [(ngModel)]="email" required />
      </label>
      <label>
        Password
        <input type="password" name="password" [(ngModel)]="password" required />
      </label>
      <button type="submit" [disabled]="loading()">Create account</button>
    </form>
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    <p>Already have an account? <a routerLink="/login">Login</a></p>
  `
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  email = '';
  password = '';
  error = signal<string | null>(null);
  loading = signal(false);

  submit() {
    this.error.set(null);
    if (this.username.length < 3 || this.username.length > 30) {
      this.error.set('Username must be 3-30 characters'); return;
    }
    if (!EMAIL_RE.test(this.email)) {
      this.error.set('Invalid email'); return;
    }
    if (this.password.length < 8) {
      this.error.set('Password must be at least 8 characters'); return;
    }
    this.loading.set(true);
    this.auth.register(this.username, this.email, this.password).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/markets']); },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Registration failed');
      }
    });
  }
}
