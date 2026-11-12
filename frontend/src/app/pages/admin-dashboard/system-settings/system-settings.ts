import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SettingsService, InstituteProfile, AcademicDefaults, SecurityPolicy, NotificationSettings } from '../../../services/settings.service';
import { AuditService } from '../../../services/audit.service';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6 animate-fade-in pb-20">
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-[#172554] tracking-tight">System Settings</h1>
          <p class="text-sm text-slate-500 mt-1">Configure global institute parameters, academic defaults, and security policies.</p>
        </div>
      </div>

      <div class="flex flex-col lg:flex-row gap-6">
        <!-- Sidebar Tabs -->
        <aside class="lg:w-64 shrink-0">
          <nav class="flex flex-row lg:flex-col gap-1 bg-white p-2 rounded-2xl border border-slate-200 overflow-x-auto lg:overflow-visible no-scrollbar shadow-sm">
            @for (tab of tabs; track tab.id) {
              <button
                (click)="activeTab.set(tab.id)"
                [class]="activeTab() === tab.id ? 'bg-[#6D42E8] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'"
                class="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
              >
                <mat-icon class="text-lg">{{ tab.icon }}</mat-icon>
                <span>{{ tab.label }}</span>
              </button>
            }
          </nav>
        </aside>

        <!-- Main Form Area -->
        <main class="flex-1 min-w-0">
          <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <!-- Tab Content: Profile -->
            @if (activeTab() === 'profile') {
              <div class="p-6 space-y-6">
                <div class="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div class="w-10 h-10 rounded-xl bg-purple-100 text-[#6D42E8] flex items-center justify-center">
                    <mat-icon>business</mat-icon>
                  </div>
                  <div>
                    <h3 class="font-bold text-slate-900 text-sm">Institute Profile</h3>
                    <p class="text-[11px] text-slate-500">Official name and contact details for documents.</p>
                  </div>
                </div>

                <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div class="space-y-1.5 md:col-span-2">
                    <label for="prof-name" class="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Institute Name</label>
                    <input id="prof-name" type="text" formControlName="name" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all">
                  </div>
                  <div class="space-y-1.5 md:col-span-2">
                    <label for="prof-addr" class="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Address</label>
                    <textarea id="prof-addr" rows="3" formControlName="address" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all"></textarea>
                  </div>
                  <div class="space-y-1.5">
                    <label for="prof-cont" class="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Contact Number</label>
                    <input id="prof-cont" type="text" formControlName="contact" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all">
                  </div>
                  <div class="space-y-1.5">
                    <label for="prof-email" class="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Email Address</label>
                    <input id="prof-email" type="email" formControlName="email" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all">
                  </div>
                  <div class="md:col-span-2 flex justify-end pt-4">
                    <button type="submit" [disabled]="profileForm.pristine || profileForm.invalid" class="bg-[#6D42E8] text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-purple-900/30 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                      <mat-icon class="text-sm">save</mat-icon> Save Changes
                    </button>
                  </div>
                </form>
              </div>
            }

            <!-- Tab Content: Academic -->
            @if (activeTab() === 'academic') {
              <div class="p-6 space-y-6">
                <div class="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <mat-icon>school</mat-icon>
                  </div>
                  <div>
                    <h3 class="font-bold text-slate-900 text-sm">Academic Defaults</h3>
                    <p class="text-[11px] text-slate-500">Global thresholds and current academic session.</p>
                  </div>
                </div>

                <form [formGroup]="academicForm" (ngSubmit)="saveAcademic()" class="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div class="space-y-1.5">
                    <label for="acad-year" class="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Current Academic Year</label>
                    <select id="acad-year" formControlName="currentAcademicYear" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all appearance-none">
                      <option value="2024-25">2024-25</option>
                      <option value="2025-26">2025-26</option>
                      <option value="2026-27">2026-27</option>
                    </select>
                  </div>
                  <div class="space-y-1.5">
                    <label for="acad-att" class="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Attendance Threshold (%)</label>
                    <input id="acad-att" type="number" formControlName="attendanceThreshold" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all">
                  </div>
                  <div class="space-y-1.5">
                    <label for="acad-pass" class="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Minimum Passing (%)</label>
                    <input id="acad-pass" type="number" formControlName="passingPercentage" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all">
                  </div>
                  <div class="md:col-span-2 flex justify-end pt-4">
                    <button type="submit" [disabled]="academicForm.pristine || academicForm.invalid" class="bg-[#6D42E8] text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-purple-900/30 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                      <mat-icon class="text-sm">save</mat-icon> Save Changes
                    </button>
                  </div>
                </form>
              </div>
            }

            <!-- Tab Content: Grading -->
            @if (activeTab() === 'grading') {
              <div class="p-6 space-y-6">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                      <mat-icon>grade</mat-icon>
                    </div>
                    <div>
                      <h3 class="font-bold text-slate-900 text-sm">Grading Scale</h3>
                      <p class="text-[11px] text-slate-500">Definition of letter grades and grade points.</p>
                    </div>
                  </div>
                </div>

                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs">
                    <thead>
                      <tr class="bg-slate-50 border-b border-slate-100">
                        <th class="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Grade</th>
                        <th class="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Min %</th>
                        <th class="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Max %</th>
                        <th class="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Points</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                      @for (g of gradeScale(); track g.id) {
                        <tr>
                          <td class="px-4 py-3 font-extrabold text-slate-900">{{ g.grade }}</td>
                          <td class="px-4 py-3 text-slate-600 tabular-nums">{{ g.minPercentage }}%</td>
                          <td class="px-4 py-3 text-slate-600 tabular-nums">{{ g.maxPercentage }}%</td>
                          <td class="px-4 py-3 font-bold text-[#6D42E8] tabular-nums">{{ g.points }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
                <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                  <mat-icon class="text-blue-500 text-sm">info</mat-icon>
                  <p class="text-[11px] text-blue-700 leading-relaxed">The grading scale is globally applied to all results calculation. Changes to this scale will affect all academic records retrospectively.</p>
                </div>
              </div>
            }

            <!-- Tab Content: Security -->
            @if (activeTab() === 'security') {
              <div class="p-6 space-y-6">
                <div class="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div class="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                    <mat-icon>security</mat-icon>
                  </div>
                  <div>
                    <h3 class="font-bold text-slate-900 text-sm">Security Policy</h3>
                    <p class="text-[11px] text-slate-500">Manage password requirements and session controls.</p>
                  </div>
                </div>

                <form [formGroup]="securityForm" (ngSubmit)="saveSecurity()" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div class="space-y-1.5">
                    <label for="sec-pass-len" class="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Minimum Password Length</label>
                    <input id="sec-pass-len" type="number" formControlName="minPasswordLength" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all">
                  </div>
                  <div class="space-y-1.5">
                    <label for="sec-tout" class="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Session Timeout (Minutes)</label>
                    <input id="sec-tout" type="number" formControlName="sessionTimeoutMinutes" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all">
                  </div>
                  
                  <div class="flex flex-col gap-4">
                    <label class="flex items-center gap-3 cursor-pointer group">
                      <div class="relative inline-flex items-center">
                        <input type="checkbox" formControlName="requireNumber" class="sr-only peer">
                        <div class="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-[#6D42E8] transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                      </div>
                      <span class="text-xs font-bold text-slate-700">Require Numbers in Password</span>
                    </label>

                    <label class="flex items-center gap-3 cursor-pointer group">
                      <div class="relative inline-flex items-center">
                        <input type="checkbox" formControlName="requireSymbol" class="sr-only peer">
                        <div class="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-[#6D42E8] transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                      </div>
                      <span class="text-xs font-bold text-slate-700">Require Symbols in Password</span>
                    </label>
                  </div>

                  <div class="space-y-1.5">
                    <label for="sec-fail" class="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Max Failed Login Attempts</label>
                    <input id="sec-fail" type="number" formControlName="maxFailedLogins" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all">
                  </div>

                  <div class="md:col-span-2 flex justify-end pt-4">
                    <button type="submit" [disabled]="securityForm.pristine || securityForm.invalid" class="bg-[#6D42E8] text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-purple-900/30 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                      <mat-icon class="text-sm">save</mat-icon> Save Changes
                    </button>
                  </div>
                </form>
              </div>
            }

            <!-- Tab Content: Notifications -->
            @if (activeTab() === 'notifications') {
              <div class="p-6 space-y-6">
                <div class="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <mat-icon>notifications_active</mat-icon>
                  </div>
                  <div>
                    <h3 class="font-bold text-slate-900 text-sm">System Notifications</h3>
                    <p class="text-[11px] text-slate-500">Configure global triggers for in-app and email alerts.</p>
                  </div>
                </div>

                <form [formGroup]="notifForm" (ngSubmit)="saveNotifs()" class="space-y-5">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    @for (field of notifFields; track field.id) {
                      <div class="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-purple-200 transition-colors">
                        <div class="flex items-center gap-3">
                          <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500">
                            <mat-icon class="text-base">{{ field.icon }}</mat-icon>
                          </div>
                          <div>
                            <p class="text-xs font-bold text-slate-800">{{ field.label }}</p>
                            <p class="text-[10px] text-slate-500">{{ field.desc }}</p>
                          </div>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" [formControlName]="field.id" class="sr-only peer">
                          <div class="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-[#6D42E8] transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                        </label>
                      </div>
                    }
                  </div>

                  <div class="flex justify-end pt-4">
                    <button type="submit" [disabled]="notifForm.pristine" class="bg-[#6D42E8] text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-purple-900/30 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                      <mat-icon class="text-sm">save</mat-icon> Save Changes
                    </button>
                  </div>
                </form>
              </div>
            }
          </div>
        </main>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SystemSettingsPage {
  private readonly fb = inject(FormBuilder);
  private readonly settingsService = inject(SettingsService);
  private readonly auditService = inject(AuditService);

  protected readonly activeTab = signal<string>('profile');
  protected readonly gradeScale = this.settingsService.gradeScale;

  protected readonly tabs = [
    { id: 'profile', label: 'Institute Profile', icon: 'business' },
    { id: 'academic', label: 'Academic Defaults', icon: 'school' },
    { id: 'grading', label: 'Grading Scale', icon: 'grade' },
    { id: 'security', label: 'Security Policy', icon: 'security' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications' }
  ];

  protected readonly notifFields = [
    { id: 'inAppAlerts', label: 'Global In-App Alerts', desc: 'Main toggle for all system notifications.', icon: 'desktop_windows' },
    { id: 'feeAlerts', label: 'Fee Overdue Alerts', desc: 'Trigger alerts when payments are overdue.', icon: 'payments' },
    { id: 'attendanceAlerts', label: 'Low Attendance Alerts', desc: 'Notify students below threshold.', icon: 'how_to_reg' },
    { id: 'examAlerts', label: 'Exam Schedule Alerts', desc: 'Announce new exam timetables.', icon: 'assignment' }
  ];

  protected readonly profileForm = this.fb.group({
    name: [this.settingsService.profile().name, Validators.required],
    address: [this.settingsService.profile().address, Validators.required],
    contact: [this.settingsService.profile().contact, Validators.required],
    email: [this.settingsService.profile().email, [Validators.required, Validators.email]]
  });

  protected readonly academicForm = this.fb.group({
    currentAcademicYear: [this.settingsService.academic().currentAcademicYear, Validators.required],
    attendanceThreshold: [this.settingsService.academic().attendanceThreshold, [Validators.required, Validators.min(0), Validators.max(100)]],
    passingPercentage: [this.settingsService.academic().passingPercentage, [Validators.required, Validators.min(0), Validators.max(100)]]
  });

  protected readonly securityForm = this.fb.group({
    minPasswordLength: [this.settingsService.security().minPasswordLength, [Validators.required, Validators.min(4)]],
    requireNumber: [this.settingsService.security().requireNumber],
    requireSymbol: [this.settingsService.security().requireSymbol],
    sessionTimeoutMinutes: [this.settingsService.security().sessionTimeoutMinutes, [Validators.required, Validators.min(5)]],
    maxFailedLogins: [this.settingsService.security().maxFailedLogins, [Validators.required, Validators.min(1)]]
  });

  protected readonly notifForm = this.fb.group({
    inAppAlerts: [this.settingsService.notifications().inAppAlerts],
    feeAlerts: [this.settingsService.notifications().feeAlerts],
    attendanceAlerts: [this.settingsService.notifications().attendanceAlerts],
    examAlerts: [this.settingsService.notifications().examAlerts]
  });

  saveProfile() {
    if (this.profileForm.valid) {
      const data = this.profileForm.value as InstituteProfile;
      this.settingsService.updateProfile(data);
      this.auditService.log({
        userId: 'u1', userName: 'Administrator', role: 'Super Admin',
        module: 'Settings', action: 'Update', target: 'Institute Profile',
        oldValue: 'Previous Profile', newValue: JSON.stringify(data),
        status: 'Success'
      });
      this.profileForm.markAsPristine();
    }
  }

  saveAcademic() {
    if (this.academicForm.valid) {
      const data = this.academicForm.value as AcademicDefaults;
      this.settingsService.updateAcademic(data);
      this.auditService.log({
        userId: 'u1', userName: 'Administrator', role: 'Super Admin',
        module: 'Settings', action: 'Update', target: 'Academic Defaults',
        oldValue: 'Previous Academic Defaults', newValue: JSON.stringify(data),
        status: 'Success'
      });
      this.academicForm.markAsPristine();
    }
  }

  saveSecurity() {
    if (this.securityForm.valid) {
      const data = this.securityForm.value as SecurityPolicy;
      this.settingsService.updateSecurity(data);
      this.auditService.log({
        userId: 'u1', userName: 'Administrator', role: 'Super Admin',
        module: 'Settings', action: 'Update', target: 'Security Policy',
        oldValue: 'Previous Security Policy', newValue: JSON.stringify(data),
        status: 'Success'
      });
      this.securityForm.markAsPristine();
    }
  }

  saveNotifs() {
    if (this.notifForm.valid) {
      const data = this.notifForm.value as NotificationSettings;
      this.settingsService.updateNotifications(data);
      this.auditService.log({
        userId: 'u1', userName: 'Administrator', role: 'Super Admin',
        module: 'Settings', action: 'Update', target: 'Notification Settings',
        oldValue: 'Previous Notification Settings', newValue: JSON.stringify(data),
        status: 'Success'
      });
      this.notifForm.markAsPristine();
    }
  }
}
