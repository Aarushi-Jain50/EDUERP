import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuditService } from '../../../services/audit.service';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, MatIconModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6 animate-fade-in pb-20 max-w-5xl mx-auto">
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-[#172554] tracking-tight">My Profile</h1>
          <p class="text-sm text-slate-500 mt-1">Manage your personal information, security preferences, and account settings.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Profile Card -->
        <div class="lg:col-span-1 space-y-6">
          <div class="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center flex flex-col items-center">
            <div class="relative group">
              <div class="w-32 h-32 rounded-full bg-gradient-to-tr from-[#6D42E8] to-[#D946EF] p-1 shadow-xl">
                <div class="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                  <span class="text-4xl font-black text-[#6D42E8]">AD</span>
                </div>
              </div>
              <button class="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-[#6D42E8] text-white border-4 border-white flex items-center justify-center hover:scale-110 transition-transform cursor-pointer shadow-lg">
                <mat-icon class="text-lg">photo_camera</mat-icon>
              </button>
            </div>
            
            <h2 class="text-xl font-black text-slate-900 mt-6 tracking-tight">Administrator</h2>
            <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">ERP Super Admin</p>
            
            <div class="w-full mt-8 space-y-3">
              <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 text-xs">
                <span class="text-slate-500">Employee ID</span>
                <span class="font-bold text-slate-900 tabular-nums">EMP-1001</span>
              </div>
              <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 text-xs">
                <span class="text-slate-500">Department</span>
                <span class="font-bold text-slate-900">IT Administration</span>
              </div>
              <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 text-xs">
                <span class="text-slate-500">Joining Date</span>
                <span class="font-bold text-slate-900">Aug 15, 2022</span>
              </div>
            </div>

            <div class="w-full mt-8 pt-6 border-t border-slate-100">
              <div class="flex items-center justify-center gap-4">
                <div class="text-center">
                  <p class="text-lg font-black text-[#6D42E8] tabular-nums">42</p>
                  <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Reports View</p>
                </div>
                <div class="h-8 w-px bg-slate-100"></div>
                <div class="text-center">
                  <p class="text-lg font-black text-[#6D42E8] tabular-nums">156</p>
                  <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">System Logs</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Stats -->
          <div class="bg-[#172554] p-6 rounded-3xl shadow-xl text-white overflow-hidden relative">
            <div class="absolute -right-8 -bottom-8 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl"></div>
            <h4 class="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Security Strength</h4>
            <div class="flex items-center gap-3">
              <div class="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div class="h-full bg-emerald-400 w-[85%] rounded-full"></div>
              </div>
              <span class="text-xs font-bold text-emerald-400">85%</span>
            </div>
            <p class="text-[10px] text-slate-300 mt-4 leading-relaxed italic">"Your account is protected with 2FA and strong password policy."</p>
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
                <p class="text-[11px] text-slate-500">Update your basic details and how people see you.</p>
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
                <select id="perf-tz" formControlName="timezone" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all appearance-none">
                  <option value="IST">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC (Greenwich Mean Time)</option>
                </select>
              </div>
              <div class="md:col-span-2 flex justify-end">
                <button type="submit" [disabled]="personalForm.pristine" class="bg-[#6D42E8] text-white px-8 py-3 rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-purple-900/30 transition-all disabled:opacity-50 cursor-pointer">
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
                <h3 class="font-bold text-slate-900 text-sm">Security & Password</h3>
                <p class="text-[11px] text-slate-500">Ensure your account remains safe with regular password updates.</p>
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
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Password Requirements:</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                  <div class="flex items-center gap-2 text-[10px] font-medium" [class]="hasMinLength() ? 'text-emerald-600' : 'text-slate-400'">
                    <mat-icon class="text-[14px]">check_circle</mat-icon> Minimum 8 characters
                  </div>
                  <div class="flex items-center gap-2 text-[10px] font-medium" [class]="hasNumber() ? 'text-emerald-600' : 'text-slate-400'">
                    <mat-icon class="text-[14px]">check_circle</mat-icon> At least one number
                  </div>
                  <div class="flex items-center gap-2 text-[10px] font-medium" [class]="hasSymbol() ? 'text-emerald-600' : 'text-slate-400'">
                    <mat-icon class="text-[14px]">check_circle</mat-icon> At least one symbol
                  </div>
                  <div class="flex items-center gap-2 text-[10px] font-medium" [class]="passMatch() ? 'text-emerald-600' : 'text-slate-400'">
                    <mat-icon class="text-[14px]">check_circle</mat-icon> Passwords match
                  </div>
                </div>
              </div>

              <div class="flex justify-end">
                <button type="submit" [disabled]="passwordForm.invalid || !passMatch()" class="bg-slate-900 text-white px-8 py-3 rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-slate-900/30 transition-all disabled:opacity-50 cursor-pointer">
                  Change Password
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

  protected readonly showPass = signal(false);

  protected readonly personalForm = this.fb.group({
    fullName: ['Administrator', Validators.required],
    email: ['admin@eduerp.edu', [Validators.required, Validators.email]],
    phone: ['+91 9876543210', Validators.required],
    timezone: ['IST']
  });

  protected readonly passwordForm = this.fb.group({
    current: ['', Validators.required],
    new: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', Validators.required]
  });

  savePersonal() {
    if (this.personalForm.valid) {
      this.auditService.log({
        userId: 'u1', userName: 'Administrator', role: 'Super Admin',
        module: 'Profile', action: 'Update', target: 'Personal Details',
        newValue: JSON.stringify(this.personalForm.value),
        status: 'Success'
      });
      this.personalForm.markAsPristine();
    }
  }

  changePassword() {
    if (this.passwordForm.valid && this.passMatch()) {
      this.auditService.log({
        userId: 'u1', userName: 'Administrator', role: 'Super Admin',
        module: 'Profile', action: 'Update', target: 'Account Password',
        status: 'Success'
      });
      this.passwordForm.reset();
    }
  }

  hasMinLength(): boolean {
    return (this.passwordForm.get('new')?.value?.length || 0) >= 8;
  }

  hasNumber(): boolean {
    return /\d/.test(this.passwordForm.get('new')?.value || '');
  }

  hasSymbol(): boolean {
    return /[!@#$%^&*(),.?":{}|<>]/.test(this.passwordForm.get('new')?.value || '');
  }

  passMatch(): boolean {
    const newVal = this.passwordForm.get('new')?.value;
    const confirmVal = this.passwordForm.get('confirm')?.value;
    return Boolean(newVal && newVal === confirmVal);
  }
}
