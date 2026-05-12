import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  template: `
    <div style="display:flex;align-items:center;justify-content:center;min-height:60vh;flex-direction:column;gap:12px;">
      @if (error()) {
        <p style="color:#c00">{{ error() }}</p>
        <a routerLink="/login">Back to login</a>
      } @else {
        <span class="spinner" aria-hidden="true"></span>
        <p>Signing you in…</p>
      }
    </div>
  `,
})
export class OAuthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.error.set('Missing token');
      return;
    }
    this.auth.finalizeOAuthLogin(token).subscribe(user => {
      if (user) this.router.navigate(['/markets'], { replaceUrl: true });
      else this.error.set('Could not complete Google sign-in');
    });
  }
}
