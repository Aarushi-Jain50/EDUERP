import { ChangeDetectionStrategy, Component, inject, signal, computed, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { StatusBadge } from '../../../components/shared/status-badge';
import { ParentsService } from '../../../services/parents.service';
import { StudentsService } from '../../../services/students.service';
import { SettingsService } from '../../../services/settings.service';
import { AuditService } from '../../../services/audit.service';
import { ParentPortalFacade } from '../shared/parent-portal.facade';

interface ParentSessionItem {
  id: string;
  device: string;
  browser: string;
  location: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

@Component({
  selector: 'app-parent-my-profile',
  imports: [ReactiveFormsModule, MatIconModule, PageHeader, ConfirmDialog, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-[#172554] pb-20 text-[13px]">
      <app-page-header
        title="My Profile & Security"
        [subtitle]="child() ? 'Guardian contact settings, linked children (' + child()!.name + ' selected), and security credentials.' : 'Manage guardian contact settings, linked children, and account security.'"
      />

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Left Identity Card -->
        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-6 h-fit">
          <div class="flex flex-col items-center text-center space-y-3">
            <div class="w-20 h-20 rounded-full gradient-accent p-0.5 shadow-md">
              <div class="w-full h-full rounded-full bg-[#1A1745] flex items-center justify-center text-2xl font-black text-white">
                {{ currentParent().initials || 'PR' }}
              </div>
            </div>
            <div>
              <h2 class="text-base font-black text-[#172554]">{{ currentParent().name }}</h2>
              <span class="px-2.5 py-0.5 rounded-full bg-purple-50 text-[#6D42E8] font-bold text-[10px] uppercase tracking-wider inline-block mt-1">
                {{ currentParent().relation || 'Guardian' }}
              </span>
            </div>
          </div>

          <div class="divide-y divide-slate-100 text-xs space-y-2.5 pt-2">
            <div class="flex justify-between py-2 gap-2">
              <span class="text-[#64748B] font-medium shrink-0">Email</span>
              <span class="font-bold text-[#172554] truncate">{{ currentParent().email }}</span>
            </div>
            <div class="flex justify-between py-2 gap-2">
              <span class="text-[#64748B] font-medium shrink-0">Phone</span>
              <span class="font-mono font-bold text-[#172554]">{{ currentParent().phone }}</span>
            </div>
            <div class="flex justify-between py-2 gap-2">
              <span class="text-[#64748B] font-medium shrink-0">Occupation</span>
              <span class="font-bold text-[#172554] text-right truncate">{{ currentParent().occupation || '-' }}</span>
            </div>
            <div class="flex justify-between py-2 gap-2">
              <span class="text-[#64748B] font-medium shrink-0">Linked Children</span>
              <span class="font-bold text-[#172554]">{{ linkedChildren().length }}</span>
            </div>
            <div class="flex justify-between py-2 gap-2 items-center">
              <span class="text-[#64748B] font-medium shrink-0">Account Status</span>
              <app-status-badge [status]="currentParent().status || 'Active'" />
            </div>
          </div>

          <div class="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-[#64748B] space-y-1">
            <p>Last Login: <strong class="text-[#172554]">Today at 09:20 AM</strong></p>
            <p>Access IP: <strong class="text-[#172554]">103.22.11.84</strong></p>
          </div>
        </div>

        <!-- Right Tabs Content Area -->
        <div class="lg:col-span-2 space-y-6">

          <!-- Tab Navigation -->
          <div class="flex items-center gap-1 sm:gap-2 border-b border-[#E2E8F0] overflow-x-auto">
            <button
              type="button"
              (click)="activeTab.set('personal')"
              [class]="activeTab() === 'personal' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold bg-white' : 'text-[#64748B] hover:text-[#172554] font-medium'"
              class="px-4 py-3 text-xs transition-all cursor-pointer whitespace-nowrap rounded-t-xl"
            >
              Personal Info
            </button>

            <button
              type="button"
              (click)="activeTab.set('children')"
              [class]="activeTab() === 'children' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold bg-white' : 'text-[#64748B] hover:text-[#172554] font-medium'"
              class="px-4 py-3 text-xs transition-all cursor-pointer whitespace-nowrap rounded-t-xl"
            >
              My Children ({{ linkedChildren().length }})
            </button>

            <button
              type="button"
              (click)="activeTab.set('password')"
              [class]="activeTab() === 'password' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold bg-white' : 'text-[#64748B] hover:text-[#172554] font-medium'"
              class="px-4 py-3 text-xs transition-all cursor-pointer whitespace-nowrap rounded-t-xl"
            >
              Change Password
            </button>

            <button
              type="button"
              (click)="activeTab.set('sessions')"
              [class]="activeTab() === 'sessions' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold bg-white' : 'text-[#64748B] hover:text-[#172554] font-medium'"
              class="px-4 py-3 text-xs transition-all cursor-pointer whitespace-nowrap rounded-t-xl"
            >
              My Sessions
            </button>
          </div>

          <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 sm:p-6">
            @switch (activeTab()) {

              <!-- Tab 1: Personal Info (Editable phone and address only) -->
              @case ('personal') {
                <form [formGroup]="personalForm" (ngSubmit)="savePersonalInfo()" class="space-y-4">
                  <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <h3 class="font-extrabold text-[#172554] text-sm">Guardian Contact Information</h3>
                    <span class="text-[11px] text-[#64748B]">Editable: Phone & Address only</span>
                  </div>

                  @if (personalSuccess()) {
                    <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold flex items-center gap-2">
                      <mat-icon class="text-base text-emerald-600 shrink-0">check_circle</mat-icon>
                      <span>{{ personalSuccess() }}</span>
                    </div>
                  }

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-1.5">
                      <label for="par-readonly-name" class="text-xs font-semibold text-[#172554]">Full Name (Read-only)</label>
                      <input
                        id="par-readonly-name"
                        [value]="currentParent().name"
                        disabled
                        class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 font-medium cursor-not-allowed"
                      />
                    </div>

                    <div class="space-y-1.5">
                      <label for="par-readonly-email" class="text-xs font-semibold text-[#172554]">Registered Email (Read-only)</label>
                      <input
                        id="par-readonly-email"
                        [value]="currentParent().email"
                        disabled
                        class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 font-medium cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-1.5">
                      <label for="par-readonly-relation" class="text-xs font-semibold text-[#172554]">Relationship (Read-only)</label>
                      <input
                        id="par-readonly-relation"
                        [value]="currentParent().relation"
                        disabled
                        class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 font-medium cursor-not-allowed"
                      />
                    </div>

                    <div class="space-y-1.5">
                      <label for="par-phone" class="text-xs font-semibold text-[#172554]">
                        Primary Contact Phone <span class="text-rose-500">*</span>
                      </label>
                      <input
                        id="par-phone"
                        formControlName="phone"
                        maxlength="10"
                        placeholder="10-digit mobile number"
                        class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                      />
                      @if (personalForm.get('phone')?.touched && personalForm.get('phone')?.invalid) {
                        <p class="text-[11px] text-rose-600">Must be a valid 10-digit mobile number.</p>
                      }
                    </div>
                  </div>

                  <div class="space-y-1.5">
                    <label for="par-address" class="text-xs font-semibold text-[#172554]">
                      Residential Communication Address <span class="text-rose-500">*</span>
                    </label>
                    <textarea
                      id="par-address"
                      formControlName="address"
                      rows="3"
                      placeholder="Enter complete residential address..."
                      class="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                    ></textarea>
                    @if (personalForm.get('address')?.touched && personalForm.get('address')?.invalid) {
                      <p class="text-[11px] text-rose-600">Residential address cannot be blank.</p>
                    }
                  </div>

                  <div class="pt-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p class="text-[11px] text-[#64748B]">
                      {{ personalForm.dirty ? 'You have unsaved changes.' : 'Contact information is up to date.' }}
                    </p>
                    <button
                      type="submit"
                      [disabled]="personalForm.invalid || !personalForm.dirty"
                      class="gradient-accent text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:opacity-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center justify-center gap-2 self-start sm:self-auto"
                    >
                      <mat-icon class="text-sm">save</mat-icon>
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              }

              <!-- Tab 2: My Children (Read-only list) -->
              @case ('children') {
                <div class="space-y-4">
                  <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 class="font-extrabold text-[#172554] text-sm">Linked Children</h3>
                    <span class="text-[11px] text-[#64748B]">Contact administration to modify student linkages</span>
                  </div>

                  @if (linkedChildren().length > 0) {
                    <div class="space-y-3">
                      @for (kid of linkedChildren(); track kid.id) {
                        <div class="p-4 rounded-xl border border-[#E2E8F0] bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div class="flex items-center gap-3 min-w-0">
                            <div class="w-10 h-10 rounded-full gradient-brand text-white flex items-center justify-center text-xs font-bold shrink-0">
                              {{ kid.initials }}
                            </div>
                            <div class="min-w-0">
                              <div class="flex items-center gap-2 flex-wrap">
                                <p class="font-bold text-[#172554] text-sm">{{ kid.name }}</p>
                                @if (child()?.id === kid.id) {
                                  <span class="px-2 py-0.5 rounded-full bg-purple-50 text-[#6D42E8] border border-purple-200 text-[10px] font-bold uppercase">
                                    Selected
                                  </span>
                                }
                              </div>
                              <p class="text-xs text-[#64748B] truncate">
                                <span class="font-mono font-semibold text-[#172554]">{{ kid.enrollmentNo }}</span> · {{ kid.course }} · {{ kid.semester }} · {{ kid.section }}
                              </p>
                            </div>
                          </div>
                          <app-status-badge [status]="kid.status" />
                        </div>
                      }
                    </div>
                  } @else {
                    <p class="text-xs text-[#64748B] py-4">No students linked to this guardian account.</p>
                  }
                </div>
              }

              <!-- Tab 3: Change Password -->
              @case ('password') {
                <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="space-y-4">
                  <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <h3 class="font-extrabold text-[#172554] text-sm">Security Credentials & Password Policy</h3>
                    <span class="text-[11px] text-[#64748B]">Validated against security settings</span>
                  </div>

                  @if (passError()) {
                    <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                      <mat-icon class="text-base text-rose-600 shrink-0">error_outline</mat-icon>
                      <span>{{ passError() }}</span>
                    </div>
                  }

                  @if (passSuccess()) {
                    <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold flex items-center gap-2">
                      <mat-icon class="text-base text-emerald-600 shrink-0">check_circle</mat-icon>
                      <span>{{ passSuccess() }}</span>
                    </div>
                  }

                  <div class="space-y-1.5">
                    <label for="par-pass-curr" class="text-xs font-semibold text-[#172554]">
                      Current Password <span class="text-rose-500">*</span>
                    </label>
                    <input
                      id="par-pass-curr"
                      type="password"
                      formControlName="currentPassword"
                      placeholder="Enter current portal password"
                      class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                    />
                  </div>

                  <div class="space-y-1.5">
                    <label for="par-pass-new" class="text-xs font-semibold text-[#172554]">
                      New Password <span class="text-rose-500">*</span>
                    </label>
                    <input
                      id="par-pass-new"
                      type="password"
                      formControlName="newPassword"
                      placeholder="Enter new strong password"
                      class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                    />
                  </div>

                  <!-- Live Strength Meter -->
                  <div class="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <div class="flex justify-between items-center text-[10px] font-bold text-slate-600">
                      <span>Password Strength</span>
                      <span [class]="passwordScore() >= 3 ? 'text-emerald-600' : 'text-amber-600'">
                        {{ passwordScore() >= 3 ? 'Strong' : passwordScore() === 2 ? 'Moderate' : 'Weak' }}
                      </span>
                    </div>
                    <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        [style.width.%]="(passwordScore() / 3) * 100"
                        [class]="passwordScore() >= 3 ? 'bg-emerald-500' : 'bg-amber-500'"
                        class="h-full rounded-full transition-all"
                      ></div>
                    </div>
                    <p class="text-[10px] text-[#64748B] mt-1">
                      Minimum {{ securityPolicy().minPasswordLength }} characters{{ securityPolicy().requireNumber ? ', at least one digit' : '' }}{{ securityPolicy().requireSymbol ? ', and a special symbol' : '' }}.
                    </p>
                  </div>

                  <div class="space-y-1.5">
                    <label for="par-pass-conf" class="text-xs font-semibold text-[#172554]">
                      Confirm New Password <span class="text-rose-500">*</span>
                    </label>
                    <input
                      id="par-pass-conf"
                      type="password"
                      formControlName="confirmPassword"
                      placeholder="Re-type new password"
                      class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                    />
                  </div>

                  <div class="pt-4 border-t border-[#E2E8F0] flex justify-end">
                    <button
                      type="submit"
                      class="gradient-accent text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:opacity-95 transition-all cursor-pointer flex items-center gap-2"
                    >
                      <mat-icon class="text-sm">lock</mat-icon>
                      <span>Update Password</span>
                    </button>
                  </div>
                </form>
              }

              <!-- Tab 4: My Sessions -->
              @case ('sessions') {
                <div class="space-y-4">
                  <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 class="font-extrabold text-[#172554] text-sm">Active Session Register</h3>
                    <span class="text-[11px] text-[#64748B]">Devices currently signed in to your guardian account</span>
                  </div>

                  <div class="space-y-3">
                    @for (s of activeSessions(); track s.id) {
                      <div class="p-4 rounded-xl border border-[#E2E8F0] bg-slate-50/50 flex items-center justify-between text-xs gap-3 flex-wrap">
                        <div class="space-y-0.5">
                          <p class="font-bold text-[#172554]">{{ s.device }} ({{ s.browser }})</p>
                          <p class="text-[11px] text-[#64748B]">{{ s.location }} • IP: {{ s.ipAddress }} • Last active: {{ s.lastActive }}</p>
                        </div>
                        <div class="flex items-center gap-3">
                          @if (s.isCurrent) {
                            <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase">
                              Current Device
                            </span>
                          } @else {
                            <button
                              type="button"
                              (click)="openTerminateConfirm(s.id)"
                              class="text-xs font-bold text-rose-600 hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <mat-icon class="text-sm">power_settings_new</mat-icon>
                              <span>Terminate</span>
                            </button>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            }
          </div>
        </div>
      </div>

      <!-- Terminate Session Confirmation -->
      <app-confirm-dialog
        [isOpen]="isConfirmOpen()"
        title="Terminate Device Session"
        message="Are you sure you want to terminate this device session? The account will be signed out on that browser immediately."
        confirmLabel="Terminate Session"
        (cancelled)="isConfirmOpen.set(false)"
        (confirmed)="terminateSession()"
      />
    </div>
  `
})
export class ParentMyProfile {
  private readonly parentsService = inject(ParentsService);
  private readonly studentsService = inject(StudentsService);
  private readonly settingsService = inject(SettingsService);
  private readonly auditService = inject(AuditService);
  protected readonly facade = inject(ParentPortalFacade);

  protected readonly currentParent = this.facade.currentParent;
  protected readonly linkedChildren = this.facade.linkedChildren;
  protected readonly child = this.facade.selectedChild;
  protected readonly securityPolicy = this.settingsService.security;

  protected readonly activeTab = signal<'personal' | 'children' | 'password' | 'sessions'>('personal');
  protected readonly personalSuccess = signal<string>('');
  protected readonly passError = signal<string>('');
  protected readonly passSuccess = signal<string>('');
  protected readonly isConfirmOpen = signal<boolean>(false);
  protected readonly sessionToTerminateId = signal<string | null>(null);

  protected readonly activeSessions = signal<ParentSessionItem[]>([
    {
      id: 'par-sess-1',
      device: 'Chrome on Windows 11 (Laptop)',
      browser: 'Chrome 124',
      location: 'New Delhi, India',
      ipAddress: '103.22.11.84',
      lastActive: 'Just now',
      isCurrent: true
    },
    {
      id: 'par-sess-2',
      device: 'Chrome on Android Phone',
      browser: 'Chrome Mobile',
      location: 'Gurugram, India',
      ipAddress: '103.22.11.98',
      lastActive: 'Yesterday at 08:15 PM',
      isCurrent: false
    }
  ]);

  protected readonly personalForm = new FormGroup({
    phone: new FormControl('', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]),
    address: new FormControl('', Validators.required)
  });

  protected readonly passwordForm = new FormGroup({
    currentPassword: new FormControl('', Validators.required),
    newPassword: new FormControl('', Validators.required),
    confirmPassword: new FormControl('', Validators.required)
  });

  private readonly newPasswordValue = toSignal(
    this.passwordForm.controls.newPassword.valueChanges,
    { initialValue: '' }
  );

  constructor() {
    effect(() => {
      const p = this.currentParent();
      if (!p) return;
      this.personalForm.reset({
        phone: p.phone || '',
        address: p.address || ''
      });
      this.personalForm.markAsPristine();
    });
  }

  protected readonly passwordScore = computed(() => {
    const pwd = this.newPasswordValue() || '';
    const policy = this.securityPolicy();
    let score = 0;
    if (pwd.length >= policy.minPasswordLength) score++;
    if (!policy.requireNumber || /[0-9]/.test(pwd)) score++;
    if (!policy.requireSymbol || /[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++;
    return score;
  });

  protected savePersonalInfo(): void {
    this.personalSuccess.set('');
    if (this.personalForm.invalid) return;

    const p = this.currentParent();
    if (!p) return;

    const val = this.personalForm.getRawValue();
    const result = this.parentsService.saveParent(
      {
        name: p.name,
        relation: p.relation,
        phone: (val.phone || '').trim(),
        email: p.email,
        occupation: p.occupation,
        address: (val.address || '').trim(),
        studentIds: p.studentIds,
        status: p.status
      },
      p.id
    );

    if (result.success) {
      this.auditService.log({
        userId: p.id,
        userName: p.name,
        role: 'Parent',
        module: 'Parent Profile',
        action: 'Update',
        target: 'Contact Phone & Address',
        status: 'Success'
      });
      this.personalForm.markAsPristine();
      this.personalSuccess.set('Guardian contact details updated successfully.');
      this.studentsService.showToast('success', 'Guardian contact details updated successfully.');
      setTimeout(() => this.personalSuccess.set(''), 4000);
    } else {
      this.studentsService.showToast('error', result.error || 'Failed to update guardian profile.');
    }
  }

  protected changePassword(): void {
    this.passError.set('');
    this.passSuccess.set('');
    const val = this.passwordForm.getRawValue();

    if (!val.currentPassword) {
      this.passError.set('Please enter your current account password.');
      return;
    }

    if (val.newPassword !== val.confirmPassword) {
      this.passError.set('New password and confirmation password do not match.');
      return;
    }

    if (this.passwordScore() < 3) {
      const policy = this.securityPolicy();
      this.passError.set(
        `New password must be at least ${policy.minPasswordLength} characters long${policy.requireNumber ? ', contain digits' : ''}${policy.requireSymbol ? ', and include special symbols' : ''}.`
      );
      return;
    }

    const p = this.currentParent();
    if (!p) return;

    this.auditService.log({
      userId: p.id,
      userName: p.name,
      role: 'Parent',
      module: 'Parent Security',
      action: 'Update',
      target: 'Password Change',
      status: 'Success'
    });

    this.passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
    this.passSuccess.set('Password updated successfully.');
    this.studentsService.showToast('success', 'Password updated successfully.');
    setTimeout(() => this.passSuccess.set(''), 4000);
  }

  protected openTerminateConfirm(id: string): void {
    this.sessionToTerminateId.set(id);
    this.isConfirmOpen.set(true);
  }

  protected terminateSession(): void {
    const id = this.sessionToTerminateId();
    if (id) {
      const p = this.currentParent();
      this.activeSessions.update(list => list.filter(s => s.id !== id));
      this.isConfirmOpen.set(false);
      if (p) {
        this.auditService.log({
          userId: p.id,
          userName: p.name,
          role: 'Parent',
          module: 'Parent Security',
          action: 'Delete',
          target: `Session ${id}`,
          status: 'Success'
        });
      }
      this.studentsService.showToast('info', 'Device session terminated.');
    }
  }
}
