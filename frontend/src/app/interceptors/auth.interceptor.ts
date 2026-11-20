import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
// import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthSessionService } from '../services/auth-session.service';

const PUBLIC_AUTH_PATHS = [
  '/api/v1/auth/admin/login',
  '/api/v1/auth/admin/firebase-login',
  '/api/v1/auth/admin/verify-2fa',
  '/api/v1/auth/admin/resend-2fa',
  '/api/v1/auth/admin/forgot-password',
  '/api/v1/auth/admin/reset-password',
  '/api/v1/auth/register',
  '/api/v1/auth/firebase-sync',
  '/api/v1/auth/session'
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const authSession = inject(AuthSessionService);
  // const router = inject(Router);

  let outReq = req;
  if (req.url.startsWith('/api')) {
    const token = authSession.getBearerToken();
    outReq = req.clone({
      withCredentials: true,
      setHeaders: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }

  return next(outReq).pipe(
    catchError((error: unknown) => {
      if (
        isPlatformBrowser(platformId) &&
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        req.url.startsWith('/api') &&
        !PUBLIC_AUTH_PATHS.some(path => req.url.startsWith(path))
      ) {
        authSession.clearToken();
        // Temporarily commented out while Admin Portal hard authentication is disabled:
        // if (router.url.startsWith('/admin') && !router.url.startsWith('/admin/secure-login')) {
        //   router.navigate(['/admin/secure-login'], { queryParams: { reason: 'session_expired' } });
        // }
      }
      return throwError(() => error);
    })
  );
};
