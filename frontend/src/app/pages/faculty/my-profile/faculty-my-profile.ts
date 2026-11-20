import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { CurrentUserService } from '../../../services/current-user.service';
import { FacultyService } from '../../../services/faculty.service';
import { AcademicService } from '../../../services/academic.service';
import { SettingsService } from '../../../services/settings.service';
import { AuditService } from '../../../services/audit.service';
import { StudentsService } from '../../../services/students.service';

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
  selector: 'app-faculty-my-profile',
  imports: [ReactiveFormsModule, MatIconModule, PageHeader, ConfirmDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-slate-800 pb-20">
      <app-page-header
        title="My Faculty Profile & Security"
        subtitle="Manage personal contact details, view professional allocations, and update credentials."
      />

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Left Profile Identity Card -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5 sm:space-y-6 h-fit min-w-0">
          <div class="flex flex-col items-center text-center space-y-3">
            <div class="w-20 h-20 rounded-full gradient-accent p-0.5 shadow-md">
              <div class="w-full h-full rounded-full bg-[#1A1745] flex items-center justify-center text-2xl font-black text-white">
                {{ currentFaculty().initials }}
              </div>
            </div>
            <div>
              <h2 class="text-base font-black text-slate-900">{{ currentFaculty().name }}</h2>
              <span class="px-2.5 py-0.5 rounded-full bg-purple-50 text-[#6D42E8] font-bold text-[10px] uppercase tracking-wider inline-block mt-1">
                {{ currentFaculty().designation }}
              </span>
            </div>
          </div>

          <div class="divide-y divide-slate-100 text-xs pt-2">
            <div class="flex items-center justify-between gap-3 py-2.5">
              <span class="text-slate-500 font-medium shrink-0">Department</span>
              <span class="font-bold text-slate-900 text-right truncate">{{ currentFaculty().department }}</span>
            </div>
            <div class="flex items-center justify-between gap-3 py-2.5">
              <span class="text-slate-500 font-medium shrink-0">Employee ID</span>
              <span class="font-mono font-bold text-slate-900 whitespace-nowrap">{{ currentFaculty().employeeId }}</span>
            </div>
            <div class="flex items-center justify-between gap-3 py-2.5">
              <span class="text-slate-500 font-medium shrink-0">Email</span>
              <span class="font-bold text-slate-900 text-right truncate">{{ currentFaculty().email }}</span>
            </div>
            <div class="flex items-center justify-between gap-3 py-2.5">
              <span class="text-slate-500 font-medium shrink-0">Joining Date</span>
              <span class="font-mono text-slate-700 whitespace-nowrap">{{ currentFaculty().joiningDate }}</span>
            </div>
            <div class="flex items-center justify-between gap-3 py-2.5">
              <span class="text-slate-500 font-medium shrink-0">Status</span>
              <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[10px] uppercase whitespace-nowrap">
                {{ currentFaculty().status }}
              </span>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 space-y-1">
            <p>Last Login: <strong class="text-slate-800">Today at 08:30 AM</strong></p>
            <p>IP Address: <strong class="text-slate-800">103.22.11.84</strong></p>
          </div>
        </div>

        <!-- Right Tabs Content Area -->
        <div class="lg:col-span-2 space-y-6 min-w-0">
          <!-- Tab Navigation -->
          <div class="flex items-center gap-2 border-b border-slate-200 overflow-x-auto scrollbar-none">
            <button
              (click)="activeTab.set('personal')"
              [class]="activeTab() === 'personal' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold bg-white' : 'text-slate-500 hover:text-slate-800 font-medium'"
              class="px-4 sm:px-5 py-3 text-xs transition-all cursor-pointer rounded-t-xl whitespace-nowrap shrink-0"
            >
              Personal Info
            </button>
            <button
              (click)="activeTab.set('professional')"
              [class]="activeTab() === 'professional' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold bg-white' : 'text-slate-500 hover:text-slate-800 font-medium'"
              class="px-4 sm:px-5 py-3 text-xs transition-all cursor-pointer rounded-t-xl whitespace-nowrap shrink-0"
            >
              Professional
            </button>
            <button
              (click)="activeTab.set('password')"
              [class]="activeTab() === 'password' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold bg-white' : 'text-slate-500 hover:text-slate-800 font-medium'"
              class="px-4 sm:px-5 py-3 text-xs transition-all cursor-pointer rounded-t-xl whitespace-nowrap shrink-0"
            >
              Change Password
            </button>
            <button
              (click)="activeTab.set('sessions')"
              [class]="activeTab() === 'sessions' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold bg-white' : 'text-slate-500 hover:text-slate-800 font-medium'"
              class="px-4 sm:px-5 py-3 text-xs transition-all cursor-pointer rounded-t-xl whitespace-nowrap shrink-0"
            >
              Active Sessions
            </button>
          </div>

          <!-- Tab Content Cards -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
            @switch (activeTab()) {
              @case ('personal') {
                <form [formGroup]="personalForm" (ngSubmit)="savePersonalInfo()" class="space-y-4">
                  <h3 class="font-extrabold text-slate-900 text-sm pb-2 border-b border-slate-100">Personal Contact Information</h3>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-1.5">
                      <label for="prof-readonly-name" class="text-xs font-semibold text-slate-800">Full Name (Read-only)</label>
                      <input id="prof-readonly-name" [value]="currentFaculty().name" disabled class="w-full h-10 px-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium" />
                    </div>
                    <div class="space-y-1.5">
                      <label for="prof-readonly-email" class="text-xs font-semibold text-slate-800">Email Address (Read-only)</label>
                      <input id="prof-readonly-email" [value]="currentFaculty().email" disabled class="w-full h-10 px-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium" />
                    </div>
                  </div>

                  <div class="space-y-1.5">
                    <label for="prof-phone" class="text-xs font-semibold text-slate-800">Phone Number <span class="text-rose-500">*</span></label>
                    <input id="prof-phone" formControlName="phone" placeholder="10-digit mobile number" class="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
                  </div>

                  <div class="space-y-1.5">
                    <label for="prof-address" class="text-xs font-semibold text-slate-800">Residential Address <span class="text-rose-500">*</span></label>
                    <textarea id="prof-address" formControlName="address" rows="3" placeholder="Enter complete address..." class="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"></textarea>
                  </div>

                  <div class="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      [disabled]="personalForm.invalid || !personalForm.dirty"
                      class="w-full sm:w-auto justify-center gradient-accent text-white px-6 py-2.5 rounded-xl text-xs font-extrabold shadow-md hover:scale-105 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2 whitespace-nowrap"
                    >
                      <mat-icon class="text-sm shrink-0">save</mat-icon> Save Changes
                    </button>
                  </div>
                </form>
              }

              @case ('professional') {
                <div class="space-y-5">
                  <div class="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 text-xs text-purple-900 flex items-start sm:items-center gap-2">
                    <mat-icon class="text-base text-[#6D42E8] shrink-0">info</mat-icon>
                    <span>Contact Administration to update official designation, department or qualification records.</span>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span class="text-slate-400 block text-[10px]">Academic Qualification</span>
                      <strong class="text-slate-900 block text-xs">{{ currentFaculty().qualification }}</strong>
                    </div>
                    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span class="text-slate-400 block text-[10px]">Teaching Experience</span>
                      <strong class="text-slate-900 block text-xs">{{ currentFaculty().experience }}</strong>
                    </div>
                  </div>

                  <div class="space-y-3 pt-2">
                    <h4 class="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Allocated Subjects (Academic Session 2025-26)</h4>
                    <div class="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                      @for (alloc of myAllocations(); track alloc.id) {
                        <div class="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div class="min-w-0">
                            <p class="font-bold text-slate-900">{{ alloc.subject }}</p>
                            <p class="text-[10px] text-slate-500 mt-0.5">{{ alloc.course }} • {{ alloc.semester }} ({{ alloc.section }})</p>
                          </div>
                          <span class="px-2.5 py-1 rounded-full bg-purple-50 text-[#6D42E8] font-bold text-[10px] self-start sm:self-auto whitespace-nowrap shrink-0">{{ alloc.weeklyHours }} Hours / Week</span>
                        </div>
                      } @empty {
                        <p class="p-4 text-xs text-slate-400 italic text-center">No active subject allocations.</p>
                      }
                    </div>
                  </div>
                </div>
              }

              @case ('password') {
                <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="space-y-4">
                  <h3 class="font-extrabold text-slate-900 text-sm pb-2 border-b border-slate-100">Security Credentials & Password Policy</h3>

                  @if (passError()) {
                    <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                      <mat-icon class="text-base text-rose-600 shrink-0">error_outline</mat-icon>
                      <span>{{ passError() }}</span>
                    </div>
                  }

                  <div class="space-y-1.5">
                    <label for="pass-curr" class="text-xs font-semibold text-slate-800">Current Password <span class="text-rose-500">*</span></label>
                    <input id="pass-curr" type="password" formControlName="currentPassword" class="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
                  </div>

                  <div class="space-y-1.5">
                    <label for="pass-new" class="text-xs font-semibold text-slate-800">New Password <span class="text-rose-500">*</span></label>
                    <input id="pass-new" type="password" formControlName="newPassword" class="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
                  </div>

                  <!-- Strength Meter -->
                  <div class="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <div class="flex justify-between items-center text-[10px] font-bold text-slate-600">
                      <span>Password Strength</span>
                      <span [class]="passwordScore() >= 3 ? 'text-emerald-600' : 'text-amber-600'">
                        {{ passwordScore() >= 3 ? 'Strong' : 'Moderate' }}
                      </span>
                    </div>
                    <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div [style.width.%]="(passwordScore() / 3) * 100" [class]="passwordScore() >= 3 ? 'bg-emerald-500' : 'bg-amber-500'" class="h-full rounded-full transition-all"></div>
                    </div>
                    <p class="text-[10px] text-slate-400 mt-1">Must be at least {{ securityPolicy().minPasswordLength }} chars, containing numbers & symbols.</p>
                  </div>

                  <div class="space-y-1.5">
                    <label for="pass-conf" class="text-xs font-semibold text-slate-800">Confirm New Password <span class="text-rose-500">*</span></label>
                    <input id="pass-conf" type="password" formControlName="confirmPassword" class="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
                  </div>

                  <div class="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      class="w-full sm:w-auto justify-center gradient-accent text-white px-6 py-2.5 rounded-xl text-xs font-extrabold shadow-md hover:scale-105 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap"
                    >
                      <mat-icon class="text-sm shrink-0">lock</mat-icon> Update Password
                    </button>
                  </div>
                </form>
              }

              @case ('sessions') {
                <div class="space-y-4">
                  <h3 class="font-extrabold text-slate-900 text-sm">Active Session Register</h3>
                  <div class="space-y-3">
                    @for (s of activeSessions(); track s.id) {
                      <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                        <div class="min-w-0">
                          <p class="font-bold text-slate-900">{{ s.device }} ({{ s.browser }})</p>
                          <p class="text-[10px] text-slate-500 mt-0.5">{{ s.location }} • IP: {{ s.ipAddress }} • Last active: {{ s.lastActive }}</p>
                        </div>
                        <div class="flex items-center gap-3 self-start sm:self-auto shrink-0">
                          @if (s.isCurrent) {
                            <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase whitespace-nowrap">Current</span>
                          } @else {
                            <button
                              (click)="openTerminateConfirm(s.id)"
                              class="text-xs font-bold text-rose-600 hover:underline cursor-pointer whitespace-nowrap"
                            >
                              Terminate
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

      <app-confirm-dialog
        [isOpen]="isConfirmOpen()"
        title="Terminate Active Session"
        message="Are you sure you want to invalidate this device session? The user will be logged out on that device."
        confirmLabel="Terminate Session"
        (cancelled)="isConfirmOpen.set(false)"
        (confirmed)="terminateSession()"
      />
    </div>
  `
})
export class FacultyMyProfilePage {
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(CurrentUserService);
  private readonly facultyService = inject(FacultyService);
  private readonly academicService = inject(AcademicService);
  private readonly settingsService = inject(SettingsService);
  private readonly auditService = inject(AuditService);
  private readonly studentsService = inject(StudentsService);

  private readonly routeTab = toSignal(
    this.route.queryParamMap.pipe(map(params => params.get('tab'))),
    { initialValue: null }
  );

  protected readonly activeTab = signal<'personal' | 'professional' | 'password' | 'sessions'>('personal');
  protected readonly passError = signal<string>('');
  protected readonly isConfirmOpen = signal<boolean>(false);
  protected readonly sessionToTerminateId = signal<string | null>(null);

  protected readonly currentFaculty = this.userService.currentFaculty;
  protected readonly securityPolicy = this.settingsService.security;

  constructor() {
    effect(() => {
      const t = this.routeTab();
      if (t === 'personal' || t === 'professional' || t === 'password' || t === 'sessions') {
        this.activeTab.set(t);
      }
    });
  }

  protected readonly myAllocations = computed(() => {
    const fac = this.currentFaculty();
    return this.academicService.subjectAllocations().filter(a => a.faculty.toLowerCase().trim() === fac.name.toLowerCase().trim());
  });

  protected readonly activeSessions = signal<UserSessionItem[]>([
    { id: 'sess-1', device: 'Chrome on macOS (MacBook Pro)', browser: 'Chrome 122', location: 'New Delhi, India', ipAddress: '103.22.11.84', lastActive: 'Just now', isCurrent: true },
    { id: 'sess-2', device: 'Safari on iPhone 15', browser: 'Safari Mobile', location: 'Noida, India', ipAddress: '103.22.11.90', lastActive: 'Yesterday', isCurrent: false }
  ]);

  protected readonly personalForm = new FormGroup({
    phone: new FormControl(this.currentFaculty().phone || '9811004455', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]),
    address: new FormControl('Sector 62, Noida, UP', Validators.required)
  });

  protected readonly passwordForm = new FormGroup({
    currentPassword: new FormControl('', Validators.required),
    newPassword: new FormControl('', Validators.required),
    confirmPassword: new FormControl('', Validators.required)
  });

  protected savePersonalInfo(): void {
    if (this.personalForm.invalid) return;

    const val = this.personalForm.getRawValue();
    const fac = this.currentFaculty();

    this.facultyService.saveFaculty({
      employeeId: fac.employeeId,
      name: fac.name,
      gender: fac.gender,
      email: fac.email,
      phone: val.phone!,
      departmentId: fac.departmentId,
      department: fac.department,
      designation: fac.designation,
      qualification: fac.qualification,
      experienceYears: fac.experienceYears,
      joiningDate: fac.joiningDate,
      status: fac.status
    }, fac.id);

    this.auditService.log({
      userId: fac.id,
      userName: fac.name,
      role: fac.designation,
      module: 'Faculty Profile',
      action: 'Update',
      target: 'Contact Phone & Address',
      status: 'Success'
    });

    this.studentsService.showToast('success', 'Profile contact details updated.');
    this.personalForm.markAsPristine();
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
      this.passError.set('Please enter your current password.');
      return;
    }

    if (val.newPassword !== val.confirmPassword) {
      this.passError.set('New password and confirm password do not match.');
      return;
    }

    if (this.passwordScore() < 3) {
      this.passError.set(`New password must be at least ${this.securityPolicy().minPasswordLength} chars long and contain numbers and symbols.`);
      return;
    }

    const fac = this.currentFaculty();
    this.auditService.log({
      userId: fac.id,
      userName: fac.name,
      role: fac.designation,
      module: 'Security',
      action: 'Update',
      target: 'Password Change',
      status: 'Success'
    });

    this.passwordForm.reset();
    this.studentsService.showToast('success', 'Password updated successfully.');
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
      this.studentsService.showToast('info', 'Session terminated.');
    }
  }
}
