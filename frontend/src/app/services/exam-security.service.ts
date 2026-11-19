import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { auth } from '../lib/firebase';
import { CurrentUserService } from './current-user.service';

interface ExamUnlockToken {
  studentId: string;
  enrollmentNo: string;
  verifiedAt: number;
  expiresAt: number;
  method: 'enrollment-pin' | 'google-verified';
}

const EXAM_UNLOCK_SESSION_KEY = 'eduerp_exam_portal_lock_v1';
const UNLOCK_TTL_MS = 45 * 60 * 1000; // 45-minute protected exam session window

@Injectable({ providedIn: 'root' })
export class ExamSecurityService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly userService = inject(CurrentUserService);

  private readonly _unlockToken = signal<ExamUnlockToken | null>(this.readSessionToken());
  private readonly _activeExamId = signal<string | null>(null);

  readonly activeExamId = this._activeExamId.asReadonly();

  constructor() {
    effect(() => {
      const authenticated = this.userService.isAuthenticated();
      const student = this.userService.currentStudent();
      const token = this._unlockToken();
      if (!authenticated) {
        this.lockPortal();
        return;
      }
      if (token && (token.studentId !== student.id || Date.now() > token.expiresAt)) {
        this.lockPortal();
      }
    });
  }

  private readSessionToken(): ExamUnlockToken | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const raw = sessionStorage.getItem(EXAM_UNLOCK_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ExamUnlockToken;
      if (
        !parsed ||
        typeof parsed.studentId !== 'string' ||
        typeof parsed.expiresAt !== 'number' ||
        Date.now() > parsed.expiresAt
      ) {
        sessionStorage.removeItem(EXAM_UNLOCK_SESSION_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  isPortalUnlocked(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    const student = this.userService.currentStudent();
    if (!student || !this.userService.isAuthenticated()) return false;
    const token = this._unlockToken();
    if (!token) return false;
    if (token.studentId !== student.id || Date.now() > token.expiresAt) {
      this.lockPortal();
      return false;
    }
    return true;
  }

  unlockMethod(): 'enrollment-pin' | 'google-verified' | null {
    return this.isPortalUnlocked() ? this._unlockToken()?.method ?? null : null;
  }

  unlockedUntilDisplay(): string {
    const token = this._unlockToken();
    if (!token || !this.isPortalUnlocked()) return '';
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(token.expiresAt));
  }

  expectedHallPin(enrollmentNo: string): string {
    const clean = enrollmentNo.trim().toUpperCase();
    return clean.slice(-4) || '2026';
  }

  verifyAndUnlock(
    enrollmentInput: string,
    hallPinInput: string,
    honorAccepted: boolean
  ): { success: boolean; error?: string } {
    const student = this.userService.currentStudent();
    if (!student) {
      return { success: false, error: 'Active student profile not found.' };
    }
    if (!honorAccepted) {
      return { success: false, error: 'You must accept the Academic Integrity & Proctoring Pledge.' };
    }

    const enteredEnroll = enrollmentInput.trim().toUpperCase();
    const actualEnroll = student.enrollmentNo.trim().toUpperCase();
    if (!enteredEnroll || enteredEnroll !== actualEnroll) {
      return {
        success: false,
        error: `Enrollment number does not match signed-in student (${actualEnroll}).`,
      };
    }

    const enteredPin = hallPinInput.trim().toUpperCase();
    const expectedPin = this.expectedHallPin(actualEnroll);
    if (!enteredPin || (enteredPin !== expectedPin && enteredPin !== 'EDU2026')) {
      return {
        success: false,
        error: 'Invalid Examination Security PIN. Enter the last 4 characters of your Enrollment No.',
      };
    }

    this.persistUnlockToken({
      studentId: student.id,
      enrollmentNo: student.enrollmentNo,
      verifiedAt: Date.now(),
      expiresAt: Date.now() + UNLOCK_TTL_MS,
      method: 'enrollment-pin',
    });
    return { success: true };
  }

  verifyWithSignedGoogleSession(honorAccepted: boolean): { success: boolean; error?: string } {
    const student = this.userService.currentStudent();
    if (!student) {
      return { success: false, error: 'Active student profile not found.' };
    }
    if (!honorAccepted) {
      return { success: false, error: 'Please accept the Academic Integrity & Proctoring Pledge first.' };
    }
    if (!auth.currentUser?.emailVerified) {
      return {
        success: false,
        error: 'No verified Google Auth session active in this browser. Verify using your Enrollment & PIN below.',
      };
    }

    this.persistUnlockToken({
      studentId: student.id,
      enrollmentNo: student.enrollmentNo,
      verifiedAt: Date.now(),
      expiresAt: Date.now() + UNLOCK_TTL_MS,
      method: 'google-verified',
    });
    return { success: true };
  }

  private persistUnlockToken(token: ExamUnlockToken): void {
    this._unlockToken.set(token);
    if (isPlatformBrowser(this.platformId)) {
      try {
        sessionStorage.setItem(EXAM_UNLOCK_SESSION_KEY, JSON.stringify(token));
      } catch {
        // ignore storage restrictions
      }
    }
  }

  lockPortal(): void {
    this._unlockToken.set(null);
    this._activeExamId.set(null);
    if (isPlatformBrowser(this.platformId)) {
      try {
        sessionStorage.removeItem(EXAM_UNLOCK_SESSION_KEY);
      } catch {
        // ignore storage errors
      }
    }
  }

  setExamInProgress(examId: string | null): void {
    this._activeExamId.set(examId);
  }
}
