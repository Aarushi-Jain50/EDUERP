import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthSessionService } from '../../services/auth-session.service';
import { CurrentUserService } from '../../services/current-user.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-access-denied',
  imports: [RouterLink, MatIconModule],
  host: {
    class: 'block min-h-screen'
  },
  template: `
    <div class="min-h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC] text-slate-900 px-4 py-12">
      <div class="w-full max-w-lg bg-white rounded-2xl border border-slate-200/90 shadow-xs p-8 space-y-6">
        <div class="flex items-start gap-4 pb-5 border-b border-slate-200/90">
          <div class="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
            <mat-icon class="text-2xl">gpp_maybe</mat-icon>
          </div>
          <div>
            <h1
              class="text-2xl font-bold tracking-tight text-slate-900"
              style="font-family: 'Plus Jakarta Sans', sans-serif;"
            >
              Access Denied
            </h1>
            <p class="text-[13px] text-slate-500 mt-1 leading-relaxed">
              Your current account does not hold the required authorization to view the requested portal route.
            </p>
          </div>
        </div>

        <div class="space-y-2 text-xs text-slate-500">
          <div class="flex items-center justify-between py-2 border-b border-slate-200/80">
            <span>Active Session Role</span>
            <span class="font-semibold text-slate-900 uppercase">{{ activeRoleLabel() }}</span>
          </div>
          <div class="flex items-center justify-between py-2">
            <span>Protection Policy</span>
            <span class="font-semibold text-slate-900">Role-Based Access Control (RBAC)</span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            (click)="goToAuthorizedPortal()"
            class="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <mat-icon class="text-base">dashboard</mat-icon>
            <span>Return to Authorized Dashboard</span>
          </button>

          @if (isSignedIn()) {
            <button
              type="button"
              (click)="switchAccount()"
              class="py-2.5 px-4 rounded-xl border border-slate-200/90 bg-white hover:border-indigo-600 text-xs font-semibold text-slate-900 transition-colors whitespace-nowrap cursor-pointer"
            >
              Switch Account
            </button>
          } @else {
            <a
              routerLink="/login"
              class="py-2.5 px-4 rounded-xl border border-slate-200/90 bg-white hover:border-indigo-600 text-xs font-semibold text-slate-900 transition-colors whitespace-nowrap"
            >
              Sign In Page
            </a>
          }
        </div>
      </div>
    </div>
  `
})
export class AccessDeniedPage {
  private readonly router = inject(Router);
  private readonly authSession = inject(AuthSessionService);
  private readonly userService = inject(CurrentUserService);

  protected readonly isSignedIn = this.userService.isAuthenticated;

  protected readonly activeRoleLabel = computed(() => {
    if (!this.isSignedIn()) {
      return 'Unauthenticated';
    }
    return this.userService.role();
  });

  constructor() {
    this.userService.hasStoredSession();
  }

  protected goToAuthorizedPortal(): void {
    if (!this.userService.hasStoredSession()) {
      this.router.navigate(['/login']);
      return;
    }
    const role = this.userService.syncFromStorage();
    if (role === 'admin' || role === 'superadmin') {
      this.router.navigate(['/admin/dashboard']);
      return;
    }
    this.router.navigate([this.userService.getHomeRoute(role)]);
  }

  protected switchAccount(): void {
    const role = this.userService.syncFromStorage();
    if (role === 'admin' || role === 'superadmin') {
      this.authSession.logoutBackend().subscribe(() => {
        this.userService.logout();
        this.router.navigate(['/login']);
      });
      return;
    }
    this.userService.logout();
    this.router.navigate(['/login']);
  }
}
