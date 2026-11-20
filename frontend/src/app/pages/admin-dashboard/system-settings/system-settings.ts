import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import {
  AcademicDefaults,
  DEFAULT_GRADE_SCALE,
  FeeSettings,
  GradeScale,
  InstituteProfile,
  NotificationSettings,
  SecurityPolicy,
  SettingsService
} from '../../../services/settings.service';
import { AcademicService } from '../../../services/academic.service';
import { AuditService } from '../../../services/audit.service';
import { ActivityService } from '../../../services/activity.service';
import { CurrentUserService } from '../../../services/current-user.service';
import { PageHeader } from '../../../components/shared/page-header';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';

@Component({
  selector: 'app-system-settings',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, PageHeader, ConfirmDialog],
  template: `
    <div class="space-y-6 animate-fade-in pb-20 max-w-6xl mx-auto">
      <app-page-header
        title="System Settings"
        subtitle="Configure institute identity, academic defaults, grading scale, fee rules, security policies, and system backups."
      />

      @if (toastMessage()) {
        <div
          class="px-4 py-3 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-xs"
          [class]="toastTone() === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'"
        >
          <div class="flex items-center gap-2">
            <mat-icon class="text-base">{{ toastTone() === 'error' ? 'error_outline' : 'check_circle' }}</mat-icon>
            <span>{{ toastMessage() }}</span>
          </div>
          <button type="button" (click)="toastMessage.set('')" class="text-current/70 hover:text-current cursor-pointer" aria-label="Dismiss notification">
            <mat-icon class="text-base">close</mat-icon>
          </button>
        </div>
      }

      <div class="flex flex-col lg:flex-row gap-6">
        <!-- Sidebar Tabs -->
        <aside class="lg:w-64 shrink-0">
          <nav class="flex flex-row lg:flex-col gap-1 bg-white p-2 rounded-2xl border border-slate-200 overflow-x-auto lg:overflow-visible no-scrollbar shadow-sm">
            @for (tab of tabs; track tab.id) {
              <button
                type="button"
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
                    <p class="text-[11px] text-slate-500">Official name and contact details printed on PDF reports and fee receipts.</p>
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
                    <p class="text-[11px] text-slate-500">Global attendance compliance thresholds, minimum passing marks, and active session.</p>
                  </div>
                </div>

                <form [formGroup]="academicForm" (ngSubmit)="saveAcademic()" class="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div class="space-y-1.5">
                    <label for="acad-year" class="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Current Academic Year</label>
                    <select id="acad-year" formControlName="currentAcademicYear" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all">
                      @for (yr of availableAcademicYears(); track yr) {
                        <option [value]="yr">{{ yr }}</option>
                      }
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
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                      <mat-icon>grade</mat-icon>
                    </div>
                    <div>
                      <h3 class="font-bold text-slate-900 text-sm">Grading Scale</h3>
                      <p class="text-[11px] text-slate-500">Manage institutional letter grades, percentage bands, and GPA points.</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      (click)="resetGradeScale()"
                      class="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      <mat-icon class="text-sm">restart_alt</mat-icon> Reset Default
                    </button>
                    <button
                      type="button"
                      (click)="addGradeBand()"
                      class="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                    >
                      <mat-icon class="text-sm">add</mat-icon> Add Grade Band
                    </button>
                  </div>
                </div>

                @if (showGradeForm()) {
                  <form [formGroup]="gradeForm" (ngSubmit)="saveGradeBand()" class="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                    <div class="space-y-1">
                      <label for="gr-letter" class="text-[10px] font-bold text-slate-600 uppercase">Grade</label>
                      <input id="gr-letter" type="text" formControlName="grade" placeholder="e.g. A+" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
                    </div>
                    <div class="space-y-1">
                      <label for="gr-min" class="text-[10px] font-bold text-slate-600 uppercase">Min %</label>
                      <input id="gr-min" type="number" formControlName="minPercentage" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
                    </div>
                    <div class="space-y-1">
                      <label for="gr-max" class="text-[10px] font-bold text-slate-600 uppercase">Max %</label>
                      <input id="gr-max" type="number" formControlName="maxPercentage" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
                    </div>
                    <div class="space-y-1">
                      <label for="gr-pts" class="text-[10px] font-bold text-slate-600 uppercase">Grade Points</label>
                      <input id="gr-pts" type="number" formControlName="points" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
                    </div>
                    <div class="flex items-center gap-2">
                      <button type="submit" [disabled]="gradeForm.invalid" class="flex-1 bg-[#6D42E8] text-white px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer">
                        {{ editingGradeId() ? 'Update' : 'Add' }}
                      </button>
                      <button type="button" (click)="cancelGradeEdit()" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 cursor-pointer">
                        Cancel
                      </button>
                    </div>
                  </form>
                }

                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs">
                    <thead>
                      <tr class="bg-slate-50 border-b border-slate-100">
                        <th class="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Grade</th>
                        <th class="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Min %</th>
                        <th class="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Max %</th>
                        <th class="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Points</th>
                        <th class="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                      @for (g of gradeScale(); track g.id) {
                        <tr class="hover:bg-slate-50/70 transition-colors">
                          <td class="px-4 py-3 font-extrabold text-slate-900">{{ g.grade }}</td>
                          <td class="px-4 py-3 text-slate-600 tabular-nums">{{ g.minPercentage }}%</td>
                          <td class="px-4 py-3 text-slate-600 tabular-nums">{{ g.maxPercentage }}%</td>
                          <td class="px-4 py-3 font-bold text-[#6D42E8] tabular-nums">{{ g.points }}</td>
                          <td class="px-4 py-3 text-right">
                            <div class="inline-flex items-center gap-1">
                              <button type="button" (click)="editGradeBand(g)" class="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer" title="Edit grade">
                                <mat-icon class="text-sm">edit</mat-icon>
                              </button>
                              <button type="button" (click)="removeGradeBand(g.id)" class="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer" title="Delete grade">
                                <mat-icon class="text-sm">delete</mat-icon>
                              </button>
                            </div>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                  <mat-icon class="text-blue-500 text-sm shrink-0">info</mat-icon>
                  <p class="text-[11px] text-blue-700 leading-relaxed">
                    The grading scale is synced to Firestore and applied across Examination Results and Transcript GPA computations.
                  </p>
                </div>
              </div>
            }

            <!-- Tab Content: Fee Settings -->
            @if (activeTab() === 'fees') {
              <div class="p-6 space-y-6">
                <div class="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div class="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <mat-icon>receipt_long</mat-icon>
                  </div>
                  <div>
                    <h3 class="font-bold text-slate-900 text-sm">Fee & Receipt Configuration</h3>
                    <p class="text-[11px] text-slate-500">Configure official receipt numbering prefixes and late payment penalty rates.</p>
                  </div>
                </div>

                <form [formGroup]="feeForm" (ngSubmit)="saveFees()" class="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div class="space-y-1.5">
                    <label for="fee-prefix" class="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Receipt Prefix Code</label>
                    <input id="fee-prefix" type="text" formControlName="receiptPrefix" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs uppercase focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all">
                  </div>
                  <div class="space-y-1.5">
                    <label for="fee-fine" class="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Default Late Fine / Day (₹)</label>
                    <input id="fee-fine" type="number" formControlName="defaultLateFinePerDay" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all">
                  </div>
                  <div class="md:col-span-2 flex justify-end pt-4">
                    <button type="submit" [disabled]="feeForm.pristine || feeForm.invalid" class="bg-[#6D42E8] text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-purple-900/30 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                      <mat-icon class="text-sm">save</mat-icon> Save Fee Rules
                    </button>
                  </div>
                </form>
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
                    <p class="text-[11px] text-slate-500">Manage password requirements, session timeouts, and lockout thresholds.</p>
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
                    <p class="text-[11px] text-slate-500">Configure global triggers for in-app and portal alert broadcasts.</p>
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

            <!-- Tab Content: Backup & Recovery -->
            @if (activeTab() === 'backup') {
              <div class="p-6 space-y-6">
                <div class="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div class="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center">
                    <mat-icon>cloud_sync</mat-icon>
                  </div>
                  <div>
                    <h3 class="font-bold text-slate-900 text-sm">Institutional Backup & Recovery</h3>
                    <p class="text-[11px] text-slate-500">Export full EduERP settings & dataset snapshots or restore from an archived backup file.</p>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                    <div class="flex items-center gap-2 text-slate-900 font-bold text-xs">
                      <mat-icon class="text-[#6D42E8] text-lg">download</mat-icon>
                      <span>Download JSON Snapshot</span>
                    </div>
                    <p class="text-[11px] text-slate-500 leading-relaxed">
                      Generates a verified EduERP v2.0 JSON archive containing all system settings, grading rules, and cached institutional records.
                    </p>
                    <button
                      type="button"
                      (click)="downloadBackup()"
                      class="bg-[#6D42E8] text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <mat-icon class="text-sm">file_download</mat-icon> Export Full Backup
                    </button>
                  </div>

                  <div class="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                    <div class="flex items-center gap-2 text-slate-900 font-bold text-xs">
                      <mat-icon class="text-amber-600 text-lg">restore</mat-icon>
                      <span>Restore From Backup File</span>
                    </div>
                    <p class="text-[11px] text-slate-500 leading-relaxed">
                      Upload a previously exported EduERP v2.0 JSON snapshot to restore configuration and persisted datasets.
                    </p>
                    <label class="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer">
                      <mat-icon class="text-sm">upload_file</mat-icon>
                      <span>Select Backup JSON</span>
                      <input type="file" accept=".json,application/json" (change)="onBackupFileSelected($event)" class="sr-only">
                    </label>
                  </div>
                </div>

                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Synchronized Storage Modules ({{ inventory().length }})</h4>
                    <button type="button" (click)="refreshInventory()" class="text-xs font-bold text-[#6D42E8] hover:underline cursor-pointer flex items-center gap-1">
                      <mat-icon class="text-sm">refresh</mat-icon> Refresh
                    </button>
                  </div>
                  <div class="border border-slate-100 rounded-2xl overflow-hidden">
                    <table class="w-full text-left text-xs">
                      <thead>
                        <tr class="bg-slate-50 border-b border-slate-100">
                          <th class="px-4 py-2.5 font-bold text-slate-600 text-[10px] uppercase">Store Key</th>
                          <th class="px-4 py-2.5 font-bold text-slate-600 text-[10px] uppercase">Records</th>
                          <th class="px-4 py-2.5 font-bold text-slate-600 text-[10px] uppercase text-right">Payload Size</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-50">
                        @for (row of inventory(); track row.key) {
                          <tr>
                            <td class="px-4 py-2.5 font-mono text-[11px] text-slate-800">{{ row.key }}</td>
                            <td class="px-4 py-2.5 tabular-nums font-bold text-slate-700">{{ row.records }}</td>
                            <td class="px-4 py-2.5 tabular-nums text-slate-500 text-right">{{ formatKb(row.bytes) }}</td>
                          </tr>
                        } @empty {
                          <tr>
                            <td colspan="3" class="px-4 py-6 text-center text-slate-400">No cached browser datasets detected yet.</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            }
          </div>
        </main>
      </div>

      <app-confirm-dialog
        [isOpen]="pendingRestoreJson() !== null"
        title="Restore System Snapshot?"
        message="This will overwrite current institutional system settings and cached module datasets from the uploaded JSON snapshot."
        confirmLabel="Restore Snapshot"
        icon="restore"
        variant="primary"
        (confirmed)="confirmRestoreBackup()"
        (cancelled)="pendingRestoreJson.set(null)"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SystemSettingsPage {
  private readonly fb = inject(FormBuilder);
  private readonly settingsService = inject(SettingsService);
  private readonly academicService = inject(AcademicService);
  private readonly auditService = inject(AuditService);
  private readonly activityService = inject(ActivityService);
  private readonly currentUser = inject(CurrentUserService);

  protected readonly activeTab = signal<string>('profile');
  protected readonly gradeScale = this.settingsService.gradeScale;
  protected readonly toastMessage = signal<string>('');
  protected readonly toastTone = signal<'success' | 'error'>('success');
  protected readonly showGradeForm = signal<boolean>(false);
  protected readonly editingGradeId = signal<string | null>(null);
  protected readonly pendingRestoreJson = signal<string | null>(null);
  protected readonly inventory = signal(this.settingsService.getStorageInventory());

  protected readonly availableAcademicYears = computed(() => {
    const years = new Set<string>(['2024-25', '2025-26', '2026-27']);
    for (const y of this.academicService.academicYears()) {
      if (y.year) years.add(y.year);
    }
    return Array.from(years).sort();
  });

  protected readonly tabs = [
    { id: 'profile', label: 'Institute Profile', icon: 'business' },
    { id: 'academic', label: 'Academic Defaults', icon: 'school' },
    { id: 'grading', label: 'Grading Scale', icon: 'grade' },
    { id: 'fees', label: 'Fee Settings', icon: 'receipt_long' },
    { id: 'security', label: 'Security Policy', icon: 'security' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications' },
    { id: 'backup', label: 'Backup & Recovery', icon: 'cloud_sync' }
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

  protected readonly feeForm = this.fb.group({
    receiptPrefix: [this.settingsService.fees().receiptPrefix, [Validators.required, Validators.maxLength(12)]],
    defaultLateFinePerDay: [this.settingsService.fees().defaultLateFinePerDay, [Validators.required, Validators.min(0)]]
  });

  protected readonly securityForm = this.fb.group({
    minPasswordLength: [this.settingsService.security().minPasswordLength, [Validators.required, Validators.min(4)]],
    requireNumber: [this.settingsService.security().requireNumber],
    requireSymbol: [this.settingsService.security().requireSymbol],
    sessionTimeoutMinutes: [this.settingsService.security().sessionTimeoutMinutes, [Validators.required, Validators.min(5)]],
    maxFailedLogins: [this.settingsService.security().maxFailedLogins, [Validators.required, Validators.min(1)]]
  });

  protected readonly notifForm = this.fb.group({
    inAppAlerts: new FormControl(this.settingsService.notifications().inAppAlerts, { nonNullable: true }),
    feeAlerts: new FormControl(this.settingsService.notifications().feeAlerts, { nonNullable: true }),
    attendanceAlerts: new FormControl(this.settingsService.notifications().attendanceAlerts, { nonNullable: true }),
    examAlerts: new FormControl(this.settingsService.notifications().examAlerts, { nonNullable: true })
  });

  protected readonly gradeForm = this.fb.group({
    grade: ['', [Validators.required, Validators.maxLength(6)]],
    minPercentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    maxPercentage: [100, [Validators.required, Validators.min(0), Validators.max(100)]],
    points: [10, [Validators.required, Validators.min(0), Validators.max(10)]]
  });

  constructor() {
    effect(() => {
      const p = this.settingsService.profile();
      if (this.profileForm.pristine) {
        this.profileForm.patchValue(p, { emitEvent: false });
      }
      const a = this.settingsService.academic();
      if (this.academicForm.pristine) {
        this.academicForm.patchValue(a, { emitEvent: false });
      }
      const f = this.settingsService.fees();
      if (this.feeForm.pristine) {
        this.feeForm.patchValue(f, { emitEvent: false });
      }
      const s = this.settingsService.security();
      if (this.securityForm.pristine) {
        this.securityForm.patchValue(s, { emitEvent: false });
      }
      const n = this.settingsService.notifications();
      if (this.notifForm.pristine) {
        this.notifForm.patchValue(n, { emitEvent: false });
      }
    });
  }

  private showToast(msg: string, tone: 'success' | 'error' = 'success'): void {
    this.toastMessage.set(msg);
    this.toastTone.set(tone);
  }

  private recordChange(target: string, oldValue: string, newValue: string): void {
    const actorName = this.settingsService.adminProfile().fullName || 'System Administrator';
    this.auditService.log({
      userId: this.currentUser.userEmail() || 'admin',
      userName: actorName,
      role: 'Super Admin',
      module: 'Settings',
      action: 'Update',
      target,
      oldValue,
      newValue,
      status: 'Success'
    });
    this.activityService.logActivity({
      user: actorName,
      role: 'Super Admin',
      operationType: 'Update',
      action: 'updated system setting',
      target,
      module: 'System Settings',
      category: 'Security',
      icon: 'settings'
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    const prev = JSON.stringify(this.settingsService.profile());
    const data = this.profileForm.getRawValue() as InstituteProfile;
    this.settingsService.updateProfile(data);
    this.recordChange('Institute Profile', prev, JSON.stringify(data));
    this.profileForm.markAsPristine();
    this.showToast('Institute profile saved and synced to Firestore.');
  }

  saveAcademic(): void {
    if (this.academicForm.invalid) return;
    const prev = JSON.stringify(this.settingsService.academic());
    const data = this.academicForm.getRawValue() as AcademicDefaults;
    this.settingsService.updateAcademic(data);
    this.recordChange('Academic Defaults', prev, JSON.stringify(data));
    this.academicForm.markAsPristine();
    this.showToast('Academic defaults updated.');
  }

  saveFees(): void {
    if (this.feeForm.invalid) return;
    const prev = JSON.stringify(this.settingsService.fees());
    const raw = this.feeForm.getRawValue();
    const data: FeeSettings = {
      receiptPrefix: String(raw.receiptPrefix || 'EDU').trim().toUpperCase(),
      defaultLateFinePerDay: Number(raw.defaultLateFinePerDay ?? 50)
    };
    this.settingsService.updateFees(data);
    this.recordChange('Fee Settings', prev, JSON.stringify(data));
    this.feeForm.markAsPristine();
    this.showToast('Fee receipt prefix & late fine policy saved.');
  }

  saveSecurity(): void {
    if (this.securityForm.invalid) return;
    const prev = JSON.stringify(this.settingsService.security());
    const data = this.securityForm.getRawValue() as SecurityPolicy;
    this.settingsService.updateSecurity(data);
    this.recordChange('Security Policy', prev, JSON.stringify(data));
    this.securityForm.markAsPristine();
    this.showToast('Security policy rules updated.');
  }

  saveNotifs(): void {
    const prev = JSON.stringify(this.settingsService.notifications());
    const data = this.notifForm.getRawValue() as NotificationSettings;
    this.settingsService.updateNotifications(data);
    this.recordChange('Notification Settings', prev, JSON.stringify(data));
    this.notifForm.markAsPristine();
    this.showToast('Notification alert triggers updated.');
  }

  addGradeBand(): void {
    this.editingGradeId.set(null);
    this.gradeForm.reset({ grade: '', minPercentage: 0, maxPercentage: 100, points: 5 });
    this.showGradeForm.set(true);
  }

  editGradeBand(row: GradeScale): void {
    this.editingGradeId.set(row.id);
    this.gradeForm.reset({
      grade: row.grade,
      minPercentage: row.minPercentage,
      maxPercentage: row.maxPercentage,
      points: row.points
    });
    this.showGradeForm.set(true);
  }

  cancelGradeEdit(): void {
    this.showGradeForm.set(false);
    this.editingGradeId.set(null);
  }

  saveGradeBand(): void {
    if (this.gradeForm.invalid) return;
    const raw = this.gradeForm.getRawValue();
    const min = Number(raw.minPercentage ?? 0);
    const max = Number(raw.maxPercentage ?? 0);
    if (min > max) {
      this.showToast('Minimum percentage cannot exceed maximum percentage.', 'error');
      return;
    }

    const editId = this.editingGradeId();
    const current = [...this.gradeScale()];
    const item: GradeScale = {
      id: editId ?? `g-${Date.now()}`,
      grade: String(raw.grade || '').trim().toUpperCase(),
      minPercentage: min,
      maxPercentage: max,
      points: Number(raw.points ?? 0)
    };

    const next = editId
      ? current.map(g => (g.id === editId ? item : g))
      : [...current, item];
    next.sort((a, b) => b.minPercentage - a.minPercentage);

    this.settingsService.updateGradeScale(next);
    this.recordChange('Grading Scale', `${current.length} bands`, `${next.length} bands (${item.grade})`);
    this.cancelGradeEdit();
    this.showToast(`Grade band "${item.grade}" saved.`);
  }

  removeGradeBand(id: string): void {
    const current = this.gradeScale();
    if (current.length <= 2) {
      this.showToast('At least two grading bands must remain active.', 'error');
      return;
    }
    const target = current.find(g => g.id === id);
    const next = current.filter(g => g.id !== id);
    this.settingsService.updateGradeScale(next);
    this.recordChange('Grading Scale', target?.grade || id, 'Removed grade band');
    this.showToast(`Removed grade band "${target?.grade || id}".`);
  }

  resetGradeScale(): void {
    this.settingsService.resetDefaultGradeScale();
    this.recordChange('Grading Scale', 'Custom Scale', `${DEFAULT_GRADE_SCALE.length} default bands restored`);
    this.showToast('Restored default institutional grading scale.');
  }

  refreshInventory(): void {
    this.inventory.set(this.settingsService.getStorageInventory());
  }

  formatKb(bytes: number): string {
    return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
  }

  downloadBackup(): void {
    const snapshot = this.settingsService.exportSystemBackupSnapshot();
    const blob = new Blob([snapshot], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EduERP-Backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.auditService.log({
      userId: this.currentUser.userEmail() || 'admin',
      userName: this.settingsService.adminProfile().fullName || 'Administrator',
      role: 'Super Admin',
      module: 'Settings',
      action: 'Export',
      target: 'Full Institutional System Backup JSON',
      status: 'Success'
    });
    this.showToast('System backup JSON snapshot exported.');
  }

  onBackupFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      if (content) {
        this.pendingRestoreJson.set(content);
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  confirmRestoreBackup(): void {
    const raw = this.pendingRestoreJson();
    this.pendingRestoreJson.set(null);
    if (!raw) return;

    const result = this.settingsService.restoreSystemBackupSnapshot(raw);
    if (!result.ok) {
      this.showToast(result.message, 'error');
      return;
    }

    this.refreshInventory();
    this.profileForm.markAsPristine();
    this.academicForm.markAsPristine();
    this.feeForm.markAsPristine();
    this.securityForm.markAsPristine();
    this.notifForm.markAsPristine();

    this.auditService.log({
      userId: this.currentUser.userEmail() || 'admin',
      userName: this.settingsService.adminProfile().fullName || 'Administrator',
      role: 'Super Admin',
      module: 'Settings',
      action: 'Update',
      target: 'System Backup Restore',
      newValue: result.message,
      status: 'Success'
    });
    this.showToast(result.message);
  }
}
