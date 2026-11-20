import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  viewChild,
  afterNextRender
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { StudentsService } from '../../services/students.service';
import { FacultyService } from '../../services/faculty.service';
import { AcademicService } from '../../services/academic.service';
import { AttendanceService } from '../../services/attendance.service';
import { ExaminationsService } from '../../services/examinations.service';
import { ResultsService } from '../../services/results.service';
import { FinanceService } from '../../services/finance.service';
import { CommunicationService } from '../../services/communication.service';
import { StudentFirebaseService } from '../../services/student-firebase.service';
import { ActivityService } from '../../services/activity.service';
import { AuditService } from '../../services/audit.service';
import { Student } from '../../models/student.model';
import { NoticeAudience, NoticePriority } from '../../models/communication.model';
import { exportToExcel, exportToPdf } from '../../utils/export.helper';

Chart.register(...registerables);

type DateRangeOption = 'all' | '7d' | '30d' | 'month';

interface EnrichedStudentRow {
  student: Student;
  attendancePct: number;
  attendedCount: number;
  totalSessionsCount: number;
  cgpa: number;
  feePaid: number;
  feeDue: number;
  feeStatus: 'Paid' | 'Partial' | 'Unpaid';
}

interface CriticalAlertItem {
  id: string;
  severity: 'high' | 'medium' | 'info';
  title: string;
  description: string;
  count: number;
  route: string;
  icon: string;
  actionLabel: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dashboard-overview',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="space-y-7 lg:space-y-8">

      <!-- 1. Executive Hero Banner -->
      <div class="gradient-brand text-white rounded-xl p-6 lg:p-7 border border-slate-800/80 shadow-sm relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div class="absolute -top-24 -right-24 w-80 h-80 rounded-full aurora-glow pointer-events-none"></div>

        <div class="flex items-start gap-4 relative z-10">
          <div class="w-12 h-12 rounded-xl bg-white/10 border border-white/15 text-indigo-400 flex items-center justify-center shrink-0">
            <span class="material-icons text-2xl">school</span>
          </div>
          <div class="space-y-1.5">
            <div class="flex items-center gap-2.5 flex-wrap text-xs text-slate-300 font-medium">
              <span class="text-indigo-300 font-semibold">Executive Control Centre</span>
              <span class="text-slate-600" aria-hidden="true">/</span>
              <span>Academic Session {{ activeAcademicYear() }}</span>
              <span class="text-slate-600" aria-hidden="true">/</span>
              <span class="font-mono text-slate-200">{{ departments().length }} Departments</span>
            </div>
            <h1 class="font-display text-2xl lg:text-[26px] font-bold tracking-tight text-white">
              Institutional <span class="text-indigo-400">Overview</span>
            </h1>
            <p class="text-xs text-slate-300 max-w-2xl leading-relaxed flex items-center gap-2 flex-wrap">
              <span class="material-icons text-sm text-indigo-400">calendar_today</span>
              <span>{{ currentDate() }}</span>
              <span class="text-slate-600">·</span>
              <span>Live telemetry across admissions, faculty, attendance registers, exams, and fee ledgers.</span>
            </p>
          </div>
        </div>

        <!-- Primary Action CTAs + Dashboard Exports -->
        <div class="flex items-center gap-2.5 shrink-0 relative z-10 flex-wrap">
          <button
            type="button"
            (click)="openAddStudentModal()"
            class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
          >
            <span class="material-icons text-base">person_add</span>
            <span>Enroll Student</span>
          </button>

          <button
            type="button"
            (click)="openPublishNoticeModal()"
            class="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <span class="material-icons text-sm">campaign</span>
            <span>Publish Circular</span>
          </button>

          <button
            type="button"
            (click)="exportDashboardExcel()"
            class="px-3.5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 font-semibold text-xs border border-emerald-400/30 flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Export Executive Summary to Excel"
          >
            <span class="material-icons text-sm">table_view</span>
            <span>Excel</span>
          </button>

          <button
            type="button"
            (click)="exportDashboardPdf()"
            class="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Export Executive Summary to PDF"
          >
            <span class="material-icons text-sm">picture_as_pdf</span>
            <span>PDF</span>
          </button>
        </div>
      </div>

      <!-- 2. Global Overview Filter Strip (Date Range + Department) -->
      <div class="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1">Date Window:</span>
          @for (opt of dateRangeOptions; track opt.id) {
            <button
              type="button"
              (click)="selectedDateRange.set(opt.id)"
              [class]="selectedDateRange() === opt.id
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-semibold'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 font-medium'"
              class="px-3 py-1.5 rounded-lg text-xs border transition-colors cursor-pointer"
            >
              {{ opt.label }}
            </button>
          }
        </div>

        <div class="flex items-center gap-3 flex-wrap">
          <label class="text-[11px] font-bold uppercase tracking-wider text-slate-500" for="dash-dept-filter">Department:</label>
          <select
            id="dash-dept-filter"
            [value]="selectedDepartment()"
            (change)="onDepartmentChange($event)"
            class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Departments ({{ departments().length }})</option>
            @for (dept of departments(); track dept.id) {
              <option [value]="dept.name">{{ dept.name }} ({{ dept.code }})</option>
            }
          </select>
        </div>
      </div>

      <!-- 3. Six Live Institutional KPI Cards (Clickable Drill-Downs) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">

        <!-- KPI 1: Students -->
        <a
          routerLink="/admin/students"
          class="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between group"
        >
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Students</span>
            <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <span class="material-icons text-base">people</span>
            </div>
          </div>
          <div class="mt-3">
            <h3 class="font-display text-2xl font-bold text-slate-900 tabular-nums">{{ kpiMetrics().totalStudents }}</h3>
            <p class="mt-1 text-[11px] text-slate-500 font-medium">
              <span class="text-emerald-600 font-semibold">{{ kpiMetrics().activeStudents }} active</span>
              <span class="text-slate-300 mx-1">·</span>
              <span>{{ kpiMetrics().newAdmissionsCount }} admissions</span>
            </p>
          </div>
        </a>

        <!-- KPI 2: Faculty & Academic Units -->
        <a
          routerLink="/admin/faculty"
          class="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between group"
        >
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Faculty</span>
            <div class="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
              <span class="material-icons text-base">badge</span>
            </div>
          </div>
          <div class="mt-3">
            <h3 class="font-display text-2xl font-bold text-slate-900 tabular-nums">{{ kpiMetrics().totalFaculty }}</h3>
            <p class="mt-1 text-[11px] text-slate-500 font-medium">
              <span class="text-indigo-600 font-semibold">{{ kpiMetrics().departmentsCount }} depts</span>
              <span class="text-slate-300 mx-1">·</span>
              <span>{{ kpiMetrics().coursesCount }} courses</span>
            </p>
          </div>
        </a>

