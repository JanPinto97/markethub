import { Injectable, computed, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, map, switchMap, catchError } from 'rxjs';
import { User } from '../models/user.model';
import { environment } from '../../../environments/environment';

interface AuthResponse { success: boolean; accessToken: string; user: User; }
interface RefreshResponse { success: boolean; accessToken: string; }
interface MeResponse { success: boolean; user: User; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;
  private accessToken: string | null = null;

  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  getToken(): string | null { return this.accessToken; }
  setToken(token: string | null): void { this.accessToken = token; }

  loginWithGoogle(): void {
    window.location.href = `${this.baseUrl}/auth/google`;
  }

  finalizeOAuthLogin(token: string): Observable<User | null> {
    this.accessToken = token;
    return this.http.get<MeResponse>(`${this.baseUrl}/auth/me`).pipe(
      tap(res => this.currentUser.set(res.user)),
      map(res => res.user),
      catchError(() => { this.accessToken = null; this.currentUser.set(null); return of(null); })
    );
  }

  updateCurrentUser(patch: Partial<User>): void {
    const current = this.currentUser();
    if (!current) return;
    this.currentUser.set({ ...current, ...patch });
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, { email, password }, { withCredentials: true })
      .pipe(tap(res => { this.accessToken = res.accessToken; this.currentUser.set(res.user); }));
  }

  register(username: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/register`, { username, email, password }, { withCredentials: true })
      .pipe(tap(res => { this.accessToken = res.accessToken; this.currentUser.set(res.user); }));
  }

  logout(): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(tap(() => { this.accessToken = null; this.currentUser.set(null); }));
  }

  refreshToken(): Observable<string> {
    return this.http.post<RefreshResponse>(`${this.baseUrl}/auth/refresh`, {}, { withCredentials: true })
      .pipe(tap(res => { this.accessToken = res.accessToken; }), map(res => res.accessToken));
  }

  loadCurrentUser(): Observable<User | null> {
    return this.refreshToken().pipe(
      switchMap(() => this.http.get<MeResponse>(`${this.baseUrl}/auth/me`)),
      tap(res => this.currentUser.set(res.user)),
      map(res => res.user),
      catchError(() => { this.accessToken = null; this.currentUser.set(null); return of(null); })
    );
  }
}
