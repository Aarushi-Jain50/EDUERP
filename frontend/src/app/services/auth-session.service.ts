import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, finalize, firstValueFrom, map, of, shareReplay, tap } from 'rxjs';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { RbacRole } from '../models/user-role.model';

export interface AuthenticatedAdminUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: RbacRole;
  isSuperAdmin: boolean;
}

export interface AdminLoginStep1Response {
  success: boolean;
  requires2FA: boolean;
  challengeToken: string;
  expiresInSeconds: number;
  maskedEmail: string;
  methods: ('email_otp' | 'totp')[];
  message: string;
}

export interface AdminVerify2FAResponse {
  success: boolean;
  token: string;
  expiresAt: number;
  user: AuthenticatedAdminUser;
}

export interface SessionVerifyResult {
  valid: boolean;
  reason?: 'expired' | 'invalid' | 'missing';
  user?: AuthenticatedAdminUser;
}

export interface PublicRegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'FACULTY' | 'STUDENT' | 'PARENT';
  identifierCode?: string;
  departmentOrProgram?: string;
}

export interface PublicRegisterResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    name: string;
    username: string;
    email: string;
    role: string;
  };
}

const ADMIN_TOKEN_KEY = 'eduerp_admin_token';

@Injectable({
  providedIn: 'root'
})
export class AuthSessionService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  readonly adminUser = signal<AuthenticatedAdminUser | null>(null);
  private readonly firebaseIdToken = signal<string | null>(null);
  private inFlightVerify$: Observable<SessionVerifyResult> | null = null;

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return sessionStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY);
  }

  getBearerToken(): string | null {
    return this.firebaseIdToken() || this.getToken();
  }

  setToken(token: string, persist = false): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    if (persist) {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  }

  clearToken(): void {
    this.firebaseIdToken.set(null);
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    this.adminUser.set(null);
  }

  async signInWithGoogle(
    portalRole: 'faculty' | 'student' | 'parent'
  ): Promise<{ uid: string; email: string; name: string; role: string }> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Google Sign-In is only available in the browser.');
    }

    const credential = await signInWithPopup(auth, googleAuthProvider);
    const idToken = await credential.user.getIdToken();
    this.firebaseIdToken.set(idToken);

    const response = await firstValueFrom(
      this.http.post<{
        success: boolean;
        user: { uid: string; email: string; name: string; role: string };
      }>(
        '/api/v1/auth/firebase-sync',
        { role: portalRole.toUpperCase() },
        { headers: { Authorization: `Bearer ${idToken}` } }
      )
    );

    if (!response.success || !response.user) {
      throw new Error('Unable to complete Google Sign-In synchronization.');
    }

    return response.user;
  }

  adminLoginStep1(email: string, password: string): Observable<AdminLoginStep1Response> {
    return this.http.post<AdminLoginStep1Response>('/api/v1/auth/admin/login', {
      email,
      password
    });
  }

  adminVerify2FA(
    challengeToken: string,
    code: string,
    method: 'email_otp' | 'totp',
    persistSession = false
  ): Observable<AdminVerify2FAResponse> {
    return this.http
      .post<AdminVerify2FAResponse>('/api/v1/auth/admin/verify-2fa', {
        challengeToken,
        code,
        method
      })
      .pipe(
        tap(res => {
          if (res.success && res.token) {
            this.setToken(res.token, persistSession);
            this.adminUser.set(res.user);
          }
        })
      );
  }

  adminResend2FA(challengeToken: string): Observable<{
    success: boolean;
    challengeToken: string;
    expiresInSeconds: number;
    maskedEmail: string;
    message: string;
  }> {
    return this.http.post<{
      success: boolean;
      challengeToken: string;
      expiresInSeconds: number;
      maskedEmail: string;
      message: string;
    }>('/api/v1/auth/admin/resend-2fa', { challengeToken });
  }

  adminForgotPassword(email: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>('/api/v1/auth/admin/forgot-password', { email });
  }

  adminResetPassword(
    email: string,
    code: string,
    newPassword: string
  ): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>('/api/v1/auth/admin/reset-password', {
      email,
      code,
      newPassword
    });
  }

  verifyAdminSession(): Observable<SessionVerifyResult> {
    if (!isPlatformBrowser(this.platformId)) {
      return of({ valid: false, reason: 'missing' });
    }
    if (this.inFlightVerify$) {
      return this.inFlightVerify$;
    }

    this.inFlightVerify$ = this.http
      .get<{ success: boolean; user: AuthenticatedAdminUser }>('/api/v1/auth/session')
      .pipe(
        map(res => {
          if (res.success && res.user) {
            this.adminUser.set(res.user);
            return { valid: true, user: res.user };
          }
          return { valid: false, reason: 'invalid' as const };
        }),
        catchError((err: HttpErrorResponse) => {
          const code = (err.error as { code?: string } | null)?.code;
          this.clearToken();
          return of({
            valid: false,
            reason: code === 'TOKEN_EXPIRED' ? ('expired' as const) : ('invalid' as const)
          });
        }),
        finalize(() => {
          this.inFlightVerify$ = null;
        }),
        shareReplay(1)
      );

    return this.inFlightVerify$;
  }

  logoutBackend(): Observable<{ success: boolean }> {
    if (isPlatformBrowser(this.platformId)) {
      void signOut(auth).catch(() => undefined);
    }
    return this.http.post<{ success: boolean }>('/api/v1/auth/logout', {}).pipe(
      tap(() => this.clearToken()),
      catchError(() => {
        this.clearToken();
        return of({ success: true });
      })
    );
  }

  registerPublicUser(payload: PublicRegisterPayload): Observable<PublicRegisterResponse> {
    return this.http.post<PublicRegisterResponse>('/api/v1/auth/register', payload);
  }

  createAdminAccount(payload: {
    name: string;
    email: string;
    username: string;
    password: string;
    isSuperAdmin?: boolean;
  }): Observable<{ success: boolean; user?: AuthenticatedAdminUser; totpUri?: string; message?: string }> {
    return this.http.post<{ success: boolean; user?: AuthenticatedAdminUser; totpUri?: string; message?: string }>(
      '/api/v1/auth/admin/accounts',
      payload
    );
  }
}
