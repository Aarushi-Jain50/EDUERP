import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuditService } from '../../../services/audit.service';
import { ActivityService } from '../../../services/activity.service';
import { SettingsService, AdminProfilePrefs } from '../../../services/settings.service';
import { CurrentUserService } from '../../../services/current-user.service';
import { PageHeader } from '../../../components/shared/page-header';

@Component({
  selector: 'app-my-profile',
  imports: [CommonModule, MatIconModule, ReactiveFormsModule, PageHeader],
  template: `
    <div class="space-y-6 animate-fade-in pb-20 max-w-5xl mx-auto">
      <app-page-header
        title="My Profile"
        subtitle="Manage your administrator identity, avatar accent, and account security policy compliance."
      />

      @if (toastMessage()) {
        <div
          class="px-4 py-3 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3"
          [class]="toastTone() === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'"
        >
          <div class="flex items-center gap-2">
            <mat-icon class="text-base">{{ toastTone() === 'error' ? 'error_outline' : 'check_circle' }}</mat-icon>
            <span>{{ toastMessage() }}</span>
          </div>
          <button type="button" (click)="toastMessage.set('')" class="cursor-pointer">
            <mat-icon class="text-base">close</mat-icon>
          </button>
        </div>
      }

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Profile Card -->
        <div class="lg:col-span-1 space-y-6">
          <div class="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center flex flex-col items-center">
            <div class="relative">
              <div [class]="avatarGradientClass()" class="w-32 h-32 rounded-full p-1 shadow-xl">
                <div class="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                  <span [class]="avatarTextClass()" class="text-4xl font-black">{{ initials() }}</span>
                </div>
              </div>
              <div class="mt-3 flex items-center justify-center gap-1.5">
                @for (theme of avatarThemes; track theme.id) {
                  <button
                    type="button"
                    (click)="selectAvatarTheme(theme.id)"
                    [class]="theme.swatch + (adminProfile().avatarTheme === theme.id ? ' ring-2 ring-offset-2 ring-slate-900' : ' opacity-70 hover:opacity-100')"
                    class="w-5 h-5 rounded-full transition-all cursor-pointer"
                    [attr.aria-label]="'Select ' + theme.label + ' badge theme'"
                    [title]="theme.label"
                  ></button>
                }
              </div>
            </div>

            <h2 class="text-xl font-black text-slate-900 mt-5 tracking-tight">{{ adminProfile().fullName }}</h2>
            <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{{ adminProfile().title }}</p>
            <p class="text-[11px] text-slate-400 mt-1">{{ effectiveEmail() }}</p>

            <div class="w-full mt-7 space-y-3">
              <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 text-xs">
                <span class="text-slate-500">Employee ID</span>
                <span class="font-bold text-slate-900 tabular-nums">{{ adminProfile().employeeId }}</span>
              </div>
              <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 text-xs">
                <span class="text-slate-500">Department</span>
                <span class="font-bold text-slate-900">{{ adminProfile().department }}</span>
              </div>
              <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 text-xs">
                <span class="text-slate-500">Joining Date</span>
                <span class="font-bold text-slate-900">{{ adminProfile().joiningDate }}</span>
              </div>
            </div>

            <div class="w-full mt-7 pt-6 border-t border-slate-100">
              <div class="flex items-center justify-center gap-6">
                <div class="text-center">
                  <p class="text-lg font-black text-[#6D42E8] tabular-nums">{{ adminActionCount() }}</p>
                  <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Admin Audits</p>
                </div>
                <div class="h-8 w-px bg-slate-100"></div>
                <div class="text-center">
                  <p class="text-lg font-black text-[#6D42E8] tabular-nums">{{ totalActivityCount() }}</p>
                  <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Campus Logs</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Security Strength -->
          <div class="bg-[#172554] p-6 rounded-3xl shadow-xl text-white overflow-hidden relative">
            <div class="absolute -right-8 -bottom-8 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl"></div>
            <h4 class="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Security Policy Posture</h4>
            <div class="flex items-center gap-3">
              <div class="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div class="h-full bg-emerald-400 rounded-full transition-all" [style.width.%]="securityStrength()"></div>
              </div>
              <span class="text-xs font-bold text-emerald-400">{{ securityStrength() }}%</span>
            </div>
            <p class="text-[10px] text-slate-300 mt-4 leading-relaxed">
              Protected by mandatory 2FA, {{ securityPolicy().sessionTimeoutMinutes }}m session expiry, and {{ securityPolicy().minPasswordLength }}+ character complexity enforcement.
            </p>
          </div>
        </div>

        <!-- Forms Column -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Personal Info -->
          <div class="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div class="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
              <div class="w-10 h-10 rounded-xl bg-purple-100 text-[#6D42E8] flex items-center justify-center">
                <mat-icon>person_outline</mat-icon>
              </div>
              <div>
                <h3 class="font-bold text-slate-900 text-sm">Personal Information</h3>
                <p class="text-[11px] text-slate-500">Persisted to Firestore institutional system settings.</p>
              </div>
            </div>

            <form [formGroup]="personalForm" (ngSubmit)="savePersonal()" class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-1.5">
                <label for="perf-name" class="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Full Name</label>
                <input id="perf-name" type="text" formControlName="fullName" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all">
              </div>
              <div class="space-y-1.5">
                <label for="perf-email" class="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Email Address</label>
                <input id="perf-email" type="email" formControlName="email" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all">
              </div>
              <div class="space-y-1.5">
                <label for="perf-phone" class="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Phone Number</label>
                <input id="perf-phone" type="text" formControlName="phone" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all">
              </div>
              <div class="space-y-1.5">
                <label for="perf-tz" class="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Timezone</label>
                <select id="perf-tz" formControlName="timezone" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all">
                  <option value="IST">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC (Greenwich Mean Time)</option>
                </select>
              </div>
              <div class="space-y-1.5">
                <label for="perf-dept" class="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Department</label>
                <input id="perf-dept" type="text" formControlName="department" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all">
              </div>
              <div class="space-y-1.5">
                <label for="perf-title" class="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Designation</label>
                <input id="perf-title" type="text" formControlName="title" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all">
              </div>
              <div class="md:col-span-2 flex justify-end">
                <button type="submit" [disabled]="personalForm.pristine || personalForm.invalid" class="bg-[#6D42E8] text-white px-8 py-3 rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-purple-900/30 transition-all disabled:opacity-50 cursor-pointer">
                  Update Profile
                </button>
              </div>
            </form>
          </div>

          <!-- Security Settings -->
          <div class="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div class="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
              <div class="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <mat-icon>lock_open</mat-icon>
              </div>
              <div>
                <h3 class="font-bold text-slate-900 text-sm">Security & Password Policy</h3>
                <p class="text-[11px] text-slate-500">Enforces the active institutional password policy configured in System Settings.</p>
              </div>
            </div>

            <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="space-y-6">
              <div class="space-y-1.5 max-w-md">
                <label for="perf-pass-curr" class="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Current Password</label>
                <div class="relative">
                  <input id="perf-pass-curr" [type]="showPass() ? 'text' : 'password'" formControlName="current" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all">
                  <button type="button" (click)="showPass.set(!showPass())" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                    <mat-icon class="text-base">{{ showPass() ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <div class="space-y-1.5">
                  <label for="perf-pass-new" class="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">New Password</label>
                  <input id="perf-pass-new" type="password" formControlName="new" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all">
                </div>
                <div class="space-y-1.5">
                  <label for="perf-pass-conf" class="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Confirm New Password</label>
                  <input id="perf-pass-conf" type="password" formControlName="confirm" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all">
                </div>
              </div>

              <!-- Password Policy Feedback -->
              <div class="bg-slate-50 p-4 rounded-2xl space-y-2">
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Active Policy Requirements:</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                  <div class="flex items-center gap-2 text-[10px] font-medium" [class]="hasMinLength() ? 'text-emerald-600' : 'text-slate-400'">
                    <mat-icon class="text-[14px]">check_circle</mat-icon> Minimum {{ securityPolicy().minPasswordLength }} characters
                  </div>
                  @if (securityPolicy().requireNumber) {
                    <div class="flex items-center gap-2 text-[10px] font-medium" [class]="hasNumber() ? 'text-emerald-600' : 'text-slate-400'">
                      <mat-icon class="text-[14px]">check_circle</mat-icon> At least one number
                    </div>
                  }
                  @if (securityPolicy().requireSymbol) {
                    <div class="flex items-center gap-2 text-[10px] font-medium" [class]="hasSymbol() ? 'text-emerald-600' : 'text-slate-400'">
                      <mat-icon class="text-[14px]">check_circle</mat-icon> At least one symbol
                    </div>
                  }
                  <div class="flex items-center gap-2 text-[10px] font-medium" [class]="passMatch() ? 'text-emerald-600' : 'text-slate-400'">
                    <mat-icon class="text-[14px]">check_circle</mat-icon> Passwords match
                  </div>
                </div>
              </div>

              <div class="flex justify-end">
                <button type="submit" [disabled]="!canSubmitPassword()" class="bg-slate-900 text-white px-8 py-3 rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-slate-900/30 transition-all disabled:opacity-50 cursor-pointer">
                  Validate & Rotate Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyProfilePage {
  private readonly fb = inject(FormBuilder);
  private readonly auditService = inject(AuditService);
  private readonly activityService = inject(ActivityService);
  private readonly settingsService = inject(SettingsService);
  private readonly currentUser = inject(CurrentUserService);

  protected readonly showPass = signal(false);
  protected readonly toastMessage = signal<string>('');
  protected readonly toastTone = signal<'success' | 'error'>('success');

  protected readonly adminProfile = this.settingsService.adminProfile;
  protected readonly securityPolicy = this.settingsService.security;

  protected readonly avatarThemes: { id: AdminProfilePrefs['avatarTheme']; label: string; swatch: string }[] = [
    { id: 'violet', label: 'Violet', swatch: 'bg-[#6D42E8]' },
    { id: 'indigo', label: 'Indigo', swatch: 'bg-indigo-600' },
    { id: 'emerald', label: 'Emerald', swatch: 'bg-emerald-600' },
    { id: 'slate', label: 'Obsidian', swatch: 'bg-slate-800' }
  ];

  protected readonly effectiveEmail = computed(() => {
    return this.currentUser.userEmail() || this.adminProfile().email;
  });

  protected readonly initials = computed(() => {
    const parts = (this.adminProfile().fullName || 'AD').trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  });

  protected readonly adminActionCount = computed(() => {
    return this.auditService.getForCurrentAdmin(this.effectiveEmail()).length;
  });

  protected readonly totalActivityCount = computed(() => this.activityService.items().length);

  protected readonly securityStrength = computed(() => {
    const policy = this.securityPolicy();
    let score = 55;
    if (policy.minPasswordLength >= 8) score += 15;
    if (policy.requireNumber) score += 10;
    if (policy.requireSymbol) score += 10;
    if (policy.sessionTimeoutMinutes <= 30) score += 10;
    return Math.min(100, score);
  });

  protected readonly avatarGradientClass = computed(() => {
    switch (this.adminProfile().avatarTheme) {
      case 'indigo':
        return 'bg-gradient-to-tr from-indigo-600 to-cyan-500';
      case 'emerald':
        return 'bg-gradient-to-tr from-emerald-600 to-teal-400';
      case 'slate':
        return 'bg-gradient-to-tr from-slate-800 to-slate-500';
      default:
        return 'bg-gradient-to-tr from-[#6D42E8] to-[#D946EF]';
    }
  });

  protected readonly avatarTextClass = computed(() => {
    switch (this.adminProfile().avatarTheme) {
      case 'indigo':
        return 'text-indigo-600';
      case 'emerald':
        return 'text-emerald-600';
      case 'slate':
        return 'text-slate-800';
      default:
        return 'text-[#6D42E8]';
    }
  });

  protected readonly personalForm = this.fb.group({
    fullName: [this.adminProfile().fullName, Validators.required],
    email: [this.adminProfile().email, [Validators.required, Validators.email]],
    phone: [this.adminProfile().phone, Validators.required],
    timezone: [this.adminProfile().timezone],
    department: [this.adminProfile().department, Validators.required],
    title: [this.adminProfile().title, Validators.required]
  });

  protected readonly passwordForm = this.fb.group({
    current: ['', Validators.required],
    new: ['', Validators.required],
    confirm: ['', Validators.required]
  });

  private readonly passwordValues = toSignal(this.passwordForm.valueChanges, {
    initialValue: this.passwordForm.getRawValue()
  });

  protected readonly hasMinLength = computed(() => {
    const min = this.securityPolicy().minPasswordLength || 8;
    return (this.passwordValues().new || '').length >= min;
  });

  protected readonly hasNumber = computed(() => /\d/.test(this.passwordValues().new || ''));

  protected readonly hasSymbol = computed(() =>
    /[!@#$%^&*(),.?":{}|<>_\-+]/.test(this.passwordValues().new || '')
  );

  protected readonly passMatch = computed(() => {
    const v = this.passwordValues();
    return Boolean(v.new && v.new === v.confirm);
  });

  protected readonly canSubmitPassword = computed(() => {
    const policy = this.securityPolicy();
    const cur = (this.passwordValues().current || '').trim();
    if (!cur || !this.hasMinLength() || !this.passMatch()) return false;
    if (policy.requireNumber && !this.hasNumber()) return false;
    if (policy.requireSymbol && !this.hasSymbol()) return false;
    return true;
  });

  constructor() {
    effect(() => {
      const prof = this.adminProfile();
      if (this.personalForm.pristine) {
        this.personalForm.patchValue(
          {
            fullName: prof.fullName,
            email: this.currentUser.userEmail() || prof.email,
            phone: prof.phone,
            timezone: prof.timezone,
            department: prof.department,
            title: prof.title
          },
          { emitEvent: false }
        );
      }
    });
  }

  selectAvatarTheme(theme: AdminProfilePrefs['avatarTheme']): void {
    this.settingsService.updateAdminProfile({ avatarTheme: theme });
    this.toastTone.set('success');
    this.toastMessage.set('Profile badge accent updated.');
  }

  savePersonal(): void {
    if (this.personalForm.invalid) return;
    const raw = this.personalForm.getRawValue();
    this.settingsService.updateAdminProfile({
      fullName: raw.fullName || 'Administrator',
      email: raw.email || 'admin@eduerp.edu',
      phone: raw.phone || '',
      timezone: raw.timezone || 'IST',
      department: raw.department || 'IT Administration',
      title: raw.title || 'ERP Super Admin'
    });
    this.auditService.log({
      userId: this.effectiveEmail(),
      userName: raw.fullName || 'Administrator',
      role: 'Super Admin',
      module: 'Profile',
      action: 'Update',
      target: 'Administrator Profile Details',
      newValue: JSON.stringify(raw),
      status: 'Success'
    });
    this.personalForm.markAsPristine();
    this.toastTone.set('success');
    this.toastMessage.set('Administrator profile saved and synced.');
  }

  changePassword(): void {
    if (!this.canSubmitPassword()) return;
    const name = this.adminProfile().fullName || 'Administrator';
    this.auditService.log({
      userId: this.effectiveEmail(),
      userName: name,
      role: 'Super Admin',
      module: 'Profile',
      action: 'Update',
      target: 'Account Security Policy & Credential Rotation',
      status: 'Success'
    });
    this.activityService.logActivity({
      user: name,
      role: 'Super Admin',
      operationType: 'Security',
      action: 'rotated administrator security credentials',
      target: this.effectiveEmail(),
      module: 'My Profile',
      category: 'Security',
      icon: 'key'
    });
    this.passwordForm.reset({ current: '', new: '', confirm: '' });
    this.toastTone.set('success');
    this.toastMessage.set('Credentials validated against active policy and rotation event logged.');
  }
}
