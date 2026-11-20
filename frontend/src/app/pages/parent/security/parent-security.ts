import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ParentPortalFacade } from '../shared/parent-portal.facade';

@Component({
  selector: 'app-parent-security',
  imports: [ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-slate-900 text-[13px] pb-12 min-w-0">
      
      <!-- Page Header -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[11px] font-bold uppercase tracking-wider border border-purple-200">
              Parent Security Hub
            </span>
          </div>
          <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Security & Active Sessions</h1>
          <p class="text-xs text-slate-500 mt-0.5">Manage your account credentials, login sessions, and two-factor security for guardian access.</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <mat-icon class="text-sm">verified_user</mat-icon> Account Protected
          </span>
        </div>
      </div>

      <!-- Security Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        <!-- Left: Password & Auth Settings (2 cols) -->
        <div class="lg:col-span-2 space-y-6">
          
          <!-- Change Password Card -->
          <div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
            <div class="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div class="w-10 h-10 rounded-xl bg-purple-50 text-[#6D42E8] border border-purple-100 flex items-center justify-center shrink-0">
                <mat-icon class="text-xl">lock_reset</mat-icon>
              </div>
              <div>
                <h2 class="text-sm font-bold text-slate-900">Change Account Password</h2>
                <p class="text-xs text-slate-500">Ensure your password is at least 8 characters long with numbers and symbols.</p>
              </div>
            </div>

            <form [formGroup]="passwordForm" (ngSubmit)="updatePassword()" class="space-y-4">
              <div class="space-y-1.5">
                <label for="curr-pwd" class="text-xs font-bold text-slate-700">Current Password</label>
                <input
                  id="curr-pwd"
                  type="password"
                  formControlName="currentPassword"
                  placeholder="••••••••"
                  class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#6D42E8]"
                />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label for="new-pwd" class="text-xs font-bold text-slate-700">New Password</label>
                  <input
                    id="new-pwd"
                    type="password"
                    formControlName="newPassword"
                    placeholder="••••••••"
                    class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#6D42E8]"
                  />
                </div>
                <div class="space-y-1.5">
                  <label for="conf-pwd" class="text-xs font-bold text-slate-700">Confirm New Password</label>
                  <input
                    id="conf-pwd"
                    type="password"
                    formControlName="confirmPassword"
                    placeholder="••••••••"
                    class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#6D42E8]"
                  />
                </div>
              </div>

              @if (passwordError()) {
                <div class="text-xs text-rose-700 font-semibold bg-rose-50 p-3 rounded-xl border border-rose-200 flex items-center gap-2">
                  <mat-icon class="text-base text-rose-600 shrink-0">error_outline</mat-icon>
                  <span>{{ passwordError() }}</span>
                </div>
              }

              @if (passwordSuccess()) {
                <div class="text-xs text-emerald-700 font-semibold bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex items-center gap-2">
                  <mat-icon class="text-base text-emerald-600 shrink-0">check_circle</mat-icon>
                  <span>Password successfully updated!</span>
                </div>
              }

              <div class="pt-2 flex justify-end">
                <button
                  type="submit"
                  [disabled]="passwordForm.invalid"
                  class="bg-[#6D42E8] hover:bg-[#5b34cc] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>

          <!-- Two-Factor Authentication Card -->
          <div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-xl bg-purple-50 text-[#6D42E8] border border-purple-100 flex items-center justify-center shrink-0">
                <mat-icon class="text-xl">security</mat-icon>
              </div>
              <div class="min-w-0">
                <h3 class="text-sm font-bold text-slate-900">Two-Factor Authentication (2FA)</h3>
                <p class="text-xs text-slate-500">Receive OTP on registered mobile number during login.</p>
              </div>
            </div>
            <button
              type="button"
              (click)="is2faEnabled.set(!is2faEnabled())"
              class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
              [class]="is2faEnabled() ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'"
            >
              {{ is2faEnabled() ? 'Enabled (Active)' : 'Disabled' }}
            </button>
          </div>

        </div>

        <!-- Right: Active Sessions & Audit Trail (1 col) -->
        <div class="space-y-6">
          
          <!-- Active Sessions -->
          <div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 gap-2 flex-wrap">
              <h2 class="text-sm font-bold text-slate-900">Active Login Sessions</h2>
              @if (sessions().length > 1) {
                <button
                  type="button"
                  (click)="terminateOtherSessions()"
                  class="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Terminate Others
                </button>
              }
            </div>

            <div class="space-y-3">
              @for (sess of sessions(); track sess.id) {
                <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <mat-icon class="text-sm text-[#6D42E8]">{{ sess.deviceIcon }}</mat-icon>
                      <span>{{ sess.device }}</span>
                    </span>
                    @if (sess.isCurrent) {
                      <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">Current</span>
                    }
                  </div>
                  <p class="text-[11px] text-slate-500">IP: {{ sess.ip }} · {{ sess.location }}</p>
                  <p class="text-[10px] text-slate-400">Last active: {{ sess.lastActive }}</p>
                </div>
              }
            </div>
          </div>

        </div>

      </div>

    </div>
  `
})
export class ParentSecurity {
  protected readonly facade = inject(ParentPortalFacade);
  protected readonly is2faEnabled = signal<boolean>(true);
  protected readonly passwordSuccess = signal<boolean>(false);
  protected readonly passwordError = signal<string>('');

  protected readonly passwordForm = new FormGroup({
    currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  protected readonly sessions = signal([
    {
      id: 'sess-1',
      device: 'Chrome on Windows 11',
      deviceIcon: 'laptop',
      ip: '152.57.190.12',
      location: 'New Delhi, India',
      lastActive: 'Just now',
      isCurrent: true
    },
    {
      id: 'sess-2',
      device: 'Safari on iPhone 15 Pro',
      deviceIcon: 'smartphone',
      ip: '49.36.120.88',
      location: 'New Delhi, India',
      lastActive: '2 hours ago',
      isCurrent: false
    }
  ]);

  protected updatePassword(): void {
    this.passwordError.set('');
    this.passwordSuccess.set(false);
    if (this.passwordForm.invalid) return;
    const val = this.passwordForm.getRawValue();
    if (val.newPassword !== val.confirmPassword) {
      this.passwordError.set('New password and confirmation password do not match.');
      return;
    }
    this.passwordSuccess.set(true);
    this.passwordForm.reset();
    setTimeout(() => this.passwordSuccess.set(false), 4000);
  }

  protected terminateOtherSessions(): void {
    this.sessions.update(list => list.filter(s => s.isCurrent));
  }
}
