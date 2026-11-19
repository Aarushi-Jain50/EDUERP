import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  CanActivateChildFn,
  CanActivateFn,
  CanMatchFn,
  Router,
  UrlSegment,
  UrlTree
} from '@angular/router';
import { Observable, map } from 'rxjs';
import { RbacRole } from '../models/user-role.model';
import { AuthSessionService } from '../services/auth-session.service';
import { CurrentUserService } from '../services/current-user.service';

function isAdminPortalPath(url: string): boolean {
  return url === '/admin' || (url.startsWith('/admin/') && !url.startsWith('/admin/secure-login'));
}

function buildReturnUrlQuery(targetUrl: string): Record<string, string> {
  if (!targetUrl || targetUrl === '/' || targetUrl === '/dashboard' || targetUrl.startsWith('/login')) {
    return {};
  }
  return { returnUrl: targetUrl };
}

function evaluateAuthState(targetUrl: string): Observable<boolean | UrlTree> | boolean | UrlTree {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const userService = inject(CurrentUserService);
  const authSession = inject(AuthSessionService);
  const router = inject(Router);

  const hasSession = userService.hasStoredSession();

  if (isAdminPortalPath(targetUrl)) {
    if (hasSession) {
      const storedRole = userService.syncFromStorage();
      if (storedRole !== 'admin' && storedRole !== 'superadmin') {
        // User is authenticated as a non-admin role; allow roleGuard to enforce /access-denied.
        return true;
      }
    }

    return authSession.verifyAdminSession().pipe(
      map(res => {
        if (res.valid && res.user?.role === RbacRole.ADMIN) {
          userService.loginAs(res.user.isSuperAdmin ? 'superadmin' : 'admin', res.user.email);
          return true;
        }

        userService.logout();
        const queryParams: Record<string, string> = {};
        if (res.reason === 'expired') {
          queryParams['reason'] = 'session_expired';
        }
        if (targetUrl && targetUrl !== '/admin' && targetUrl !== '/admin/dashboard') {
          queryParams['returnUrl'] = targetUrl;
        }
        return router.createUrlTree(['/admin/secure-login'], { queryParams });
      })
    );
  }

  if (!hasSession) {
    return router.createUrlTree(['/login'], {
      queryParams: buildReturnUrlQuery(targetUrl)
    });
  }

  const currentRole = userService.syncFromStorage();
  if (currentRole === 'admin' || currentRole === 'superadmin') {
    return authSession.verifyAdminSession().pipe(
      map(res => {
        if (res.valid && res.user?.role === RbacRole.ADMIN) {
          return true;
        }
        userService.logout();
        return router.createUrlTree(['/login'], {
          queryParams: buildReturnUrlQuery(targetUrl)
        });
      })
    );
  }

  return true;
}

/**
 * Protects routes so only users in a valid authenticated state can activate them.
 * Unauthenticated requests are redirected to `/login` (or `/admin/secure-login` for admin paths)
 * with a `returnUrl` query parameter.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  return evaluateAuthState(state.url);
};

/**
 * Re-verifies user authentication state on every child route transition inside protected layouts.
 */
export const authChildGuard: CanActivateChildFn = (_childRoute, state) => {
  return evaluateAuthState(state.url);
};

/**
 * Prevents matching and downloading lazy-loaded portal feature bundles when unauthenticated.
 */
export const authMatchGuard: CanMatchFn = (_route, segments: UrlSegment[]) => {
  const path = '/' + segments.map(segment => segment.path).join('/');
  return evaluateAuthState(path);
};

/**
 * Restricts public auth entry routes (`/login`, `/register`) to unauthenticated visitors.
 * Already-authenticated users are redirected directly to their authorized portal home.
 */
export const guestGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const userService = inject(CurrentUserService);
  const authSession = inject(AuthSessionService);
  const router = inject(Router);

  if (!userService.hasStoredSession()) {
    return true;
  }

  const currentRole = userService.syncFromStorage();
  if (currentRole === 'admin' || currentRole === 'superadmin') {
    return authSession.verifyAdminSession().pipe(
      map(res => {
        if (res.valid && res.user?.role === RbacRole.ADMIN) {
          return router.createUrlTree(['/admin/dashboard']);
        }
        userService.logout();
        return true;
      })
    );
  }

  return router.createUrlTree([userService.getHomeRoute(currentRole)]);
};