        <!-- KPI 3: Live Attendance Rate -->
        <a
          routerLink="/admin/attendance"
          class="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between group"
        >
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Attendance</span>
            <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <span class="material-icons text-base">how_to_reg</span>
            </div>
          </div>
          <div class="mt-3">
            <h3 class="font-display text-2xl font-bold text-slate-900 tabular-nums">{{ kpiMetrics().attendancePct }}%</h3>
            <p class="mt-1 text-[11px] text-slate-500 font-medium">
              <span class="text-amber-600 font-semibold">{{ kpiMetrics().lowAttendanceCount }} below 75%</span>
              <span class="text-slate-300 mx-1">·</span>
              <span>{{ kpiMetrics().sessionsCount }} sessions</span>
            </p>
          </div>
        </a>

        <!-- KPI 4: Fee Collection -->
        <a
          routerLink="/admin/fee-collection"
          class="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between group"
        >
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Fee Collected</span>
            <div class="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center">
              <span class="material-icons text-base">payments</span>
            </div>
          </div>
          <div class="mt-3">
            <h3 class="font-display text-2xl font-bold text-slate-900 tabular-nums">{{ formatCurrencyCompact(kpiMetrics().collectedFees) }}</h3>
            <p class="mt-1 text-[11px] text-slate-500 font-medium">
              <span class="text-emerald-600 font-semibold">{{ kpiMetrics().collectionPct }}% collected</span>
              <span class="text-slate-300 mx-1">·</span>
              <span>{{ kpiMetrics().paymentsCount }} receipts</span>
            </p>
          </div>
        </a>

        <!-- KPI 5: Outstanding / Pending Fees -->
        <a
          routerLink="/admin/pending-fees"
          class="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between group"
        >
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Outstanding</span>
            <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
              <span class="material-icons text-base">pending_actions</span>
            </div>
          </div>
          <div class="mt-3">
            <h3 class="font-display text-2xl font-bold text-amber-600 tabular-nums">{{ formatCurrencyCompact(kpiMetrics().outstandingFees) }}</h3>
            <p class="mt-1 text-[11px] text-slate-500 font-medium">
              <span class="text-rose-600 font-semibold">{{ formatCurrencyCompact(kpiMetrics().overdueFees) }} overdue</span>
            </p>
          </div>
        </a>

        <!-- KPI 6: Exam Pass Rate -->
        <a
          routerLink="/admin/results"
          class="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between group"
        >
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Exam Pass Rate</span>
            <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <span class="material-icons text-base">grade</span>
            </div>
          </div>
          <div class="mt-3">
            <h3 class="font-display text-2xl font-bold text-slate-900 tabular-nums">{{ kpiMetrics().examPassRate }}%</h3>
            <p class="mt-1 text-[11px] text-slate-500 font-medium">
              <span class="text-indigo-600 font-semibold">Avg {{ kpiMetrics().avgExamScorePct }}%</span>
              <span class="text-slate-300 mx-1">·</span>
              <span>{{ kpiMetrics().totalResultsEvaluated }} scripts</span>
            </p>
          </div>
        </a>

      </div>

      <!-- 4. Critical Administrative Alerts Banner -->
      @if (criticalAlerts().length > 0) {
        <div class="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-icons text-amber-500 text-lg">notifications_active</span>
              <h2 class="font-display font-bold text-sm text-slate-900">Critical Alerts Requiring Administrator Action</h2>
            </div>
            <span class="text-[11px] font-semibold text-slate-500">{{ criticalAlerts().length }} active items</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            @for (alert of criticalAlerts(); track alert.id) {
              <a
                [routerLink]="alert.route"
                class="p-3.5 rounded-xl border transition-all hover:shadow-xs flex items-start justify-between gap-3"
                [class.bg-rose-50/70]="alert.severity === 'high'"
                [class.border-rose-200]="alert.severity === 'high'"
                [class.bg-amber-50/70]="alert.severity === 'medium'"
                [class.border-amber-200]="alert.severity === 'medium'"
                [class.bg-indigo-50/60]="alert.severity === 'info'"
                [class.border-indigo-200]="alert.severity === 'info'"
              >
                <div class="flex items-start gap-2.5 min-w-0">
                  <span
                    class="material-icons text-base mt-0.5 shrink-0"
                    [class.text-rose-600]="alert.severity === 'high'"
                    [class.text-amber-600]="alert.severity === 'medium'"
                    [class.text-indigo-600]="alert.severity === 'info'"
                  >{{ alert.icon }}</span>
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-slate-900 truncate">{{ alert.title }}</p>
                    <p class="text-[11px] text-slate-600 mt-0.5 leading-snug">{{ alert.description }}</p>
                  </div>
                </div>
                <span class="text-[11px] font-bold text-indigo-700 shrink-0">{{ alert.actionLabel }} →</span>
              </a>
            }
          </div>
        </div>
      }

      <!-- 5. Three Live Analytics Charts Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Chart 1: Department-wise Student & Faculty Distribution -->
        <div class="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-display font-bold text-sm text-slate-900">Department Distribution</h3>
              <p class="text-xs text-slate-500 mt-0.5">Live active students & faculty headcount</p>
            </div>
            <a routerLink="/admin/departments" class="text-[11px] font-semibold text-indigo-600 hover:underline">Manage →</a>
          </div>
          <div class="h-64 relative w-full pt-2">
            <canvas #enrollmentCanvas></canvas>
          </div>
        </div>

        <!-- Chart 2: Attendance Trend -->
        <div class="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-display font-bold text-sm text-slate-900">Attendance Register Trend</h3>
              <p class="text-xs text-slate-500 mt-0.5">Session-wise attendance percentage</p>
            </div>
            <a routerLink="/admin/attendance-analytics" class="text-[11px] font-semibold text-indigo-600 hover:underline">Analytics →</a>
          </div>
          <div class="h-64 relative w-full pt-2">
            <canvas #attendanceCanvas></canvas>
          </div>
        </div>

        <!-- Chart 3: Examination Grade Distribution -->
        <div class="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-display font-bold text-sm text-slate-900">Examination Grade Breakdown</h3>
              <p class="text-xs text-slate-500 mt-0.5">Evaluated marks distribution across exams</p>
            </div>
            <a routerLink="/admin/exam-reports" class="text-[11px] font-semibold text-indigo-600 hover:underline">Reports →</a>
          </div>
          <div class="h-64 relative w-full pt-2">
            <canvas #gradeCanvas></canvas>
          </div>
        </div>

      </div>

