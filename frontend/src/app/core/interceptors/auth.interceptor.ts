import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { environment } from '../../../environments/environment';

function addToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  if (!token) return req;
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function isInternal(url: string): boolean {
  return url.startsWith('/api/') || (environment.apiOrigin ? url.startsWith(environment.apiOrigin) : true);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isInternal(req.url)) return next(req);

  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const isAuthEndpoint = req.url.includes('/auth/login')
    || req.url.includes('/auth/register')
    || req.url.includes('/auth/refresh')
    || req.url.includes('/auth/logout');

  const authed = addToken(req, auth.getToken());

  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || isAuthEndpoint) return throwError(() => err);
      return auth.refreshToken().pipe(
        switchMap(token => next(addToken(req, token))),
        catchError(refreshErr => {
          auth.logout().subscribe({ next: () => {}, error: () => {} });
          toast.show('Your session has expired. Please sign in again.', 'error', -1);
          setTimeout(() => {
            router.navigate(['/login'], { queryParams: { reason: 'session_expired' } });
          }, 2000);
          return throwError(() => refreshErr);
        })
      );
    })
  );
};
