import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ChildContextService } from '../../../services/child-context.service';
import { ParentPortalFacade } from '../shared/parent-portal.facade';

@Component({
  selector: 'app-parent-dashboard',
  imports: [RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (snapshot(); as data) {
      <div class="space-y-6 font-sans text-slate-900 text-[13px] pb-12 min-w-0">

        <!-- Executive Child Command Center & Welcome Header -->
        <section class="bg-[#0F172A] text-white p-5 sm:p-7 rounded-2xl shadow-xl relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6 border border-white/10">
          <div class="absolute -right-16 -top-16 w-64 h-64 rounded-full aurora-glow pointer-events-none opacity-60"></div>
          
          <div class="relative z-10 space-y-3 min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-3 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm border border-indigo-400/30">
                Parent Overview
              </span>
              <span class="text-slate-500">•</span>
              <span class="text-xs text-slate-300">{{ formattedDate() }}</span>
            </div>

            <div class="space-y-1">
              <h1 class="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {{ greeting() }}, {{ parentName() }}
              </h1>
              <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Academic progress, attendance, and fee tracking for <strong class="text-white font-semibold underline decoration-indigo-400 underline-offset-4">{{ data.student.name }}</strong> ({{ data.student.enrollmentNo }})
              </p>
            </div>

            <!-- Active Child Summary Card + Multi-child Quick Switch Chips -->
            <div class="flex items-center gap-3 pt-2 flex-wrap">
              <div class="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                <div class="w-9 h-9 rounded-lg gradient-accent text-white flex items-center justify-center text-xs font-bold shadow-md shrink-0">
                  {{ data.student.initials }}
                </div>
                <div>
                  <p class="text-xs font-bold text-white">{{ data.student.name }}</p>
                  <p class="text-[11px] text-indigo-200">{{ data.student.course }} · {{ data.student.semester }} · Section {{ data.student.section }}</p>
                </div>
              </div>

              @if (linkedChildren().length > 1) {
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-[11px] text-slate-400 font-medium">Switch Child:</span>
                  @for (child of linkedChildren(); track child.id) {
                    <button
                      type="button"
                      (click)="childContext.selectChild(child.id)"
                      class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                      [class]="child.id === data.student.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white/10 text-slate-200 hover:bg-white/20'"
                    >
                      <span>{{ child.name.split(' ')[0] }}</span>
                      @if (child.id === data.student.id) {
                        <mat-icon class="text-xs">check</mat-icon>
                      }
                    </button>
                  }
                </div>
              }
            </div>
          </div>

          <div class="relative z-10 shrink-0 flex items-center gap-2.5 flex-wrap">
            <a
              routerLink="/parent/my-children"
              class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <mat-icon class="text-base">family_restroom</mat-icon>
              <span>Manage Children</span>
            </a>
          </div>
        </section>

        <!-- 5 Key Executive Metric Summary Cards -->
        <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          <!-- 1. Overall Attendance -->
          <div class="bg-gradient-to-br from-white to-slate-50 p-4.5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Attendance</p>
                <p
                  class="text-3xl font-extrabold mt-1.5 tabular-nums"
                  [class]="data.isLowAttendance ? 'text-rose-600' : 'text-slate-900'"
                >
                  {{ data.overallAttendancePct }}%
                </p>
              </div>
              <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                <mat-icon class="text-xl">how_to_reg</mat-icon>
              </div>
            </div>
            <div class="space-y-1 pt-2 border-t border-slate-100">
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-slate-500">Req. Threshold</span>
                <span class="font-semibold text-slate-700">{{ data.attendanceThreshold }}%</span>
              </div>
              @if (data.isLowAttendance) {
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                  <mat-icon class="text-xs">warning</mat-icon> Low Attendance
                </span>
              } @else {
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                  <mat-icon class="text-xs">check_circle</mat-icon> On Track
                </span>
              }
            </div>
          </div>

          <!-- 2. Coursework & Pending Assignments -->
          <div class="bg-gradient-to-br from-white to-amber-50/40 p-4.5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Assignments</p>
                <p class="text-3xl font-extrabold text-slate-900 mt-1.5 tabular-nums">{{ data.pendingAssignmentsCount }}</p>
              </div>
              <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                <mat-icon class="text-xl">assignment_late</mat-icon>
              </div>
            </div>
            <div class="space-y-1 pt-2 border-t border-slate-100">
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-slate-500">Overdue Tasks</span>
                <span class="font-bold" [class]="data.overdueAssignmentsCount > 0 ? 'text-rose-600' : 'text-slate-700'">
                  {{ data.overdueAssignmentsCount }}
                </span>
              </div>
              <a routerLink="/parent/assignments" class="text-[11px] font-bold text-indigo-600 hover:underline inline-flex items-center gap-0.5">
                <span>View Assignments</span>
                <mat-icon class="text-xs">chevron_right</mat-icon>
              </a>
            </div>
          </div>

          <!-- 3. Upcoming Exams -->
          <div class="bg-gradient-to-br from-white to-indigo-50/40 p-4.5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Upcoming Exams</p>
                <p class="text-3xl font-extrabold text-slate-900 mt-1.5 tabular-nums">{{ data.upcomingExams.length }}</p>
              </div>
              <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                <mat-icon class="text-xl">event_note</mat-icon>
              </div>
            </div>
            <div class="space-y-1 pt-2 border-t border-slate-100">
              <p class="text-[11px] text-slate-600 truncate font-medium">
                {{ data.upcomingExams.length > 0 ? 'Next: ' + facade.formatShortDate(data.upcomingExams[0].date) : 'No pending exams' }}
              </p>
              <a routerLink="/parent/exams" class="text-[11px] font-bold text-indigo-600 hover:underline inline-flex items-center gap-0.5">
                <span>Exam Schedule</span>
                <mat-icon class="text-xs">chevron_right</mat-icon>
              </a>
            </div>
          </div>

          <!-- 4. Average Score / Published Results -->
          <div class="bg-gradient-to-br from-white to-emerald-50/40 p-4.5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Average Score</p>
                <p class="text-3xl font-extrabold text-slate-900 mt-1.5 tabular-nums">
                  {{ data.averageMarksPct !== null ? data.averageMarksPct + '%' : 'N/A' }}
                </p>
              </div>
              <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                <mat-icon class="text-xl">grade</mat-icon>
              </div>
            </div>
            <div class="space-y-1 pt-2 border-t border-slate-100">
              <p class="text-[11px] text-slate-600 truncate font-medium">
                {{ data.publishedResults.length > 0 ? data.publishedResults.length + ' published results' : 'Awaiting publication' }}
              </p>
              <a routerLink="/parent/results" class="text-[11px] font-bold text-indigo-600 hover:underline inline-flex items-center gap-0.5">
                <span>Academic Results</span>
                <mat-icon class="text-xs">chevron_right</mat-icon>
              </a>
            </div>
          </div>

          <!-- 5. Fee Dues -->
          <div class="bg-gradient-to-br from-white to-rose-50/40 p-4.5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden group hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Fee Balance Due</p>
                <p
                  class="text-3xl font-extrabold mt-1.5 tabular-nums"
                  [class]="data.feeSummary.due > 0 ? 'text-rose-600' : 'text-emerald-700'"
                >
                  ₹{{ facade.formatINR(data.feeSummary.due) }}
                </p>
              </div>
              <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                <mat-icon class="text-xl">account_balance_wallet</mat-icon>
              </div>
            </div>
            <div class="space-y-1 pt-2 border-t border-slate-100">
              <p class="text-[11px] text-slate-600 truncate font-medium">
                {{ data.feeSummary.nextDueDate ? 'Due: ' + facade.formatShortDate(data.feeSummary.nextDueDate!) : 'All dues cleared' }}
              </p>
              <a routerLink="/parent/fees" class="text-[11px] font-bold text-indigo-600 hover:underline inline-flex items-center gap-0.5">
                <span>Fee Ledger & Pay</span>
                <mat-icon class="text-xs">chevron_right</mat-icon>
              </a>
            </div>
          </div>

        </section>

        <!-- Executive Grid Row 1: Priority Alerts & Today's Class Timetable -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Priority Alerts Column (1 span) -->
          <section class="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4 lg:col-span-1 flex flex-col">
            <div class="flex items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div>
                <h2 class="text-sm font-bold text-slate-900">Priority Alerts</h2>
                <p class="text-xs text-slate-500">Real-time academic & fee notifications</p>
              </div>
              <span class="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold tabular-nums border border-indigo-100">
                {{ data.alerts.length }}
              </span>
            </div>

            @if (data.alerts.length > 0) {
              <div class="space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-1">
                @for (alert of data.alerts; track alert.id) {
                  <div class="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-white transition-all space-y-2">
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex items-center gap-2">
                        <div
                          class="w-7 h-7 rounded-lg border flex items-center justify-center shrink-0"
                          [class]="alert.severity === 'Urgent'
                            ? 'bg-rose-50 text-rose-600 border-rose-200'
                            : alert.severity === 'High'
                              ? 'bg-amber-50 text-amber-600 border-amber-200'
                              : 'bg-indigo-50 text-indigo-600 border-indigo-200'"
                        >
                          <mat-icon class="text-sm">{{ alert.icon }}</mat-icon>
                        </div>
                        <h3 class="text-xs font-bold text-slate-900">{{ alert.title }}</h3>
                      </div>
                      <span
                        class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0"
                        [class]="alert.severity === 'Urgent'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : alert.severity === 'High'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'"
                      >
                        {{ alert.severity }}
                      </span>
                    </div>
                    <p class="text-xs text-slate-600 leading-relaxed">{{ alert.description }}</p>
                    <div class="text-right pt-1">
                      <a
                        [routerLink]="alert.route"
                        class="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>Review</span>
                        <mat-icon class="text-xs">chevron_right</mat-icon>
                      </a>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/90 space-y-2 my-auto">
                <mat-icon class="text-3xl text-emerald-600">verified_user</mat-icon>
                <p class="text-xs font-bold text-slate-900">All In Order</p>
                <p class="text-[11px] text-slate-500">Attendance, fees, and results are all up to date.</p>
              </div>
            }
          </section>

          <!-- Today's Class Schedule / Live Timetable (2 span) -->
          <section class="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4 lg:col-span-2 flex flex-col">
            <div class="flex items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div>
                <h2 class="text-sm font-bold text-slate-900">Today's Class Schedule</h2>
                <p class="text-xs text-slate-500">Live lecture timeline for Section {{ data.student.section }}</p>
              </div>
              <a routerLink="/parent/timetable" class="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1">
                <span>Weekly Schedule</span>
                <mat-icon class="text-sm">chevron_right</mat-icon>
              </a>
            </div>

            @if (data.todaysTimetable.length > 0) {
              <div class="space-y-2.5 flex-1 overflow-y-auto max-h-[360px] pr-1">
                @for (period of data.todaysTimetable; track period.id) {
                  <div
                    class="p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                    [class]="period.status === 'current'
                      ? 'bg-indigo-50/90 border-indigo-300 shadow-xs'
                      : period.status === 'next'
                        ? 'bg-amber-50/70 border-amber-200'
                        : period.status === 'completed'
                          ? 'bg-slate-50 border-slate-200/60 opacity-75'
                          : 'bg-white border-slate-200/80'"
                  >
                    <div class="flex items-start gap-3 min-w-0">
                      <div class="w-12 text-center shrink-0 pt-0.5">
                        <span class="text-[11px] font-mono font-bold text-slate-600 block">{{ period.timeRange.split(' - ')[0] }}</span>
                        <span class="text-[10px] text-slate-400 block">{{ period.timeRange.split(' - ')[1] }}</span>
                      </div>
                      <div class="min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <h3 class="text-xs font-bold text-slate-900 truncate">{{ period.subjectName }}</h3>
                          <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {{ period.subjectType }}
                          </span>
                        </div>
                        <p class="text-[11px] text-slate-500 mt-0.5">
                          Faculty: <strong class="text-slate-700">{{ period.facultyName }}</strong> · Room: <span class="font-mono font-bold text-indigo-700">{{ period.room }}</span>
                        </p>
                      </div>
                    </div>

                    <div class="shrink-0 flex items-center justify-end">
                      @if (period.status === 'current') {
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-600 text-white flex items-center gap-1 shadow-xs">
                          <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span> Live Period
                        </span>
                      } @else if (period.status === 'next') {
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Next Up
                        </span>
                      } @else if (period.status === 'completed') {
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-medium text-slate-500">
                          Completed
                        </span>
                      } @else {
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-medium text-slate-600">
                          Upcoming
                        </span>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/90 text-xs text-slate-500 my-auto">
                No classes scheduled for today (or holiday / weekend).
              </div>
            }
          </section>

        </div>

        <!-- Executive Grid Row 2: Subject-wise Attendance Breakdown -->
        <section class="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
          <div class="flex items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div>
              <h2 class="text-sm font-bold text-slate-900">Subject-wise Attendance Breakdown</h2>
              <p class="text-xs text-slate-500">Threshold: {{ data.attendanceThreshold }}% minimum required by the institution</p>
            </div>
            <a routerLink="/parent/attendance" class="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1">
              <span>Detailed Attendance Log</span>
              <mat-icon class="text-sm">chevron_right</mat-icon>
            </a>
          </div>

          @if (data.subjectAttendances.length > 0) {
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (sub of data.subjectAttendances; track sub.subjectId) {
                <div class="p-4 rounded-xl bg-slate-50/80 border border-slate-200/90 space-y-3">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <h3 class="font-bold text-xs text-slate-900 truncate">{{ sub.name }}</h3>
                      <p class="text-[11px] font-mono text-slate-500">{{ sub.code }}</p>
                    </div>
                    <span
                      class="text-xs font-extrabold tabular-nums px-2.5 py-0.5 rounded-lg border"
                      [class]="sub.isLow ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'"
                    >
                      {{ sub.percentage }}%
                    </span>
                  </div>

                  <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-500"
                      [style.width.%]="sub.percentage"
                      [class]="sub.isLow ? 'bg-rose-500' : 'bg-indigo-600'"
                    ></div>
                  </div>

                  <div class="flex items-center justify-between text-[11px] font-medium">
                    <span class="text-slate-500">Attended: <strong class="text-slate-800 tabular-nums">{{ sub.attended }}</strong> / {{ sub.total }}</span>
                    @if (sub.isLow) {
                      <span class="text-rose-600 font-bold">Below Threshold</span>
                    } @else {
                      <span class="text-emerald-700 font-semibold">On Track</span>
                    }
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/90 text-xs text-slate-500">
              No attendance sessions recorded yet for {{ data.student.section }}.
            </div>
          }
        </section>

        <!-- Executive Grid Row 3: Recent Results, Upcoming Exams & Campus Notices -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Recent Published Results (1 span) -->
          <section class="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
            <div class="flex items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div>
                <h2 class="text-sm font-bold text-slate-900">Recent Exam Results</h2>
                <p class="text-xs text-slate-500">Published official marks</p>
              </div>
              <a routerLink="/parent/results" class="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1">
                <span>All Results</span>
                <mat-icon class="text-sm">chevron_right</mat-icon>
              </a>
            </div>

            @if (data.publishedResults.length > 0) {
              <div class="divide-y divide-slate-100">
                @for (res of data.publishedResults.slice(0, 4); track res.id) {
                  <div class="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div class="min-w-0">
                      <p class="text-xs font-bold text-slate-900 truncate">{{ res.examTitle }}</p>
                      <p class="text-[11px] text-slate-500">{{ res.subjectName }} · Marks: {{ res.marksObtained }}/{{ res.maxMarks }}</p>
                    </div>
                    <div class="text-right shrink-0">
                      <span class="text-xs font-extrabold px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 tabular-nums">
                        {{ res.percentage }}% · {{ res.grade }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/90 text-xs text-slate-500">
                No examination results published yet.
              </div>
            }
          </section>

          <!-- Upcoming Examination Schedule (1 span) -->
          <section class="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
            <div class="flex items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div>
                <h2 class="text-sm font-bold text-slate-900">Upcoming Exams</h2>
                <p class="text-xs text-slate-500">Test dates & evaluation mode</p>
              </div>
              <a routerLink="/parent/exams" class="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1">
                <span>Full Schedule</span>
                <mat-icon class="text-sm">chevron_right</mat-icon>
              </a>
            </div>

            @if (data.upcomingExams.length > 0) {
              <div class="divide-y divide-slate-100">
                @for (exam of data.upcomingExams.slice(0, 4); track exam.id) {
                  <div class="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div class="min-w-0">
                      <p class="text-xs font-bold text-slate-900 truncate">{{ exam.title }}</p>
                      <p class="text-[11px] text-slate-500">{{ exam.subjectName }} · Mode: <strong class="text-indigo-600">{{ exam.mode }}</strong></p>
                    </div>
                    <div class="text-right shrink-0">
                      <span class="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                        {{ facade.formatShortDate(exam.date) }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/90 text-xs text-slate-500">
                No upcoming exams scheduled.
              </div>
            }
          </section>

          <!-- Campus Notices & Circulars (1 span) -->
          <section class="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
            <div class="flex items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div>
                <h2 class="text-sm font-bold text-slate-900">Campus Notices</h2>
                <p class="text-xs text-slate-500">Institutional circulars for parents</p>
              </div>
              <a routerLink="/parent/notices" class="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1">
                <span>All Notices</span>
                <mat-icon class="text-sm">chevron_right</mat-icon>
              </a>
            </div>

            @if (data.notices.length > 0) {
              <div class="divide-y divide-slate-100">
                @for (notice of data.notices.slice(0, 3); track notice.id) {
                  <div class="py-3 first:pt-0 last:pb-0 space-y-1">
                    <div class="flex items-center justify-between gap-2">
                      <span
                        class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                        [class]="notice.priority === 'Urgent' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-700'"
                      >
                        {{ notice.priority }}
                      </span>
                      <span class="text-[10px] text-slate-400">{{ facade.formatShortDate(notice.publishDate) }}</span>
                    </div>
                    <h3 class="text-xs font-bold text-slate-900 line-clamp-1">{{ notice.title }}</h3>
                    <p class="text-[11px] text-slate-500 line-clamp-2">{{ notice.body }}</p>
                  </div>
                }
              </div>
            } @else {
              <div class="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/90 text-xs text-slate-500">
                No current circulars.
              </div>
            }
          </section>

        </div>

      </div>
    } @else {
      <div class="p-12 text-center bg-white rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
        <div class="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
          <mat-icon class="text-2xl animate-spin">sync</mat-icon>
        </div>
        <p class="text-sm font-bold text-slate-900">Loading Parent Dashboard...</p>
        <p class="text-xs text-slate-500">Please ensure a child student is linked to your parent account.</p>
        <div class="pt-2">
          <a routerLink="/parent/my-children" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-semibold inline-block">
            Link / Select Child
          </a>
        </div>
      </div>
    }
  `
})
export class ParentDashboard {
  protected readonly childContext = inject(ChildContextService);
  protected readonly facade = inject(ParentPortalFacade);

  protected readonly linkedChildren = this.childContext.linkedChildren;
  protected readonly parentName = computed(() => this.childContext.currentParent().name || 'Parent');
  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  });

  protected readonly formattedDate = computed(() => {
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date());
  });

  protected readonly snapshot = this.facade.selectedSnapshot;
}