      <!-- 6. Live Student Academic Directory & Dossier Preview -->
      <div class="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 class="font-display font-bold text-base text-slate-900">Student Academic Register</h3>
            <p class="text-xs text-slate-500 mt-0.5">Live institutional enrollment, attendance averages, and fee ledger summary</p>
          </div>

          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div class="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                (click)="activeFilter.set('all')"
                [class]="activeFilter() === 'all' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900 font-medium'"
                class="px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer"
              >
                All ({{ departmentFilteredStudents().length }})
              </button>
              <button
                type="button"
                (click)="activeFilter.set('mca')"
                [class]="activeFilter() === 'mca' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900 font-medium'"
                class="px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer"
              >
                MCA
              </button>
              <button
                type="button"
                (click)="activeFilter.set('btech')"
                [class]="activeFilter() === 'btech' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900 font-medium'"
                class="px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer"
              >
                B.Tech
              </button>
              <button
                type="button"
                (click)="activeFilter.set('defaulters')"
                [class]="activeFilter() === 'defaulters' ? 'bg-white text-rose-600 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900 font-medium'"
                class="px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer"
              >
                At-Risk (&lt;75%)
              </button>
            </div>

            <div class="relative w-full sm:w-64">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <span class="material-icons text-base">search</span>
              </span>
              <input
                type="text"
                placeholder="Search roll, name, course..."
                [value]="searchQuery()"
                (input)="onSearchInput($event)"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50/75 text-slate-500 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                <th class="py-3.5 px-5">Enrollment No</th>
                <th class="py-3.5 px-5">Student & Guardian</th>
                <th class="py-3.5 px-5">Course & Section</th>
                <th class="py-3.5 px-5">Attendance</th>
                <th class="py-3.5 px-5">SGPA</th>
                <th class="py-3.5 px-5">Fee Balance</th>
                <th class="py-3.5 px-5 text-right">Dossier</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
              @for (row of visibleStudentRows(); track row.student.id) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="py-3.5 px-5 font-mono font-bold text-indigo-600">{{ row.student.enrollmentNo }}</td>
                  <td class="py-3.5 px-5">
                    <p class="font-bold text-slate-900">{{ row.student.name }}</p>
                    <p class="text-[11px] text-slate-400 mt-0.5">{{ row.student.guardian.relation }}: {{ row.student.guardian.name }}</p>
                  </td>
                  <td class="py-3.5 px-5">
                    <p class="font-semibold text-slate-800">{{ row.student.course }}</p>
                    <p class="text-[11px] text-slate-500 mt-0.5">{{ row.student.section }} · {{ row.student.semester }}</p>
                  </td>
                  <td class="py-3.5 px-5 tabular-nums">
                    <span [class]="row.attendancePct >= 75 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'">
                      {{ row.attendancePct }}%
                    </span>
                    <span class="text-[11px] text-slate-400 ml-1">({{ row.attendedCount }}/{{ row.totalSessionsCount }})</span>
                  </td>
                  <td class="py-3.5 px-5 font-mono font-bold text-slate-900 tabular-nums">{{ row.cgpa.toFixed(2) }}</td>
                  <td class="py-3.5 px-5 tabular-nums">
                    <span
                      [class]="row.feeStatus === 'Paid' ? 'text-emerald-700 font-bold' : row.feeStatus === 'Partial' ? 'text-amber-600 font-bold' : 'text-rose-600 font-bold'"
                    >
                      {{ row.feeStatus }}
                    </span>
                    @if (row.feeDue > 0) {
                      <span class="block text-[11px] text-slate-500">Due ₹{{ row.feeDue.toLocaleString('en-IN') }}</span>
                    }
                  </td>
                  <td class="py-3.5 px-5 text-right">
                    <button
                      type="button"
                      (click)="viewDossier(row)"
                      class="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    >
                      View Dossier
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="py-10 text-center text-slate-400 text-xs">
                    No student records match the current filters.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (filteredStudentRows().length > 8) {
          <div class="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing top 8 of {{ filteredStudentRows().length }} matching students</span>
            <a routerLink="/admin/students" class="font-semibold text-indigo-600 hover:underline">Open Full Student Directory →</a>
          </div>
        }
      </div>

      <!-- 7. Operational Grid: Low Attendance At-Risk + Upcoming Examinations -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Low Attendance Alerts -->
        <div class="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                <span class="material-icons text-amber-500 text-base">warning</span>
                <span>Low Attendance Students (&lt; 75%)</span>
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">Live computation from recorded attendance registers</p>
            </div>
            <button
              type="button"
              (click)="notifyAllDefaulters()"
              class="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-lg border border-amber-200 cursor-pointer transition-colors"
            >
              Notify All Parents
            </button>
          </div>

          <div class="divide-y divide-slate-100 text-xs">
            @for (row of lowAttendanceStudents().slice(0, 5); track row.student.id) {
              <div class="py-3 flex items-center justify-between gap-4">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-mono font-bold text-indigo-600">{{ row.student.enrollmentNo }}</span>
                    <span class="font-bold text-slate-800 truncate">{{ row.student.name }}</span>
                  </div>
                  <p class="text-[11px] text-slate-500 mt-0.5 truncate">
                    {{ row.student.course }} · Current <span class="font-bold text-rose-600">{{ row.attendancePct }}%</span> ({{ row.attendedCount }}/{{ row.totalSessionsCount }})
                  </p>
                </div>
                <div class="shrink-0">
                  @if (notifiedDefaulters()[row.student.id]) {
                    <span class="text-emerald-600 font-bold text-xs inline-flex items-center gap-1">
                      <span class="material-icons text-xs">check</span> Alert Sent
                    </span>
                  } @else {
                    <button
                      type="button"
                      (click)="notifyDefaulter(row)"
                      class="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs cursor-pointer transition-colors"
                    >
                      Send Notice
                    </button>
                  }
                </div>
              </div>
            } @empty {
              <div class="py-8 text-center text-slate-400 text-xs">
                All students currently meet the 75% attendance threshold.
              </div>
            }
          </div>
        </div>

        <!-- Upcoming Examinations -->
        <div class="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                <span class="material-icons text-indigo-600 text-base">assignment</span>
                <span>Upcoming Examination Schedule</span>
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">Live schedule from Examination Cell</p>
            </div>
            <a routerLink="/admin/examinations" class="text-xs font-semibold text-indigo-600 hover:underline">Manage Exams →</a>
          </div>

          <div class="space-y-3">
            @for (exam of upcomingExams().slice(0, 4); track exam.id) {
              <div class="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-indigo-50/30 transition-colors">
                <div class="flex items-center justify-between gap-2">
                  <span class="font-mono font-bold text-indigo-600 text-xs">{{ exam.type }} · {{ exam.mode }}</span>
                  <span class="text-xs text-slate-500 font-medium">{{ exam.date }} at {{ exam.time }}</span>
                </div>
                <h4 class="font-bold text-slate-800 text-xs mt-1">{{ exam.title }} — {{ exam.subjectName }}</h4>
                <div class="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                  <span>{{ exam.courseName }} ({{ exam.semester }})</span>
                  <span class="text-slate-300">·</span>
                  <span>{{ exam.venue || 'Main Exam Block' }}</span>
                </div>
              </div>
            } @empty {
              <div class="py-8 text-center text-slate-400 text-xs">
                No upcoming scheduled examinations found for this filter.
              </div>
            }
          </div>
        </div>

