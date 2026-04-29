import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { getUsernameColor, getInitial } from '../../utils/color.utils';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, MediaUrlPipe],
  template: `
    <nav>
      <a routerLink="/">Home</a>
      <a routerLink="/markets">Markets</a>
      <a routerLink="/community">Community</a>

      @if (auth.isAuthenticated()) {
        <span class="nav-user">
          @if (auth.currentUser()?.avatar) {
            <img [src]="auth.currentUser()!.avatar | mediaUrl" alt="" width="24" height="24" style="border-radius: 50%; object-fit: cover;" />
          } @else {
            <span class="nav-avatar-initial" [style.background-color]="getUsernameColor(auth.currentUser()?.username || '')" style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;color:#fff;font-size:12px;font-weight:700;">
              {{ getInitial(auth.currentUser()?.username || '') }}
            </span>
          }
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

  getUsernameColor = getUsernameColor;
  getInitial = getInitial;

  logout() {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/']),
      error: () => this.router.navigate(['/'])
    });
  }
}
