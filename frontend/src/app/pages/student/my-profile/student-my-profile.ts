import { ChangeDetectionStrategy, Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { CurrentUserService } from '../../../services/current-user.service';
import { StudentsService } from '../../../services/students.service';
import { SettingsService } from '../../../services/settings.service';
import { AuditService } from '../../../services/audit.service';

interface UserSessionItem {
  id: string;
  device: string;
  browser: string;
  location: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

@Component({
  selector: 'app-student-my-profile',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, PageHeader, ConfirmDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-[#172554] pb-20 text-[13px]">
      <app-page-header
        title="My Profile & Security"
        subtitle="Manage student contact coordinates, view academic enrollment records, and configure account security."
      />

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">

        <!-- Left Profile Identity Card -->
        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 sm:p-6 space-y-5 sm:space-y-6 h-fit">
          <div class="flex flex-col items-center text-center space-y-3">
            <div class="w-20 h-20 rounded-full gradient-accent p-0.5 shadow-md">
              <div class="w-full h-full rounded-full bg-[#1A1745] flex items-center justify-center text-2xl font-black text-white">
                {{ currentStudent().initials }}
              </div>
            </div>
            <div>
              <h2 class="text-base font-black text-[#172554]">{{ currentStudent().name }}</h2>
              <span class="px-2.5 py-0.5 rounded-full bg-purple-50 text-[#6D42E8] font-bold text-[10px] uppercase tracking-wider inline-block mt-1 whitespace-nowrap">
                {{ currentStudent().enrollmentNo }}
              </span>
            </div>
          </div>

          <div class="divide-y divide-slate-100 text-xs pt-2">
            <div class="flex items-center justify-between gap-3 py-2.5">
              <span class="text-[#64748B] font-medium shrink-0">Program</span>
              <span class="font-bold text-[#172554] text-right truncate min-w-0">{{ currentStudent().course }}</span>
            </div>
            <div class="flex items-center justify-between gap-3 py-2.5">
              <span class="text-[#64748B] font-medium shrink-0">Semester & Sec</span>
              <span class="font-bold text-[#172554] text-right whitespace-nowrap">{{ currentStudent().semester }} • {{ currentStudent().section }}</span>
            </div>
            <div class="flex items-center justify-between gap-3 py-2.5">
              <span class="text-[#64748B] font-medium shrink-0">Enrollment No</span>
              <span class="font-mono font-bold text-[#172554] text-right whitespace-nowrap">{{ currentStudent().enrollmentNo }}</span>
            </div>
            <div class="flex items-center justify-between gap-3 py-2.5">
              <span class="text-[#64748B] font-medium shrink-0">Institutional Email</span>
              <span class="font-bold text-[#172554] text-right truncate min-w-0">{{ currentStudent().email }}</span>
            </div>
            <div class="flex items-center justify-between gap-3 py-2.5">
              <span class="text-[#64748B] font-medium shrink-0">Enrollment Status</span>
              <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[10px] uppercase whitespace-nowrap shrink-0">
                {{ currentStudent().status }}
              </span>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-[#64748B] space-y-1">
            <p>Last Login: <strong class="text-[#172554]">Today at 09:15 AM</strong></p>
            <p>Access IP: <strong class="text-[#172554]">103.22.11.84</strong></p>
          </div>
        </div>

        <!-- Right Tabs Content Area -->
        <div class="lg:col-span-2 space-y-5 sm:space-y-6 min-w-0">

          <!-- Tab Navigation -->
          <div class="flex items-center gap-1 sm:gap-2 border-b border-[#E2E8F0] overflow-x-auto scrollbar-none">
            <button
              type="button"
              (click)="activeTab.set('personal')"
              [class]="activeTab() === 'personal' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold bg-white' : 'text-[#64748B] hover:text-[#172554] font-medium'"
              class="min-h-[44px] px-3.5 sm:px-4 py-2.5 text-xs transition-all cursor-pointer whitespace-nowrap rounded-t-xl shrink-0"
            >
              Personal Info
            </button>

            <button
              type="button"
              (click)="activeTab.set('academic')"
              [class]="activeTab() === 'academic' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold bg-white' : 'text-[#64748B] hover:text-[#172554] font-medium'"
              class="min-h-[44px] px-3.5 sm:px-4 py-2.5 text-xs transition-all cursor-pointer whitespace-nowrap rounded-t-xl shrink-0"
            >
              Academic
            </button>

            <button
              type="button"
              (click)="activeTab.set('guardian')"
              [class]="activeTab() === 'guardian' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold bg-white' : 'text-[#64748B] hover:text-[#172554] font-medium'"
              class="min-h-[44px] px-3.5 sm:px-4 py-2.5 text-xs transition-all cursor-pointer whitespace-nowrap rounded-t-xl shrink-0"
            >
              Guardian
            </button>

            <button
              type="button"
              (click)="activeTab.set('password')"
              [class]="activeTab() === 'password' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold bg-white' : 'text-[#64748B] hover:text-[#172554] font-medium'"
              class="min-h-[44px] px-3.5 sm:px-4 py-2.5 text-xs transition-all cursor-pointer whitespace-nowrap rounded-t-xl shrink-0"
            >
              Change Password
            </button>

            <button
              type="button"
              (click)="activeTab.set('sessions')"
              [class]="activeTab() === 'sessions' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold bg-white' : 'text-[#64748B] hover:text-[#172554] font-medium'"
              class="min-h-[44px] px-3.5 sm:px-4 py-2.5 text-xs transition-all cursor-pointer whitespace-nowrap rounded-t-xl shrink-0"
            >
              My Sessions
            </button>
          </div>

          <!-- Tab Content Cards -->
          <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 sm:p-6">
            @switch (activeTab()) {

              <!-- Tab 1: Personal Info (Editable phone and address only) -->
              @case ('personal') {
                <form [formGroup]="personalForm" (ngSubmit)="savePersonalInfo()" class="space-y-4">
                  <div class="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
                    <h3 class="font-extrabold text-[#172554] text-sm">Personal Contact Information</h3>
                    <span class="text-[11px] text-[#64748B]">Editable: Phone & Address only</span>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-1.5">
                      <label for="prof-readonly-name" class="text-xs font-semibold text-[#172554]">Full Legal Name (Read-only)</label>
                      <input
                        id="prof-readonly-name"
                        [value]="currentStudent().name"
                        disabled
                        class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 font-medium cursor-not-allowed"
                      />
                    </div>

                    <div class="space-y-1.5">
                      <label for="prof-readonly-email" class="text-xs font-semibold text-[#172554]">Institutional Email (Read-only)</label>
                      <input
                        id="prof-readonly-email"
                        [value]="currentStudent().email"
                        disabled
                        class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 font-medium cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-1.5">
                      <label for="prof-readonly-dob" class="text-xs font-semibold text-[#172554]">Date of Birth (Read-only)</label>
                      <input
                        id="prof-readonly-dob"
                        [value]="currentStudent().dob"
                        disabled
                        class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 font-medium cursor-not-allowed"
                      />
                    </div>

                    <div class="space-y-1.5">
                      <label for="prof-phone" class="text-xs font-semibold text-[#172554]">
                        Primary Contact Phone <span class="text-rose-500">*</span>
                      </label>
                      <input
                        id="prof-phone"
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
                    <label for="prof-address" class="text-xs font-semibold text-[#172554]">
                      Residential Communication Address <span class="text-rose-500">*</span>
                    </label>
                    <textarea
                      id="prof-address"
                      formControlName="address"
                      rows="3"
                      placeholder="Enter complete residential address with PIN code..."
                      class="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                    ></textarea>
                    @if (personalForm.get('address')?.touched && personalForm.get('address')?.invalid) {
                      <p class="text-[11px] text-rose-600">Residential address cannot be blank.</p>
                    }
                  </div>

                  <!-- Save Bar (Enabled only when form is dirty & valid) -->
                  <div class="pt-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p class="text-[11px] text-[#64748B]">
                      {{ personalForm.dirty ? 'You have unsaved changes.' : 'Contact information is current.' }}
                    </p>
                    <button
                      type="submit"
                      [disabled]="personalForm.invalid || !personalForm.dirty"
                      class="w-full sm:w-auto justify-center min-h-[44px] sm:min-h-0 gradient-accent text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:opacity-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 whitespace-nowrap"
                    >
                      <mat-icon class="text-sm">save</mat-icon>
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              }

              <!-- Tab 2: Academic (Read-only with Admin note) -->
              @case ('academic') {
                <div class="space-y-5">
                  <div class="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 text-xs text-purple-900 flex items-center gap-2.5">
                    <mat-icon class="text-base text-[#6D42E8] shrink-0">info</mat-icon>
                    <span class="font-medium">Contact the admin office to change these details.</span>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span class="text-[#64748B] block text-[10px] uppercase font-bold tracking-wider">Enrolled Course</span>
                      <strong class="text-[#172554] block text-xs">{{ currentStudent().course }}</strong>
                    </div>

                    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span class="text-[#64748B] block text-[10px] uppercase font-bold tracking-wider">Department</span>
                      <strong class="text-[#172554] block text-xs">{{ currentStudent().department }}</strong>
                    </div>

                    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span class="text-[#64748B] block text-[10px] uppercase font-bold tracking-wider">Academic Batch</span>
                      <strong class="text-[#172554] block text-xs">{{ academicBatch() }}</strong>
                    </div>

                    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span class="text-[#64748B] block text-[10px] uppercase font-bold tracking-wider">Admission Date</span>
                      <strong class="text-[#172554] block text-xs">{{ currentStudent().admissionDate }}</strong>
                    </div>

                    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span class="text-[#64748B] block text-[10px] uppercase font-bold tracking-wider">Current Semester</span>
                      <strong class="text-[#172554] block text-xs">{{ currentStudent().semester }}</strong>
                    </div>

                    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span class="text-[#64748B] block text-[10px] uppercase font-bold tracking-wider">Assigned Section</span>
                      <strong class="text-[#172554] block text-xs">{{ currentStudent().section }}</strong>
                    </div>
                  </div>
                </div>
              }

              <!-- Tab 3: Guardian (Read-only) -->
              @case ('guardian') {
                <div class="space-y-5">
                  <div class="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
                    <h3 class="font-extrabold text-[#172554] text-sm">Primary Guardian / Parent Details</h3>
                    <span class="text-[11px] text-[#64748B]">Emergency contact on institutional record</span>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span class="text-[#64748B] block text-[10px] uppercase font-bold tracking-wider">Guardian Name</span>
                      <strong class="text-[#172554] block text-xs">{{ currentStudent().guardian.name }}</strong>
                    </div>

                    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span class="text-[#64748B] block text-[10px] uppercase font-bold tracking-wider">Relationship</span>
                      <strong class="text-[#172554] block text-xs">{{ currentStudent().guardian.relation }}</strong>
                    </div>

                    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span class="text-[#64748B] block text-[10px] uppercase font-bold tracking-wider">Emergency Contact Phone</span>
                      <strong class="text-[#172554] block text-xs font-mono">{{ currentStudent().guardian.phone }}</strong>
                    </div>
                  </div>

                  <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#64748B] flex items-center gap-2">
                    <mat-icon class="text-base text-[#6D42E8]">shield</mat-icon>
                    <span>Guardian receives institutional SMS advisories and fee clearance receipts via registered number.</span>
                  </div>
                </div>
              }

              <!-- Tab 4: Change Password (Validated against SettingsService.security) -->
              @case ('password') {
                <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="space-y-4">
                  <div class="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
                    <h3 class="font-extrabold text-[#172554] text-sm">Security Credentials & Password Policy</h3>
                    <span class="text-[11px] text-[#64748B]">Protected by institutional security rules</span>
                  </div>

                  @if (passError()) {
                    <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                      <mat-icon class="text-base text-rose-600">error_outline</mat-icon>
                      <span>{{ passError() }}</span>
                    </div>
                  }

                  <div class="space-y-1.5">
                    <label for="pass-curr" class="text-xs font-semibold text-[#172554]">
                      Current Password <span class="text-rose-500">*</span>
                    </label>
                    <input
                      id="pass-curr"
                      type="password"
                      formControlName="currentPassword"
                      placeholder="Enter current portal password"
                      class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                    />
                  </div>

                  <div class="space-y-1.5">
                    <label for="pass-new" class="text-xs font-semibold text-[#172554]">
                      New Password <span class="text-rose-500">*</span>
                    </label>
                    <input
                      id="pass-new"
                      type="password"
                      formControlName="newPassword"
                      placeholder="Minimum 8 characters with numbers & symbols"
                      class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                    />
                  </div>

                  <!-- Strength Meter -->
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
                      Must be at least {{ securityPolicy().minPasswordLength }} characters long, containing digits and special symbols.
                    </p>
                  </div>

                  <div class="space-y-1.5">
                    <label for="pass-conf" class="text-xs font-semibold text-[#172554]">
                      Confirm New Password <span class="text-rose-500">*</span>
                    </label>
                    <input
                      id="pass-conf"
                      type="password"
                      formControlName="confirmPassword"
                      placeholder="Re-type new password"
                      class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                    />
                  </div>

                  <div class="pt-4 border-t border-[#E2E8F0] flex justify-end">
                    <button
                      type="submit"
                      class="w-full sm:w-auto justify-center min-h-[44px] sm:min-h-0 gradient-accent text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:opacity-95 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap"
                    >
                      <mat-icon class="text-sm">lock</mat-icon>
                      <span>Update Password</span>
                    </button>
                  </div>
                </form>
              }

              <!-- Tab 5: My Sessions (Interactive terminate confirmation) -->
              @case ('sessions') {
                <div class="space-y-4">
                  <div class="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
                    <h3 class="font-extrabold text-[#172554] text-sm">Active Session Register</h3>
                    <span class="text-[11px] text-[#64748B]">Devices currently authenticated to your student account</span>
                  </div>

                  <div class="space-y-3">
                    @for (s of activeSessions(); track s.id) {
                      <div class="p-3.5 sm:p-4 rounded-xl border border-[#E2E8F0] bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3">
                        <div class="space-y-0.5 min-w-0">
                          <p class="font-bold text-[#172554] break-words">{{ s.device }} ({{ s.browser }})</p>
                          <p class="text-[11px] text-[#64748B] break-words">{{ s.location }} • IP: {{ s.ipAddress }} • Last active: {{ s.lastActive }}</p>
                        </div>
                        <div class="flex items-center gap-3 shrink-0">
                          @if (s.isCurrent) {
                            <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase whitespace-nowrap">
                              Current Device
                            </span>
                          } @else {
                            <button
                              type="button"
                              (click)="openTerminateConfirm(s.id)"
                              class="min-h-[40px] sm:min-h-0 px-2.5 py-1.5 rounded-lg border border-rose-200 sm:border-0 text-xs font-bold text-rose-600 hover:bg-rose-50 sm:hover:bg-transparent sm:hover:underline cursor-pointer flex items-center gap-1 whitespace-nowrap"
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
        message="Are you sure you want to invalidate this device session? The student will be logged out on that browser immediately."
        confirmLabel="Terminate Session"
        (cancelled)="isConfirmOpen.set(false)"
        (confirmed)="terminateSession()"
      />
    </div>
  `
})
export class StudentMyProfile {
  private readonly userService = inject(CurrentUserService);
  private readonly studentsService = inject(StudentsService);
  private readonly settingsService = inject(SettingsService);
  private readonly auditService = inject(AuditService);

  protected readonly activeTab = signal<'personal' | 'academic' | 'guardian' | 'password' | 'sessions'>('personal');
  protected readonly passError = signal<string>('');
  protected readonly isConfirmOpen = signal<boolean>(false);
  protected readonly sessionToTerminateId = signal<string | null>(null);

  protected readonly currentStudent = this.userService.currentStudent;
  protected readonly securityPolicy = this.settingsService.security;

  // Academic batch calculated from admission year
  protected readonly academicBatch = computed(() => {
    const s = this.currentStudent();
    const admYear = s.admissionDate ? parseInt(s.admissionDate.substring(0, 4), 10) : 2025;
    const durationYears = s.course.toLowerCase().includes('b.tech') ? 4 : s.course.toLowerCase().includes('mca') ? 2 : 3;
    return `${admYear}–${admYear + durationYears}`;
  });

  protected readonly activeSessions = signal<UserSessionItem[]>([
    {
      id: 'sess-1',
      device: 'Chrome on Windows 11 (Laptop)',
      browser: 'Chrome 124',
      location: 'New Delhi, India',
      ipAddress: '103.22.11.84',
      lastActive: 'Just now',
      isCurrent: true
    },
    {
      id: 'sess-2',
      device: 'Safari on iPhone 14 Pro',
      browser: 'Safari Mobile',
      location: 'Noida, India',
      ipAddress: '103.22.11.92',
      lastActive: 'Yesterday at 07:45 PM',
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

  constructor() {
    // Keep personalForm in sync whenever the logged-in demo student is switched
    effect(() => {
      const s = this.currentStudent();
      this.personalForm.reset({
        phone: s.phone || '',
        address: s.address || ''
      });
      this.personalForm.markAsPristine();
    });
  }

  protected savePersonalInfo(): void {
    if (this.personalForm.invalid) return;

    const val = this.personalForm.getRawValue();
    const student = this.currentStudent();

    const result = this.studentsService.saveStudent({
      enrollmentNo: student.enrollmentNo,
      name: student.name,
      gender: student.gender,
      dob: student.dob,
      email: student.email,
      phone: val.phone!.trim(),
      address: val.address!.trim(),
      courseId: student.courseId,
      course: student.course,
      departmentId: student.departmentId,
      department: student.department,
      semester: student.semester,
      sectionId: student.sectionId,
      section: student.section,
      admissionDate: student.admissionDate,
      status: student.status,
      guardian: student.guardian
    }, student.id);

    if (result.success) {
      this.auditService.log({
        userId: student.id,
        userName: student.name,
        role: 'Student',
        module: 'Student Profile',
        action: 'Update',
        target: 'Contact Phone & Address',
        status: 'Success'
      });

      this.personalForm.markAsPristine();
      this.studentsService.showToast('success', 'Profile contact coordinates updated successfully.');
    } else {
      this.studentsService.showToast('error', result.error || 'Failed to update profile.');
    }
  }

  protected readonly passwordScore = computed(() => {
    const pwd = this.passwordForm.get('newPassword')?.value || '';
    let score = 0;
    if (pwd.length >= this.securityPolicy().minPasswordLength) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++;
    return score;
  });

  protected changePassword(): void {
    this.passError.set('');
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
      this.passError.set(
        `New password must be at least ${this.securityPolicy().minPasswordLength} characters long and include numbers and special symbols.`
      );
      return;
    }

    const student = this.currentStudent();
    this.auditService.log({
      userId: student.id,
      userName: student.name,
      role: 'Student',
      module: 'Student Security',
      action: 'Update',
      target: 'Password Change',
      status: 'Success'
    });

    this.passwordForm.reset();
    this.studentsService.showToast('success', 'Password credentials updated successfully.');
  }

  protected openTerminateConfirm(id: string): void {
    this.sessionToTerminateId.set(id);
    this.isConfirmOpen.set(true);
  }

  protected terminateSession(): void {
    const id = this.sessionToTerminateId();
    if (id) {
      this.activeSessions.update(list => list.filter(s => s.id !== id));
      this.isConfirmOpen.set(false);
      this.studentsService.showToast('info', 'Device session invalidated.');
    }
  }
}
