import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
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
    @if (sessionExpired()) {
      <p class="session-expired-msg" role="status">Your session expired. Please sign in to continue.</p>
    }
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    <p>No account? <a routerLink="/register">Register</a></p>
  `,
  styles: [`
    .session-expired-msg {
      color: var(--on-surface-variant, #44474d);
      background-color: var(--surface-container-low, #f2f4f6);
      padding: var(--spacing-3, 0.75rem) var(--spacing-4, 1rem);
      border-radius: var(--radius-default, 0.5rem);
      font-size: var(--text-body-md, 0.875rem);
      margin-top: var(--spacing-3, 0.75rem);
    }
  `]
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = '';
  password = '';
  error = signal<string | null>(null);
  loading = signal(false);
  sessionExpired = signal(false);

  ngOnInit() {
    const reason = this.route.snapshot.queryParams['reason'];
    if (reason === 'session_expired') {
      this.sessionExpired.set(true);
    }
  }

  submit() {
    this.error.set(null);
    this.sessionExpired.set(false);
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
