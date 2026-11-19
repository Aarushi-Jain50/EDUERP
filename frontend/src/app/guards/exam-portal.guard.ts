import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { CurrentUserService } from '../services/current-user.service';
import { ExamSecurityService } from '../services/exam-security.service';

export interface ExamLockAwareComponent {
  canLeaveExam: () => boolean | Promise<boolean>;
}

/**
 * Strictly enforces student session + verified exam portal lock on live exam endpoints.
 * Deep links to `/student/exams/:examId/live` are blocked unless the Exam Portal gate
 * has been unlocked for the active browser session.
 */
export const examPortalGuard: CanActivateFn = (_route, state) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const userService = inject(CurrentUserService);
  const examSecurity = inject(ExamSecurityService);
  const router = inject(Router);

  if (!userService.hasStoredSession()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  const role = userService.syncFromStorage();
  if (role !== 'student') {
    return router.createUrlTree(['/access-denied'], { queryParams: { from: state.url } });
  }

  const isLiveExamRoute = state.url.includes('/live');
  if (isLiveExamRoute && !examSecurity.isPortalUnlocked()) {
    return router.createUrlTree(['/student/exams'], { queryParams: { locked: '1' } });
  }

  return true;
};

/**
 * Prevents accidental navigation away while an online proctored exam is actively running.
 */
export const examInProgressGuard: CanDeactivateFn<ExamLockAwareComponent> = (component) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return true;
  }
  return component.canLeaveExam();
};