      </div>

      <!-- 8. Recent Institutional Activity Snapshot -->
      <div class="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
              <span class="material-icons text-indigo-600 text-base">history</span>
              <span>Recent Institutional Activity</span>
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">Real-time chronological audit trail synced with Firestore</p>
          </div>
          <a
            routerLink="/admin/recent-activity"
            class="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View all</span>
            <span class="material-icons text-sm">arrow_forward</span>
          </a>
        </div>

        <div class="divide-y divide-slate-100 text-xs">
          @for (item of recentActivityPreview(); track item.id) {
            <div class="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 rounded-lg px-2 transition-colors">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <span class="material-icons text-base">{{ item.icon }}</span>
                </div>
                <div class="truncate">
                  <p class="text-[13px] text-slate-800 truncate">
                    <span class="font-semibold text-slate-900">{{ item.user }}</span>
                    <span class="text-slate-600"> {{ item.action }} </span>
                    <span class="font-medium text-slate-900">{{ item.target }}</span>
                  </p>
                  <p class="text-[11px] text-slate-400 mt-0.5">{{ item.role }} · {{ item.module }} · {{ item.operationType }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0 pl-11 sm:pl-0">
                <span class="text-xs text-slate-500 font-normal whitespace-nowrap">{{ item.relativeTime }}</span>
              </div>
            </div>
          }
        </div>
      </div>

    </div>

    <!-- Modal 1: Student Academic Dossier -->
    @if (selectedDossier()) {
      @let dossier = selectedDossier()!;
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button type="button" aria-label="Close modal overlay" (click)="selectedDossier.set(null)" class="fixed inset-0 bg-black/60 backdrop-blur-xs w-full h-full border-0"></button>
        <div class="relative bg-white rounded-2xl shadow-2xl p-7 w-full max-w-2xl z-10 space-y-5 text-xs text-slate-800 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b border-slate-200 pb-4">
            <div class="flex items-center gap-3.5">
              <div class="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                {{ dossier.student.initials }}
              </div>
              <div>
                <span class="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono font-bold text-xs border border-indigo-200">
                  {{ dossier.student.enrollmentNo }}
                </span>
                <h3 class="text-base font-bold text-slate-900 mt-1">{{ dossier.student.name }}</h3>
              </div>
            </div>
            <button type="button" (click)="selectedDossier.set(null)" class="text-slate-400 hover:text-slate-700 cursor-pointer">
              <span class="material-icons">close</span>
            </button>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase">COURSE</p>
              <p class="font-bold text-slate-800 text-xs mt-0.5">{{ dossier.student.course }}</p>
              <p class="text-[11px] text-slate-500">{{ dossier.student.section }} · {{ dossier.student.semester }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase">GUARDIAN</p>
              <p class="font-bold text-slate-800 text-xs mt-0.5">{{ dossier.student.guardian.name }}</p>
              <p class="text-[11px] text-slate-500">{{ dossier.student.guardian.phone }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase">ATTENDANCE</p>
              <p [class]="dossier.attendancePct >= 75 ? 'font-bold text-emerald-600 text-xs mt-0.5' : 'font-bold text-rose-600 text-xs mt-0.5'">
                {{ dossier.attendancePct }}% ({{ dossier.attendedCount }}/{{ dossier.totalSessionsCount }})
              </p>
              <p class="text-[10px] text-slate-500">{{ dossier.attendancePct >= 75 ? 'Exam Eligible' : 'Short Attendance Alert' }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase">SGPA / FEE STATUS</p>
              <p class="font-bold text-indigo-600 font-mono text-sm mt-0.5">{{ dossier.cgpa.toFixed(2) }} · {{ dossier.feeStatus }}</p>
              <p class="text-[10px] text-slate-500">Paid ₹{{ dossier.feePaid.toLocaleString('en-IN') }}</p>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button type="button" (click)="selectedDossier.set(null)" class="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer">Close</button>
            <a routerLink="/admin/students" (click)="selectedDossier.set(null)" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-2 transition-colors">
              <span class="material-icons text-sm">open_in_new</span> Manage in Directory
            </a>
          </div>
        </div>
      </div>
    }

    <!-- Modal 2: Enroll New Student (Reactive Form) -->
    @if (isAddStudentOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button type="button" aria-label="Close modal overlay" (click)="isAddStudentOpen.set(false)" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs w-full h-full border-0"></button>
        <div class="relative bg-white rounded-2xl shadow-2xl p-7 w-full max-w-lg z-10 space-y-4 text-xs text-slate-800 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <div class="flex items-center gap-2">
              <span class="material-icons text-indigo-600">person_add</span>
              <h3 class="text-base font-bold text-slate-900">Enroll Candidate to University Roster</h3>
            </div>
            <button type="button" (click)="isAddStudentOpen.set(false)" class="text-slate-400 hover:text-slate-700 cursor-pointer">
              <span class="material-icons">close</span>
            </button>
          </div>

          @if (studentFormError()) {
            <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {{ studentFormError() }}
            </div>
          }

          <form [formGroup]="studentForm" (ngSubmit)="submitNewStudent()" class="space-y-4">
            <div class="grid grid-cols-2 gap-3.5">
              <div>
                <label for="enroll-roll" class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Enrollment No *</label>
                <input id="enroll-roll" type="text" formControlName="enrollmentNo" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label for="enroll-name" class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Student Full Name *</label>
                <input id="enroll-name" type="text" formControlName="name" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3.5">
              <div>
                <label for="enroll-prog" class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Course / Program *</label>
                <select id="enroll-prog" formControlName="courseId" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs">
                  @for (c of courses(); track c.id) {
                    <option [value]="c.id">{{ c.name }}</option>
                  }
                </select>
              </div>
              <div>
                <label for="enroll-sec" class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Section *</label>
                <select id="enroll-sec" formControlName="section" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs">
                  <option value="Section A">Section A</option>
                  <option value="Section B">Section B</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3.5">
              <div>
                <label for="enroll-father" class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Guardian Name *</label>
                <input id="enroll-father" type="text" formControlName="guardianName" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs" />
              </div>
              <div>
                <label for="enroll-phone" class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Student Phone (10 digits) *</label>
                <input id="enroll-phone" type="text" formControlName="phone" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs" />
              </div>
            </div>

            <div>
              <label for="enroll-email" class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Institutional Email *</label>
              <input id="enroll-email" type="email" formControlName="email" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs" />
            </div>

            <div class="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button type="button" (click)="isAddStudentOpen.set(false)" class="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button type="submit" [disabled]="studentForm.invalid" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs cursor-pointer transition-colors">Confirm Admission</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Modal 3: Publish Institutional Circular (Reactive Form) -->
    @if (isNoticeModalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button type="button" aria-label="Close modal overlay" (click)="isNoticeModalOpen.set(false)" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs w-full h-full border-0"></button>
        <div class="relative bg-white rounded-2xl shadow-2xl p-7 w-full max-w-lg z-10 space-y-4 text-xs text-slate-800">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <div class="flex items-center gap-2">
              <span class="material-icons text-indigo-600">campaign</span>
              <h3 class="text-base font-bold text-slate-900">Publish Official Circular</h3>
            </div>
            <button type="button" (click)="isNoticeModalOpen.set(false)" class="text-slate-400 hover:text-slate-700 cursor-pointer">
              <span class="material-icons">close</span>
            </button>
          </div>

          <form [formGroup]="noticeForm" (ngSubmit)="submitNewNotice()" class="space-y-4">
            <div>
              <label for="circ-title" class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Circular Title *</label>
              <input id="circ-title" type="text" formControlName="title" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500" />
            </div>

            <div class="grid grid-cols-2 gap-3.5">
              <div>
                <label for="circ-aud" class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Audience *</label>
                <select id="circ-aud" formControlName="audience" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs">
                  <option value="All">All Campus</option>
                  <option value="Students">Students</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Parents">Parents</option>
                </select>
              </div>
              <div>
                <label for="circ-prio" class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Priority *</label>
                <select id="circ-prio" formControlName="priority" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs">
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label for="circ-content" class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Circular Details *</label>
              <textarea id="circ-content" rows="3" formControlName="body" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"></textarea>
            </div>

            <div class="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button type="button" (click)="isNoticeModalOpen.set(false)" class="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button type="submit" [disabled]="noticeForm.invalid" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs cursor-pointer transition-colors">Broadcast Circular</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Toast Notification -->
    @if (toastMessage()) {
      <div class="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-800 flex items-center gap-2.5 text-xs font-medium">
        <span class="material-icons text-emerald-400 text-base">check_circle</span>
        <span>{{ toastMessage() }}</span>
      </div>
    }
  `
})
export class DashboardOverview implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly studentsService = inject(StudentsService);
  private readonly facultyService = inject(FacultyService);
  private readonly academicService = inject(AcademicService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly examsService = inject(ExaminationsService);
  private readonly resultsService = inject(ResultsService);
  private readonly financeService = inject(FinanceService);
  private readonly commService = inject(CommunicationService);
  private readonly studentFirebaseService = inject(StudentFirebaseService);
  private readonly activityService = inject(ActivityService);
  private readonly auditService = inject(AuditService);

  private readonly enrollmentCanvas = viewChild<ElementRef<HTMLCanvasElement>>('enrollmentCanvas');
  private readonly attendanceCanvas = viewChild<ElementRef<HTMLCanvasElement>>('attendanceCanvas');
  private readonly gradeCanvas = viewChild<ElementRef<HTMLCanvasElement>>('gradeCanvas');

  private enrollmentChart: Chart | null = null;
  private attendanceChart: Chart | null = null;
  private gradeChart: Chart | null = null;
  private readonly chartsReady = signal<boolean>(false);

  protected readonly selectedDateRange = signal<DateRangeOption>('all');
  protected readonly selectedDepartment = signal<string>('all');
  protected readonly activeFilter = signal<'all' | 'mca' | 'btech' | 'defaulters'>('all');
  protected readonly searchQuery = signal<string>('');

  protected readonly isAddStudentOpen = signal<boolean>(false);
  protected readonly isNoticeModalOpen = signal<boolean>(false);
  protected readonly selectedDossier = signal<EnrichedStudentRow | null>(null);
  protected readonly studentFormError = signal<string>('');
  protected readonly toastMessage = signal<string>('');
  protected readonly notifiedDefaulters = signal<Record<string, boolean>>({});

  protected readonly departments = this.academicService.departments;
  protected readonly courses = this.academicService.courses;
  protected readonly activeAcademicYear = computed(() => this.academicService.academicYearStats().current || '2025-26');
  protected readonly recentActivityPreview = computed(() => this.activityService.items().slice(0, 5));

  protected readonly dateRangeOptions: { id: DateRangeOption; label: string }[] = [
    { id: 'all', label: 'All Session' },
    { id: 'month', label: 'This Month' },
    { id: '30d', label: 'Last 30 Days' },
    { id: '7d', label: 'Last 7 Days' }
  ];

  protected readonly currentDate = signal<string>(
    new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  );

  protected readonly studentForm = this.fb.nonNullable.group({
    enrollmentNo: ['MCA-2026-064', [Validators.required, Validators.minLength(4)]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    courseId: ['course-mca', Validators.required],
    section: ['Section A', Validators.required],
    guardianName: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    email: ['', [Validators.required, Validators.email]]
  });

  protected readonly noticeForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(4)]],
    audience: ['All' as NoticeAudience, Validators.required],
    priority: ['High' as NoticePriority, Validators.required],
    body: ['', [Validators.required, Validators.minLength(10)]]
  });

  protected readonly departmentFilteredStudents = computed(() => {
    const dept = this.selectedDepartment();
    const list = this.studentsService.students();
    return dept === 'all' ? list : list.filter(s => s.department === dept);
  });

  protected readonly enrichedStudents = computed<EnrichedStudentRow[]>(() => {
    const students = this.departmentFilteredStudents();
    const sessions = this.filteredAttendanceSessions();
    const results = this.resultsService.results();
    const ledgers = this.financeService.ledgers();

    return students.map(student => {
      const courseSessions = sessions.filter(sess => sess.courseId === student.courseId);
      let attended = 0;
      for (const sess of courseSessions) {
        const status = this.attendanceService.getStudentStatusForSession(sess.id, student.id);
        if (status === 'Present' || status === 'Leave') {
          attended++;
        }
      }
      const totalSess = courseSessions.length;
      const attendancePct = totalSess > 0 ? Math.round((attended / totalSess) * 100) : 92;

      const stuResults = results.filter(r => r.studentId === student.id && r.maxMarks > 0);
      const avgPct =
        stuResults.length > 0
          ? stuResults.reduce((acc, r) => acc + (r.marksObtained / r.maxMarks) * 100, 0) / stuResults.length
          : 82;
      const cgpa = Math.min(10, Math.max(4, Number((avgPct / 10).toFixed(2))));

      const ledger = ledgers.find(l => l.studentId === student.id);
      const totalDue = ledger
        ? ledger.installments.reduce((acc, inst) => acc + Math.max(0, inst.totalAmount + inst.fineAmount - inst.concessionAmount), 0)
        : 0;
      const feePaid = ledger
        ? ledger.installments.reduce((acc, inst) => acc + inst.paidAmount, 0)
        : 0;
      const feeDue = Math.max(0, totalDue - feePaid);
      const feeStatus: 'Paid' | 'Partial' | 'Unpaid' =
        feeDue === 0 ? 'Paid' : feePaid > 0 ? 'Partial' : 'Unpaid';

      return {
        student,
        attendancePct,
        attendedCount: attended,
        totalSessionsCount: totalSess,
        cgpa,
        feePaid,
        feeDue,
        feeStatus
      };
    });
  });

  protected readonly lowAttendanceStudents = computed(() =>
    this.enrichedStudents().filter(row => row.attendancePct < 75)
  );

  protected readonly filteredAttendanceSessions = computed(() => {
    const dept = this.selectedDepartment();
    const range = this.selectedDateRange();
    const allSessions = this.attendanceService.sessions();
    const coursesInDept =
      dept === 'all'
        ? null
        : new Set(this.academicService.courses().filter(c => c.department === dept).map(c => c.id));

    const cutoffMs = this.getDateRangeCutoffMs(range);
    const now = new Date();

    return allSessions.filter(sess => {
      if (coursesInDept && !coursesInDept.has(sess.courseId)) return false;
      if (range === 'month') {
        const dt = new Date(sess.date);
        return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
      }
      if (cutoffMs !== null) {
        return new Date(sess.date).getTime() >= cutoffMs;
      }
      return true;
    });
  });

  protected readonly upcomingExams = computed(() => {
    const dept = this.selectedDepartment();
    const coursesInDept =
      dept === 'all'
        ? null
        : new Set(this.academicService.courses().filter(c => c.department === dept).map(c => c.id));

    return this.examsService
      .exams()
      .filter(ex => ex.status !== 'Completed' && (!coursesInDept || coursesInDept.has(ex.courseId)))
      .sort((a, b) => a.date.localeCompare(b.date));
  });

  protected readonly kpiMetrics = computed(() => {
    const dept = this.selectedDepartment();
    const students = this.departmentFilteredStudents();
    const activeStudents = students.filter(s => s.status === 'Active').length;
    const admissions = this.studentsService.admissions().filter(a => dept === 'all' || a.department === dept);

    const faculty = this.facultyService.facultyList().filter(f => dept === 'all' || f.department === dept);
    const depts = dept === 'all' ? this.departments() : this.departments().filter(d => d.name === dept);
    const courses = dept === 'all' ? this.courses() : this.courses().filter(c => c.department === dept);

    const sessions = this.filteredAttendanceSessions();
    const attendancePct =
      sessions.length > 0
        ? Math.round(sessions.reduce((acc, s) => acc + s.percentage, 0) / sessions.length)
        : 0;

    const studentIds = new Set(students.map(s => s.id));
    const ledgers = this.financeService.ledgers().filter(l => studentIds.has(l.studentId));
    const nowTime = Date.now();

    let totalBilled = 0;
    let collectedFromLedgers = 0;
    let overdueFees = 0;

    for (const ledger of ledgers) {
      for (const inst of ledger.installments) {
        const net = Math.max(0, inst.totalAmount + inst.fineAmount - inst.concessionAmount);
        const pending = Math.max(0, net - inst.paidAmount);
        totalBilled += net;
        collectedFromLedgers += inst.paidAmount;
        if (pending > 0 && new Date(inst.dueDate).getTime() < nowTime) {
          overdueFees += pending;
        }
      }
    }

    const payments = this.financeService.payments().filter(p => p.status === 'Paid' && studentIds.has(p.studentId));
    const collectedFees = collectedFromLedgers;
    const outstandingFees = Math.max(0, totalBilled - collectedFromLedgers);
    const collectionPct = totalBilled > 0 ? Math.round((collectedFromLedgers / totalBilled) * 100) : 0;

    const allResults = this.resultsService.results().filter(r => studentIds.has(r.studentId));
    const passed = allResults.filter(r => r.grade !== 'F').length;
    const examPassRate = allResults.length > 0 ? Math.round((passed / allResults.length) * 100) : 100;
    const avgExamScorePct =
      allResults.length > 0
        ? Math.round(
            allResults.reduce((acc, r) => acc + (r.maxMarks > 0 ? (r.marksObtained / r.maxMarks) * 100 : 0), 0) /
              allResults.length
          )
        : 0;

    return {
      totalStudents: students.length,
      activeStudents,
      newAdmissionsCount: admissions.length,
      totalFaculty: faculty.length,
      departmentsCount: depts.length,
      coursesCount: courses.length,
      attendancePct,
      sessionsCount: sessions.length,
      lowAttendanceCount: this.lowAttendanceStudents().length,
      collectedFees,
      outstandingFees,
      overdueFees,
      collectionPct,
      paymentsCount: payments.length,
      examPassRate,
      avgExamScorePct,
      totalResultsEvaluated: allResults.length
    };
  });

  protected readonly criticalAlerts = computed<CriticalAlertItem[]>(() => {
    const alerts: CriticalAlertItem[] = [];

    const lowCount = this.lowAttendanceStudents().length;
    if (lowCount > 0) {
      alerts.push({
        id: 'alert-att',
        severity: 'high',
        title: `${lowCount} Low-Attendance Student${lowCount === 1 ? '' : 's'}`,
        description: 'Below mandatory 75% lecture attendance threshold.',
        count: lowCount,
        route: '/admin/attendance',
        icon: 'warning',
        actionLabel: 'Review'
      });
    }

    const pendingApprovals = this.resultsService.results().filter(r => r.status === 'Submitted for Approval').length;
    if (pendingApprovals > 0) {
      alerts.push({
        id: 'alert-res',
        severity: 'medium',
        title: `${pendingApprovals} Result Script${pendingApprovals === 1 ? '' : 's'} Pending`,
        description: 'Faculty mark batches awaiting Examination Cell sign-off.',
        count: pendingApprovals,
        route: '/admin/results',
        icon: 'fact_check',
        actionLabel: 'Approve'
      });
    }

    const pendingLeaves = this.studentFirebaseService.leaveRequests().filter(l => l.status === 'Pending').length;
    if (pendingLeaves > 0) {
      alerts.push({
        id: 'alert-leave',
        severity: 'info',
        title: `${pendingLeaves} Pending Leave Request${pendingLeaves === 1 ? '' : 's'}`,
        description: 'Student medical & OD applications awaiting review.',
        count: pendingLeaves,
        route: '/admin/attendance',
        icon: 'event_busy',
        actionLabel: 'Process'
      });
    }

    const openTickets = this.studentFirebaseService
      .supportTickets()
      .filter(t => t.status === 'Open' || t.status === 'In Progress').length;
    if (openTickets > 0) {
      alerts.push({
        id: 'alert-tickets',
        severity: 'medium',
        title: `${openTickets} Open Helpdesk Ticket${openTickets === 1 ? '' : 's'}`,
        description: 'Active student service requests in message queue.',
        count: openTickets,
        route: '/admin/messages',
        icon: 'support_agent',
        actionLabel: 'Respond'
      });
    }

    const pendingAdmissions = this.studentsService
      .admissions()
      .filter(a => a.status === 'Applied' || a.status === 'Under Review').length;
    if (pendingAdmissions > 0) {
      alerts.push({
        id: 'alert-adm',
        severity: 'info',
        title: `${pendingAdmissions} Admission Application${pendingAdmissions === 1 ? '' : 's'}`,
        description: 'Applicants awaiting document check or enrollment.',
        count: pendingAdmissions,
        route: '/admin/student-admissions',
        icon: 'how_to_reg',
        actionLabel: 'Verify'
      });
    }

    return alerts.slice(0, 4);
  });

  protected readonly filteredStudentRows = computed(() => {
    const filter = this.activeFilter();
    const q = this.searchQuery().trim().toLowerCase();

    return this.enrichedStudents().filter(row => {
      const s = row.student;
      if (filter === 'mca' && !s.course.toLowerCase().includes('mca') && !s.department.includes('Computer Applications')) {
        return false;
      }
      if (filter === 'btech' && !s.course.toLowerCase().includes('b.tech')) {
        return false;
      }
      if (filter === 'defaulters' && row.attendancePct >= 75) {
        return false;
      }
      if (q) {
        const blob = `${s.enrollmentNo} ${s.name} ${s.course} ${s.section} ${s.department}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  });

  protected readonly visibleStudentRows = computed(() => this.filteredStudentRows().slice(0, 8));

  constructor() {
    afterNextRender(() => {
      if (isPlatformBrowser(this.platformId)) {
        this.chartsReady.set(true);
      }
    });

    effect(() => {
      if (!this.chartsReady() || !isPlatformBrowser(this.platformId)) return;
      this.renderCharts();
    });
  }

  ngOnDestroy(): void {
    this.enrollmentChart?.destroy();
    this.attendanceChart?.destroy();
    this.gradeChart?.destroy();
  }

  private getDateRangeCutoffMs(range: DateRangeOption): number | null {
    const now = Date.now();
    if (range === '7d') return now - 7 * 86400000;
    if (range === '30d') return now - 30 * 86400000;
    return null;
  }

  private renderCharts(): void {
    // 1. Department Distribution Chart
    const deptFilter = this.selectedDepartment();
    const depts =
      deptFilter === 'all'
        ? this.departments()
        : this.departments().filter(d => d.name === deptFilter);

    const students = this.studentsService.students();
    const faculty = this.facultyService.facultyList();

    const deptLabels = depts.map(d => d.code);
    const studentCounts = depts.map(d => {
      const liveCount = students.filter(s => s.department === d.name).length;
      return liveCount > 0 ? liveCount : d.studentCount;
    });
    const facultyCounts = depts.map(d => {
      const liveCount = faculty.filter(f => f.department === d.name).length;
      return liveCount > 0 ? liveCount : d.facultyCount;
    });

    const elCanvas = this.enrollmentCanvas()?.nativeElement;
    if (elCanvas) {
      this.enrollmentChart?.destroy();
      this.enrollmentChart = new Chart(elCanvas, {
        type: 'bar',
        data: {
          labels: deptLabels,
          datasets: [
            {
              label: 'Enrolled Students',
              data: studentCounts,
              backgroundColor: '#4F46E5',
              borderRadius: 6
            },
            {
              label: 'Faculty Members',
              data: facultyCounts,
              backgroundColor: '#10B981',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
          },
          scales: {
            y: { beginAtZero: true, grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 } } },
            x: { grid: { display: false }, ticks: { font: { size: 10 } } }
          }
        }
      });
    }

    // 2. Attendance Trend Chart
    const sessions = [...this.filteredAttendanceSessions()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-8);

    const atCanvas = this.attendanceCanvas()?.nativeElement;
    if (atCanvas) {
      this.attendanceChart?.destroy();
      this.attendanceChart = new Chart(atCanvas, {
        type: 'line',
        data: {
          labels: sessions.map(s => s.date.slice(5)),
          datasets: [
            {
              label: 'Attendance %',
              data: sessions.map(s => s.percentage),
              borderColor: '#0EA5E9',
              backgroundColor: 'rgba(14, 165, 233, 0.12)',
              fill: true,
              tension: 0.35,
              borderWidth: 2.5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              min: 50,
              max: 100,
              grid: { color: 'rgba(0,0,0,0.05)' },
              ticks: { callback: v => `${v}%`, font: { size: 10 } }
            },
            x: { grid: { display: false }, ticks: { font: { size: 10 } } }
          }
        }
      });
    }

    // 3. Grade Distribution Chart
    const studentIds = new Set(this.departmentFilteredStudents().map(s => s.id));
    const results = this.resultsService.results().filter(r => studentIds.has(r.studentId));
    const gradeOrder = ['O', 'A+', 'A', 'B+', 'B', 'C', 'F'];
    const gradeCounts = gradeOrder.map(g => results.filter(r => r.grade === g).length);

    const grCanvas = this.gradeCanvas()?.nativeElement;
    if (grCanvas) {
      this.gradeChart?.destroy();
      this.gradeChart = new Chart(grCanvas, {
        type: 'doughnut',
        data: {
          labels: gradeOrder,
          datasets: [
            {
              data: gradeCounts,
              backgroundColor: ['#4F46E5', '#10B981', '#0EA5E9', '#8B5CF6', '#F59E0B', '#64748B', '#EF4444'],
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
          }
        }
      });
    }
  }

  protected onDepartmentChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedDepartment.set(val);
  }

  protected onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected formatCurrencyCompact(amount: number): string {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  protected openAddStudentModal(): void {
    this.studentFormError.set('');
    this.studentForm.patchValue({
      enrollmentNo: this.studentsService.generateEnrollmentNo('MCA'),
      name: '',
      guardianName: '',
      phone: '',
      email: ''
    });
    this.isAddStudentOpen.set(true);
  }

  protected openPublishNoticeModal(): void {
    this.noticeForm.reset({
      title: '',
      audience: 'All',
      priority: 'High',
      body: ''
    });
    this.isNoticeModalOpen.set(true);
  }

  protected viewDossier(row: EnrichedStudentRow): void {
    this.selectedDossier.set(row);
  }

  protected notifyDefaulter(row: EnrichedStudentRow): void {
    this.notifiedDefaulters.update(curr => ({ ...curr, [row.student.id]: true }));
    this.activityService.logActivity({
      user: 'Administrator',
      role: 'Super Admin',
      operationType: 'Publish',
      action: 'dispatched attendance shortfall notice for',
      target: `${row.student.name} (${row.student.enrollmentNo}) — ${row.attendancePct}%`,
      recordId: row.student.enrollmentNo,
      module: 'Overview Alerts',
      category: 'Attendance',
      details: `Parent phone ${row.student.guardian.phone} notified regarding attendance below 75%.`,
      icon: 'sms'
    });
    this.showToast(`Attendance alert dispatched for ${row.student.name} (${row.student.enrollmentNo}).`);
  }

  protected notifyAllDefaulters(): void {
    const list = this.lowAttendanceStudents();
    if (list.length === 0) {
      this.showToast('No attendance defaulters found for the selected filter.');
      return;
    }
    const nextMap: Record<string, boolean> = { ...this.notifiedDefaulters() };
    for (const item of list) {
      nextMap[item.student.id] = true;
    }
    this.notifiedDefaulters.set(nextMap);
    this.activityService.logActivity({
      user: 'Administrator',
      role: 'Super Admin',
      operationType: 'Publish',
      action: 'dispatched bulk attendance alert to',
      target: `${list.length} parent contacts below 75% threshold`,
      module: 'Overview Alerts',
      category: 'Attendance',
      icon: 'campaign'
    });
    this.showToast(`Attendance alerts dispatched to ${list.length} guardians.`);
  }

  protected submitNewStudent(): void {
    if (this.studentForm.invalid) return;
    const raw = this.studentForm.getRawValue();
    const course = this.courses().find(c => c.id === raw.courseId) ?? this.courses()[0];
    const dept = this.departments().find(d => d.name === course?.department);

    const result = this.studentsService.saveStudent({
      enrollmentNo: raw.enrollmentNo,
      name: raw.name,
      gender: 'Other',
      dob: '2003-01-01',
      email: raw.email,
      phone: raw.phone,
      address: 'Campus Hostel / Day Scholar',
      courseId: course.id,
      course: course.name,
      departmentId: dept?.id ?? 'dept-mca',
      department: course.department,
      semester: 'Semester 1',
      sectionId: raw.section === 'Section B' ? 'sec-2' : 'sec-1',
      section: raw.section,
      admissionDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      guardian: {
        name: raw.guardianName,
        relation: 'Guardian',
        phone: raw.phone
      }
    });

    if (!result.success) {
      this.studentFormError.set(result.error ?? 'Failed to enroll student.');
      return;
    }

    this.activityService.logActivity({
      user: 'Administrator',
      role: 'Super Admin',
      operationType: 'Create',
      action: 'enrolled new student',
      target: `${raw.name} (${raw.enrollmentNo.toUpperCase()}) in ${course.name}`,
      recordId: raw.enrollmentNo.toUpperCase(),
      module: 'Dashboard Overview',
      category: 'People',
      icon: 'person_add'
    });
    this.auditService.log({
      userId: 'admin-1',
      userName: 'Administrator',
      role: 'Super Admin',
      module: 'Students',
      action: 'Create',
      target: `${raw.name} (${raw.enrollmentNo.toUpperCase()})`,
      newValue: `${course.name} · ${raw.section}`,
      status: 'Success'
    });

    this.isAddStudentOpen.set(false);
    this.showToast(`Enrolled ${raw.name} (${raw.enrollmentNo.toUpperCase()}) successfully.`);
  }

  protected submitNewNotice(): void {
    if (this.noticeForm.invalid) return;
    const raw = this.noticeForm.getRawValue();
    const today = new Date().toISOString().split('T')[0];
    const expiry = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    this.commService.saveNotice({
      title: raw.title,
      body: raw.body,
      audience: raw.audience,
      priority: raw.priority,
      publishDate: today,
      expiryDate: expiry,
      isPinned: raw.priority === 'Urgent',
      createdBy: 'Administrator'
    });

    this.activityService.logActivity({
      user: 'Administrator',
      role: 'Super Admin',
      operationType: 'Publish',
      action: 'published official notice:',
      target: `${raw.title} (Audience: ${raw.audience})`,
      module: 'Dashboard Overview',
      category: 'Notices',
      icon: 'campaign'
    });
    this.auditService.log({
      userId: 'admin-1',
      userName: 'Administrator',
      role: 'Super Admin',
      module: 'Notices',
      action: 'Create',
      target: raw.title,
      newValue: `Audience: ${raw.audience}, Priority: ${raw.priority}`,
      status: 'Success'
    });

    this.isNoticeModalOpen.set(false);
    this.showToast(`Circular "${raw.title}" published to portal.`);
  }

  protected exportDashboardExcel(): void {
    const rows = this.filteredStudentRows().map(r => ({
      EnrollmentNo: r.student.enrollmentNo,
      Name: r.student.name,
      Department: r.student.department,
      Course: r.student.course,
      Semester: r.student.semester,
      Section: r.student.section,
      AttendancePct: r.attendancePct,
      SGPA: r.cgpa,
      FeePaidINR: r.feePaid,
      FeeDueINR: r.feeDue,
      FeeStatus: r.feeStatus
    }));
    exportToExcel(rows, `EduERP_Executive_Dashboard_${new Date().toISOString().split('T')[0]}`);
    this.activityService.logActivity({
      user: 'Administrator',
      role: 'Super Admin',
      operationType: 'Export',
      action: 'exported Executive Dashboard Excel report for',
      target: `${rows.length} student records (${this.selectedDepartment()})`,
      module: 'Dashboard Overview',
      category: 'Academic',
      icon: 'table_view'
    });
    this.showToast('Dashboard workbook exported to Excel.');
  }

  protected exportDashboardPdf(): void {
    const kpi = this.kpiMetrics();
    const columns = ['Enrollment No', 'Student', 'Course', 'Attendance', 'SGPA', 'Fee Paid', 'Fee Due'];
    const rows = this.filteredStudentRows().map(r => [
      r.student.enrollmentNo,
      r.student.name,
      r.student.course,
      `${r.attendancePct}%`,
      r.cgpa.toFixed(2),
      `Rs.${r.feePaid.toLocaleString('en-IN')}`,
      `Rs.${r.feeDue.toLocaleString('en-IN')}`
    ]);
    exportToPdf(
      'Executive Institutional Dashboard Summary',
      columns,
      rows,
      `EduERP_Executive_Report_${new Date().toISOString().split('T')[0]}`,
      [
        `Scope: ${this.selectedDepartment() === 'all' ? 'All Departments' : this.selectedDepartment()} | Session: AY ${this.activeAcademicYear()}`,
        `Students: ${kpi.totalStudents} (${kpi.activeStudents} Active) | Faculty: ${kpi.totalFaculty} | Attendance Avg: ${kpi.attendancePct}% | Exam Pass Rate: ${kpi.examPassRate}%`,
        `Fee Collected: Rs.${kpi.collectedFees.toLocaleString('en-IN')} (${kpi.collectionPct}%) | Outstanding: Rs.${kpi.outstandingFees.toLocaleString('en-IN')}`
      ]
    );
    this.activityService.logActivity({
      user: 'Administrator',
      role: 'Super Admin',
      operationType: 'Export',
      action: 'exported Executive Dashboard PDF report for',
      target: `${rows.length} student records (${this.selectedDepartment()})`,
      module: 'Dashboard Overview',
      category: 'Academic',
      icon: 'picture_as_pdf'
    });
    this.showToast('Executive Dashboard PDF exported.');
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set('');
      }
    }, 3500);
  }
}
