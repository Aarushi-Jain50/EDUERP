import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateChildFn, CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, map } from 'rxjs';
import { RbacRole } from '../models/user-role.model';
import { AuthSessionService } from '../services/auth-session.service';
import { CurrentUserService } from '../services/current-user.service';

function evaluateRoleAccess(
  allowedRoles: string[],
  targetUrl: string
): Observable<boolean | UrlTree> | boolean | UrlTree {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const userService = inject(CurrentUserService);
  const authSession = inject(AuthSessionService);
  const router = inject(Router);

  const requiresAdmin = allowedRoles.includes('admin') || allowedRoles.includes('superadmin');
  const hasSession = userService.hasStoredSession();

  if (requiresAdmin) {
    if (hasSession) {
      const storedRole = userService.syncFromStorage();
      if (storedRole !== 'admin' && storedRole !== 'superadmin') {
        return router.createUrlTree(['/access-denied'], {
          queryParams: { from: targetUrl }
        });
      }
    }

    return authSession.verifyAdminSession().pipe(
      map(res => {
        if (res.valid && res.user) {
          if (res.user.role === RbacRole.ADMIN) {
            userService.loginAs(res.user.isSuperAdmin ? 'superadmin' : 'admin', res.user.email);
            return true;
          }
          return router.createUrlTree(['/access-denied'], {
            queryParams: { from: targetUrl }
          });
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
      queryParams: targetUrl && targetUrl !== '/' ? { returnUrl: targetUrl } : {}
    });
  }

  const currentRole = userService.syncFromStorage();
  if (allowedRoles.includes(currentRole)) {
    return true;
  }

  return router.createUrlTree(['/access-denied'], {
    queryParams: { from: targetUrl }
  });
}

export function roleGuard(allowedRoles: string[]): CanActivateFn {
  return (_route, state) => evaluateRoleAccess(allowedRoles, state.url);
}

export function roleChildGuard(allowedRoles: string[]): CanActivateChildFn {
  return (_childRoute, state) => evaluateRoleAccess(allowedRoles, state.url);
}

export const dashboardRedirectGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const userService = inject(CurrentUserService);
  const authSession = inject(AuthSessionService);
  const router = inject(Router);

  if (!userService.hasStoredSession()) {
    return router.createUrlTree(['/login']);
  }

  const currentRole = userService.syncFromStorage();
  if (currentRole === 'admin' || currentRole === 'superadmin') {
    return authSession.verifyAdminSession().pipe(
      map(res => {
        if (res.valid && res.user?.role === RbacRole.ADMIN) {
          return router.createUrlTree(['/admin/dashboard']);
        }
        userService.logout();
        return router.createUrlTree(['/admin/secure-login']);
      })
    );
  }

  return router.createUrlTree([userService.getHomeRoute(currentRole)]);
};
