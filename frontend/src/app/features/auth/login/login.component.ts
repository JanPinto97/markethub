import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = '';
  password = '';
  showPassword = signal(false);
  error = signal<string | null>(null);
  loading = signal(false);
  sessionExpired = signal(false);

  ngOnInit() {
    const reason = this.route.snapshot.queryParams['reason'];
    if (reason === 'session_expired') {
      this.sessionExpired.set(true);
    }
  }

  togglePassword() {
    this.showPassword.update(v => !v);
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
