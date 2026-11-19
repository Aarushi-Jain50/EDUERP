import { ChangeDetectionStrategy, Component, inject, computed, signal, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { CurrentUserService } from '../../../services/current-user.service';
import { TimetableService } from '../../../services/timetable.service';
import { AttendanceService } from '../../../services/attendance.service';
import { AssignmentsService } from '../../../services/assignments.service';
import { ExaminationsService } from '../../../services/examinations.service';
import { ResultsService } from '../../../services/results.service';
import { FinanceService } from '../../../services/finance.service';
import { CommunicationService } from '../../../services/communication.service';
import { AcademicService } from '../../../services/academic.service';
import { SettingsService } from '../../../services/settings.service';

interface SchedulePeriodView {
  id: string;
  timeRange: string;
  subjectName: string;
  subjectType: string;
  facultyName: string;
  room: string;
  status: 'current' | 'next' | 'completed' | 'upcoming';
}

interface SubjectAttendanceView {
  subjectId: string;
  code: string;
  name: string;
  attended: number;
  total: number;
  percentage: number;
  isLow: boolean;
}

@Component({
  selector: 'app-student-dashboard',
  imports: [RouterLink, FormsModule, MatIconModule, BaseChartDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5 font-sans text-slate-900 text-[13px] pb-8 min-w-0">

      <!-- a. Welcome Banner -->
      <section class="gradient-brand text-white p-4 sm:p-6 rounded-xl shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5 border border-slate-800/80">
        <div class="absolute -right-12 -top-12 w-48 h-48 rounded-full aurora-glow pointer-events-none"></div>
        <div class="relative z-10 space-y-1.5 min-w-0">
          <div class="flex items-center gap-2 flex-wrap text-xs text-slate-300">
            <span class="font-semibold text-indigo-300">{{ currentStudent().course }}</span>
            <span class="text-slate-600" aria-hidden="true">/</span>
            <span>{{ currentStudent().semester }}</span>
            <span class="text-slate-600" aria-hidden="true">/</span>
            <span>{{ currentStudent().section }}</span>
            <span class="text-slate-600" aria-hidden="true">/</span>
            <span class="font-mono text-white">{{ currentStudent().enrollmentNo }}</span>
          </div>
          <h1 class="font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
            {{ greeting() }}, {{ firstName() }}
          </h1>
          <p class="text-[13px] text-slate-300">
            <span>{{ formattedDate() }}</span>
            <span class="mx-2 text-slate-600">|</span>
            <span>You have <strong class="text-indigo-300 font-semibold">{{ todaysClasses().length }}</strong> {{ todaysClasses().length === 1 ? 'class' : 'classes' }} today</span>
          </p>
        </div>
        <div class="relative z-10 shrink-0 flex flex-col min-[420px]:flex-row items-stretch min-[420px]:items-center gap-2.5 flex-wrap">
          <button
            type="button"
            (click)="isIdCardOpen.set(true)"
            class="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <mat-icon class="text-base text-indigo-300">badge</mat-icon>
            <span>Digital ID Pass</span>
          </button>
          <a
            routerLink="/student/timetable"
            class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold shadow-sm transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <mat-icon class="text-base">calendar_month</mat-icon>
            <span>View Timetable</span>
          </a>
        </div>
      </section>

      <!-- b. Five Stat Cards -->
      <section class="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-5">
        <div class="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-start justify-between gap-3 min-w-0">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">Overall Attendance</p>
            <p class="text-2xl font-bold mt-1.5 tabular-nums" [class]="overallAttendancePct() < attendanceThreshold() ? 'text-rose-600' : 'text-slate-900'">
              {{ overallAttendancePct() }}%
            </p>
            <p class="text-[11px] text-slate-500 mt-1">Minimum required: {{ attendanceThreshold() }}%</p>
          </div>
          <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-slate-200/90 flex items-center justify-center shrink-0">
            <mat-icon class="text-lg">how_to_reg</mat-icon>
          </div>
        </div>

        <div class="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-start justify-between gap-3 min-w-0">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">Pending Assignments</p>
            <p class="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">{{ pendingAssignments().length }}</p>
            <p class="text-[11px] mt-1 font-medium" [class]="overdueAssignmentsCount() > 0 ? 'text-rose-600' : 'text-slate-500'">
              {{ overdueAssignmentsCount() > 0 ? overdueAssignmentsCount() + ' overdue' : 'Coursework tasks' }}
            </p>
          </div>
          <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-slate-200/90 flex items-center justify-center shrink-0">
            <mat-icon class="text-lg">assignment_late</mat-icon>
          </div>
        </div>

        <div class="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-start justify-between gap-3 min-w-0">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">Upcoming Exams</p>
            <p class="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">{{ upcomingExams().length }}</p>
            <p class="text-[11px] text-slate-500 mt-1 truncate">
              {{ upcomingExams().length > 0 ? 'Next: ' + formatShortDate(upcomingExams()[0].date) : 'No upcoming exams' }}
            </p>
          </div>
          <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-slate-200/90 flex items-center justify-center shrink-0">
            <mat-icon class="text-lg">event_note</mat-icon>
          </div>
        </div>

        <a
          routerLink="/student/results"
          class="bg-white p-4 rounded-xl border border-slate-200/90 hover:border-indigo-300 shadow-sm flex items-start justify-between gap-3 min-w-0 transition-colors"
        >
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">Results Tab</p>
            <p class="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">
              {{ publishedResults().length > 0 ? publishedResults().length + ' Released' : 'Pending' }}
            </p>
            <p class="text-[11px] text-indigo-600 font-medium mt-1 truncate">
              {{ nextResultAnnouncement() ? 'Next: ' + formatShortDate(nextResultAnnouncement()!.resultAnnouncementDate) : 'Open Results tab' }}
            </p>
          </div>
          <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-slate-200/90 flex items-center justify-center shrink-0">
            <mat-icon class="text-lg">grade</mat-icon>
          </div>
        </a>

        <div class="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-start justify-between gap-3 min-w-0 min-[420px]:col-span-2 lg:col-span-1">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">Fee Due</p>
            <p class="text-2xl font-bold mt-1.5 tabular-nums" [class]="feeSummary().due > 0 ? 'text-rose-600' : 'text-emerald-700'">
              ₹{{ formatINR(feeSummary().due) }}
            </p>
            <p class="text-[11px] text-slate-500 mt-1 truncate">
              {{ feeSummary().nextDueDate ? 'Due: ' + formatShortDate(feeSummary().nextDueDate!) : 'All dues cleared' }}
            </p>
          </div>
          <div class="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-slate-200/90 flex items-center justify-center shrink-0">
            <mat-icon class="text-lg">account_balance_wallet</mat-icon>
          </div>
        </div>
      </section>

      <!-- c. Today's Schedule -->
      <section class="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 class="text-sm font-bold text-slate-900">Today's Schedule</h2>
            <p class="text-xs text-slate-500 mt-0.5">{{ todayFullDayName() }} periods for {{ currentStudent().section }}</p>
          </div>
          <span class="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/90 text-[11px] font-semibold text-indigo-600">
            {{ todaysClasses().length }} {{ todaysClasses().length === 1 ? 'Period' : 'Periods' }}
          </span>
        </div>

        @if (todaysClasses().length > 0) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (period of todaysClasses(); track period.id) {
              <div
                class="p-4 rounded-xl border transition-colors min-w-0"
                [class]="period.status === 'current'
                  ? 'bg-indigo-50/70 border-indigo-500'
                  : period.status === 'next'
                    ? 'bg-indigo-50/40 border-indigo-300'
                    : 'bg-slate-50/60 border-slate-200/90'"
              >
                <div class="flex items-center justify-between gap-2 mb-2">
                  <span class="text-[11px] font-semibold font-mono px-2 py-0.5 rounded-xl bg-white text-slate-900 border border-slate-200/90">
                    {{ period.timeRange }}
                  </span>
                  @if (period.status === 'current') {
                    <span class="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[11px] font-semibold">Current</span>
                  } @else if (period.status === 'next') {
                    <span class="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-semibold">Next</span>
                  } @else if (period.status === 'completed') {
                    <span class="text-[11px] text-slate-500 font-medium">Completed</span>
                  } @else {
                    <span class="text-[11px] text-slate-500 font-medium">Scheduled</span>
                  }
                </div>
                <h3 class="font-semibold text-[13px] text-slate-900 truncate">{{ period.subjectName }}</h3>
                <p class="text-xs text-slate-500 mt-1 truncate">{{ period.facultyName }}</p>
                <div class="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200/90 text-[11px] text-slate-500">
                  <span>Room: <strong class="text-slate-900 font-semibold">{{ period.room }}</strong></span>
                  <span class="font-semibold text-indigo-600">{{ period.subjectType }}</span>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/90 space-y-2">
            <mat-icon class="text-3xl text-slate-400">event_available</mat-icon>
            <p class="text-[13px] font-semibold text-slate-900">No classes scheduled today</p>
            <p class="text-xs text-slate-500">Check your weekly timetable for upcoming sessions.</p>
          </div>
        }
      </section>

      <!-- d. Subject-wise Attendance -->
      <section class="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 class="text-sm font-bold text-slate-900">Subject-wise Attendance</h2>
            <p class="text-xs text-slate-500 mt-0.5">Threshold from academic settings: {{ attendanceThreshold() }}%</p>
          </div>
          <a routerLink="/student/attendance" class="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1">
            <span>View Details</span>
            <mat-icon class="text-sm">chevron_right</mat-icon>
          </a>
        </div>

        @if (subjectAttendances().length > 0) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (sub of subjectAttendances(); track sub.subjectId) {
              <div class="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <h3 class="font-semibold text-[13px] text-slate-900 truncate">{{ sub.name }}</h3>
                    <p class="text-[11px] font-mono text-slate-500 mt-0.5">{{ sub.code }}</p>
                  </div>
                  <span
                    class="text-[13px] font-bold tabular-nums shrink-0"
                    [class]="sub.isLow ? 'text-rose-600' : 'text-slate-900'"
                  >
                    {{ sub.percentage }}%
                  </span>
                </div>

                <div class="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all"
                    [style.width.%]="sub.percentage"
                    [class]="sub.isLow ? 'bg-rose-500' : 'bg-indigo-600'"
                  ></div>
                </div>

                <div class="flex items-center justify-between text-[11px]">
                  <span class="text-slate-500 tabular-nums">Attended: {{ sub.attended }}/{{ sub.total }}</span>
                  @if (sub.isLow) {
                    <span class="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                      Low
                    </span>
                  } @else {
                    <span class="text-emerald-700 font-semibold">On Track</span>
                  }
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/90 text-xs text-slate-500">
            No attendance sessions recorded yet for your section.
          </div>
        }
      </section>

      <!-- e. Pending Assignments -->
      <section class="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 class="text-sm font-bold text-slate-900">Pending Assignments</h2>
            <p class="text-xs text-slate-500 mt-0.5">Assignments for {{ currentStudent().section }} awaiting submission</p>
          </div>
          <span class="text-xs font-semibold text-indigo-600">
            {{ pendingAssignments().length }} Pending
          </span>
        </div>

        @if (pendingAssignments().length > 0) {
          <div class="divide-y divide-slate-200/80">
            @for (asg of pendingAssignments(); track asg.id) {
              <div class="py-4 first:pt-1 last:pb-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="space-y-1 min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <a
                      [routerLink]="['/student/assignments', asg.id]"
                      class="text-[13px] font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
                    >
                      {{ asg.title }}
                    </a>
                    <span
                      class="px-2 py-0.5 rounded-full text-[11px] font-semibold border"
                      [class]="asg.isDraft
                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                        : asg.status === 'Overdue'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'"
                    >
                      {{ asg.isDraft ? 'Draft' : asg.status === 'Overdue' ? 'Overdue' : 'Pending' }}
                    </span>
                  </div>
                  <p class="text-xs text-slate-500">
                    <span>{{ asg.subjectName }}</span>
                    <span class="mx-1.5" aria-hidden="true">/</span>
                    <span [class]="asg.isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-900 font-medium'">
                      {{ asg.dueText }}
                    </span>
                    <span class="mx-1.5" aria-hidden="true">/</span>
                    <span>Max {{ asg.maxMarks }} marks</span>
                  </p>
                </div>

                <div class="flex items-center gap-2 shrink-0 flex-wrap">
                  <a
                    [routerLink]="['/student/assignments', asg.id]"
                    class="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors inline-flex items-center gap-1.5"
                  >
                    <mat-icon class="text-sm">edit_note</mat-icon>
                    <span>{{ asg.isDraft ? 'Continue Draft' : 'Open Assignment' }}</span>
                  </a>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/90 space-y-1">
            <mat-icon class="text-3xl text-emerald-600">check_circle</mat-icon>
            <p class="text-[13px] font-semibold text-slate-900">All assignments submitted</p>
            <p class="text-xs text-slate-500">You have no pending coursework for {{ currentStudent().section }}.</p>
          </div>
        }
      </section>

      <!-- f. Upcoming Exams & Result Announcements -->
      <section class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <!-- Upcoming Exams -->
        <div class="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <div>
              <h2 class="text-sm font-bold text-slate-900">Upcoming Exams</h2>
              <p class="text-xs text-slate-500 mt-0.5">{{ currentStudent().course }} ({{ currentStudent().semester }})</p>
            </div>
            <a routerLink="/student/exams" class="text-xs font-semibold text-indigo-600 hover:underline">View All</a>
          </div>

          @if (upcomingExams().length > 0) {
            <div class="divide-y divide-slate-200/80">
              @for (ex of upcomingExams(); track ex.id) {
                <div class="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-[13px] font-semibold text-slate-900 truncate">{{ ex.title }}</p>
                    <p class="text-xs text-slate-500 truncate mt-0.5">{{ ex.subjectName }}</p>
                    <p class="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                      {{ formatShortDate(ex.date) }} at {{ ex.time }} · {{ ex.mode }} · Max {{ ex.maxMarks }}
                    </p>
                    <p class="text-[11px] text-indigo-600 font-medium mt-0.5 tabular-nums">
                      Result announces: {{ formatShortDate(ex.resultAnnouncementDate || ex.date) }}
                    </p>
                  </div>
                  <span class="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 text-[11px] font-semibold shrink-0">
                    {{ ex.mode }}
                  </span>
                </div>
              }
            </div>
          } @else {
            <div class="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/90 text-xs text-slate-500">
              No upcoming exams scheduled for {{ currentStudent().semester }}.
            </div>
          }
        </div>

        <!-- Result Announcement Schedule (Marks & Grades in Results Tab Only) -->
        <div class="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <div>
              <h2 class="text-sm font-bold text-slate-900">Result Announcements</h2>
              <p class="text-xs text-slate-500 mt-0.5">Release dates · Marks &amp; grades are in the Results tab only</p>
            </div>
            <a routerLink="/student/results" class="text-xs font-semibold text-indigo-600 hover:underline whitespace-nowrap">Open Results Tab</a>
          </div>

          @if (resultAnnouncements().length > 0) {
            <div class="divide-y divide-slate-200/80">
              @for (item of resultAnnouncements(); track item.id) {
                <div class="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-[13px] font-semibold text-slate-900 truncate">{{ item.title }}</p>
                    <p class="text-xs text-slate-500 truncate mt-0.5">{{ item.subjectName }} ({{ item.mode }})</p>
                    <p class="text-[11px] text-indigo-600 font-medium mt-0.5 tabular-nums">
                      Announces on {{ formatShortDate(item.resultAnnouncementDate) }} at {{ item.resultAnnouncementTime }}
                    </p>
                  </div>
                  <a
                    routerLink="/student/results"
                    [queryParams]="{ tab: 'schedule' }"
                    class="px-2.5 py-1 rounded-full bg-purple-50 text-[#6D42E8] border border-purple-200 text-[11px] font-semibold shrink-0 whitespace-nowrap"
                  >
                    {{ item.countdownLabel }}
                  </a>
                </div>
              }
            </div>
          } @else {
            <div class="p-6 text-center bg-slate-50 rounded-xl border border-slate-200/90 space-y-2.5">
              <p class="text-xs text-slate-600">
                All current examination results have been announced ({{ publishedResults().length }} released).
              </p>
              <a
                routerLink="/student/results"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
              >
                <mat-icon class="text-sm">grade</mat-icon>
                <span>View Grade Card in Results Tab</span>
              </a>
            </div>
          }
        </div>
      </section>

      <!-- g. Fee Summary Card -->
      <section class="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 class="text-sm font-bold text-slate-900">Fee Summary</h2>
            <p class="text-xs text-slate-500 mt-0.5">Academic year fee ledger for {{ currentStudent().enrollmentNo }}</p>
          </div>
          <a routerLink="/student/fees" class="text-xs font-semibold text-indigo-600 hover:underline">View Ledger</a>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/90">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Fee</p>
            <p class="text-lg font-bold text-slate-900 mt-1 tabular-nums">₹{{ formatINR(feeSummary().total) }}</p>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/90">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Paid</p>
            <p class="text-lg font-bold text-emerald-700 mt-1 tabular-nums">₹{{ formatINR(feeSummary().paid) }}</p>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/90">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Due</p>
            <p class="text-lg font-bold mt-1 tabular-nums" [class]="feeSummary().due > 0 ? 'text-rose-600' : 'text-emerald-700'">
              ₹{{ formatINR(feeSummary().due) }}
            </p>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/90">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Next Due Date</p>
            <p class="text-lg font-bold text-slate-900 mt-1">
              {{ feeSummary().nextDueDate ? formatShortDate(feeSummary().nextDueDate!) : 'None' }}
            </p>
          </div>
        </div>

        <div class="p-4 rounded-xl bg-purple-50/70 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2.5">
            <mat-icon class="text-base text-indigo-600 shrink-0">verified_user</mat-icon>
            <span class="font-medium text-slate-900">Instant online fee payment via UPI, QR, or Card is active.</span>
          </div>
          @if (feeSummary().due > 0) {
            <a
              routerLink="/student/my-fees"
              class="gradient-accent text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs hover:opacity-95 transition-all text-center whitespace-nowrap cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              <mat-icon class="text-sm">credit_card</mat-icon>
              <span>Pay Now (₹{{ formatINR(feeSummary().due) }})</span>
            </a>
          }
        </div>
      </section>

      <!-- h. Two Charts Only -->
      <section class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <div class="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-3 min-w-0">
          <div>
            <h2 class="text-sm font-bold text-slate-900">Subject-wise Attendance (%)</h2>
            <p class="text-xs text-slate-500 mt-0.5">Red bars indicate subjects below {{ attendanceThreshold() }}%</p>
          </div>
          @if (subjectAttendances().length > 0) {
            <div class="h-52 sm:h-60 relative w-full">
              <canvas baseChart [data]="attendanceBarData()" [options]="barChartOptions" [type]="'bar'"></canvas>
            </div>
          } @else {
            <div class="h-52 sm:h-60 flex items-center justify-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200/90">
              No subject attendance data available.
            </div>
          }
        </div>

        <div class="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-3 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <div>
              <h2 class="text-sm font-bold text-slate-900">Subject Assignment Completion (%)</h2>
              <p class="text-xs text-slate-500 mt-0.5">Exam score trends are displayed exclusively inside the Results tab</p>
            </div>
            <a routerLink="/student/results" class="text-xs font-semibold text-indigo-600 hover:underline whitespace-nowrap">Results Trend</a>
          </div>
          @if (assignmentProgressChart().datasets[0].data.length > 0) {
            <div class="h-52 sm:h-60 relative w-full">
              <canvas baseChart [data]="assignmentProgressChart()" [options]="barChartOptions" [type]="'bar'"></canvas>
            </div>
          } @else {
            <div class="h-52 sm:h-60 flex items-center justify-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200/90">
              No subject assignments recorded yet.
            </div>
          }
        </div>
      </section>

      <!-- i. Latest Notices -->
      <section class="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h2 class="text-sm font-bold text-slate-900">Latest Notices</h2>
            <p class="text-xs text-slate-500 mt-0.5">Active notices for {{ currentStudent().course }} and general campus</p>
          </div>
          <a routerLink="/student/notices" class="text-xs font-semibold text-indigo-600 hover:underline">View All</a>
        </div>

        @if (studentNotices().length > 0) {
          <div class="divide-y divide-slate-200/80">
            @for (notice of studentNotices(); track notice.id) {
              <div class="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                <mat-icon class="text-base text-indigo-600 mt-0.5 shrink-0">campaign</mat-icon>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h3 class="text-[13px] font-semibold text-slate-900">{{ notice.title }}</h3>
                    <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-medium">
                      {{ notice.audience === 'Course-wise' ? 'Course' : notice.audience }}
                    </span>
                    @if (notice.priority === 'Urgent' || notice.priority === 'High') {
                      <span class="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold">
                        {{ notice.priority }}
                      </span>
                    }
                  </div>
                  <p class="text-xs text-slate-500 mt-1 leading-relaxed">{{ notice.body }}</p>
                  <p class="text-[11px] text-slate-500 mt-1">
                    {{ notice.createdBy }} · Published {{ formatShortDate(notice.publishDate) }}
                  </p>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/90 text-xs text-slate-500">
            No active notices right now.
          </div>
        }
      </section>

      <!-- j. Quick Actions (3x3 Tiles) -->
      <section class="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-4">
        <div>
          <h2 class="text-sm font-bold text-slate-900">Quick Actions</h2>
          <p class="text-xs text-slate-500 mt-0.5">Direct shortcuts across your student portal</p>
        </div>

        <div class="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          @for (tile of quickActions; track tile.route) {
            <a
              [routerLink]="tile.route"
              class="p-3.5 sm:p-4 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/90 hover:border-indigo-500 transition-colors flex items-center gap-3 min-w-0 group"
            >
              <div class="w-9 h-9 rounded-xl bg-white border border-slate-200/90 text-indigo-600 flex items-center justify-center shrink-0">
                <mat-icon class="text-lg">{{ tile.icon }}</mat-icon>
              </div>
              <div class="min-w-0">
                <p class="text-[13px] font-semibold text-slate-900 truncate">{{ tile.title }}</p>
                <p class="text-[11px] text-slate-500 truncate">{{ tile.subtitle }}</p>
              </div>
            </a>
          }
        </div>
      </section>

      <!-- k. NEW: Interactive Study Checklist & Goals -->
      <section class="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-4">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 class="text-sm font-bold text-slate-900">Study Task & Goal Checklist</h2>
            <p class="text-xs text-slate-500 mt-0.5">Keep track of your personal coursework and exam prep checklist</p>
          </div>
          <span class="text-xs font-semibold text-indigo-600 whitespace-nowrap">
            {{ completedTodosCount() }}/{{ studyTodos().length }} Completed
          </span>
        </div>

        <div class="flex flex-col min-[420px]:flex-row items-stretch min-[420px]:items-center gap-2.5">
          <input
            type="text"
            [(ngModel)]="newTodoText"
            (keyup.enter)="addTodo()"
            placeholder="Add a new study goal or task..."
            class="flex-1 h-10 px-3 bg-slate-50 border border-slate-200/90 rounded-xl text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15"
          />
          <button
            type="button"
            (click)="addTodo()"
            class="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-colors shrink-0 inline-flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <mat-icon class="text-sm">add</mat-icon>
            <span>Add Task</span>
          </button>
        </div>

        <div class="space-y-2">
          @for (todo of studyTodos(); track todo.id) {
            <div class="p-3 rounded-xl bg-slate-50/80 border border-slate-200/90 flex items-center justify-between gap-3 group">
              <label class="flex items-center gap-3 min-w-0 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  [checked]="todo.done"
                  (change)="toggleTodo(todo.id)"
                  class="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <span [class]="todo.done ? 'line-through text-slate-400' : 'text-slate-900 font-medium'" class="text-xs truncate">
                  {{ todo.text }}
                </span>
              </label>
              <button
                type="button"
                (click)="removeTodo(todo.id)"
                class="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Delete task"
              >
                <mat-icon class="text-sm">delete_outline</mat-icon>
              </button>
            </div>
          } @empty {
            <p class="text-xs text-slate-400 italic text-center py-4">No study tasks added yet. Add one above!</p>
          }
        </div>
      </section>

      <!-- l. NEW: GPA Target Simulator -->
      <section class="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4">
        <div>
          <h2 class="text-sm font-bold text-slate-900">GPA Target & Exam Score Simulator</h2>
          <p class="text-xs text-slate-500 mt-0.5">Simulate your target semester CGPA and calculate required final exam performance</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
          <div class="space-y-3 md:col-span-2">
            <div class="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Target Semester GPA (6.0 - 10.0)</span>
              <span class="text-indigo-600 font-bold text-sm tabular-nums">{{ targetGpa().toFixed(1) }}</span>
            </div>
            <input
              type="range"
              min="6.0"
              max="10.0"
              step="0.1"
              [ngModel]="targetGpa()"
              (ngModelChange)="onTargetGpaChange($event)"
              class="w-full accent-indigo-600 cursor-pointer"
            />
            <div class="flex justify-between text-[11px] text-slate-500">
              <span>6.0 (Good)</span>
              <span>8.0 (Distinction)</span>
              <span>10.0 (Perfect)</span>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/70 text-center space-y-1.5">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">Required Final Exam Avg</p>
            <p class="text-3xl font-extrabold text-indigo-900 tabular-nums">{{ gpaSimulator().requiredFinalScore }}%</p>
            <p class="text-[11px] text-slate-500">
              Estimated from target · Check published scores in
              <a routerLink="/student/results" class="text-indigo-700 font-semibold hover:underline">Results tab</a>
            </p>
          </div>
        </div>
      </section>

    </div>

    <!-- Digital ID Pass Modal Dialog -->
    @if (isIdCardOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          <!-- Card Header Banner -->
          <div class="gradient-brand text-white p-5 sm:p-6 text-center relative overflow-hidden">
            <div class="absolute -right-8 -top-8 w-32 h-32 rounded-full aurora-glow pointer-events-none"></div>
            <div class="w-16 h-16 rounded-2xl bg-white/15 border border-white/25 mx-auto flex items-center justify-center text-white font-extrabold text-2xl shadow-md mb-3">
              {{ currentStudent().name.charAt(0) }}
            </div>
            <h3 class="font-bold text-lg tracking-tight">{{ currentStudent().name }}</h3>
            <p class="text-xs text-indigo-300 font-mono mt-0.5">{{ currentStudent().enrollmentNo }}</p>
            <span class="inline-block mt-2 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold uppercase tracking-wider">
              Verified Student ID
            </span>
          </div>

          <!-- Card Details -->
          <div class="p-4 sm:p-6 space-y-4 text-xs text-slate-700">
            <div class="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3 pb-4 border-b border-slate-100">
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Program / Course</p>
                <p class="font-bold text-slate-900 mt-0.5">{{ currentStudent().course }}</p>
              </div>
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Semester & Section</p>
                <p class="font-bold text-slate-900 mt-0.5">{{ currentStudent().semester }} · {{ currentStudent().section }}</p>
              </div>
            </div>

            <div class="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3 pb-4 border-b border-slate-100">
              <div class="min-w-0">
                <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Institutional Email</p>
                <p class="font-semibold text-slate-900 mt-0.5 truncate">{{ currentStudent().email }}</p>
              </div>
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Academic Year</p>
                <p class="font-semibold text-slate-900 mt-0.5">2025–2026 Session</p>
              </div>
            </div>

            <div class="flex flex-col min-[380px]:flex-row items-stretch min-[380px]:items-center justify-between gap-3 pt-2">
              <div class="font-mono text-[10px] text-slate-400 tracking-widest bg-slate-100 p-2 rounded-lg text-center">
                |||||| | |||||||| |||| | ||||||
              </div>
              <button
                type="button"
                (click)="isIdCardOpen.set(false)"
                class="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Close Pass
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class StudentDashboard {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly userService = inject(CurrentUserService);
  private readonly timetableService = inject(TimetableService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly assignmentsService = inject(AssignmentsService);
  private readonly examinationsService = inject(ExaminationsService);
  private readonly resultsService = inject(ResultsService);
  private readonly financeService = inject(FinanceService);
  private readonly communicationService = inject(CommunicationService);
  private readonly academicService = inject(AcademicService);
  private readonly settingsService = inject(SettingsService);

  protected readonly currentStudent = this.userService.currentStudent;
  protected readonly attendanceThreshold = computed(() => this.settingsService.academic().attendanceThreshold || 75);

  protected readonly isIdCardOpen = signal<boolean>(false);
  protected readonly targetGpa = signal<number>(8.5);
  protected readonly studyTodos = signal<{ id: string; text: string; done: boolean }[]>([]);
  protected readonly completedTodosCount = computed(() => this.studyTodos().filter(t => t.done).length);
  protected newTodoText = '';

  private readonly studentKey = computed(() => {
    const stu = this.currentStudent();
    return (stu?.email || stu?.id || 'stu-1').trim().toLowerCase();
  });
  private gpaSaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const key = this.studentKey();
      if (!isPlatformBrowser(this.platformId) || !key) return;
      this.http
        .get<{ success: boolean; data?: { targetGpa: number; todos: { id: string; text: string; done: boolean }[] } }>(
          `/api/v1/student-workspace/state?studentKey=${encodeURIComponent(key)}`
        )
        .subscribe({
          next: res => {
            if (res.success && res.data) {
              this.targetGpa.set(res.data.targetGpa);
              this.studyTodos.set(res.data.todos);
            }
          },
          error: () => {
            // Keep existing local signal state if request is temporarily interrupted
          }
        });
    });
  }

  protected onTargetGpaChange(value: number | string): void {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;
    const clamped = Math.round(Math.min(10.0, Math.max(6.0, numeric)) * 10) / 10;
    this.targetGpa.set(clamped);
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.gpaSaveTimer) clearTimeout(this.gpaSaveTimer);
    const key = this.studentKey();
    this.gpaSaveTimer = setTimeout(() => {
      this.http
        .put('/api/v1/student-workspace/goal', { studentKey: key, targetGpa: clamped })
        .subscribe({ error: () => undefined });
    }, 300);
  }

  protected addTodo(): void {
    const text = this.newTodoText.trim();
    if (!text) return;
    this.newTodoText = '';

    const key = this.studentKey();
    if (!isPlatformBrowser(this.platformId)) return;

    this.http
      .post<{ success: boolean; data?: { id: string; text: string; done: boolean } }>(
        '/api/v1/student-workspace/todos',
        { studentKey: key, text }
      )
      .subscribe({
        next: res => {
          if (res.success && res.data) {
            this.studyTodos.update(list => [res.data!, ...list]);
          }
        }
      });
  }

  protected toggleTodo(id: string): void {
    const existing = this.studyTodos().find(t => t.id === id);
    if (!existing) return;
    const nextDone = !existing.done;
    this.studyTodos.update(list => list.map(t => (t.id === id ? { ...t, done: nextDone } : t)));

    if (!isPlatformBrowser(this.platformId)) return;
    this.http
      .patch(`/api/v1/student-workspace/todos/${encodeURIComponent(id)}`, {
        studentKey: this.studentKey(),
        done: nextDone
      })
      .subscribe({ error: () => undefined });
  }

  protected removeTodo(id: string): void {
    this.studyTodos.update(list => list.filter(t => t.id !== id));
    if (!isPlatformBrowser(this.platformId)) return;

    this.http
      .delete(
        `/api/v1/student-workspace/todos/${encodeURIComponent(id)}?studentKey=${encodeURIComponent(this.studentKey())}`
      )
      .subscribe({ error: () => undefined });
  }

  protected readonly gpaSimulator = computed(() => {
    const target = this.targetGpa();
    const currentMarks = this.averageMarksPct() || 78;
    const requiredFinalScore = Math.min(100, Math.max(40, Math.round((target * 10 - currentMarks * 0.4) / 0.6)));
    return {
      target,
      currentMarks,
      requiredFinalScore
    };
  });

  protected readonly firstName = computed(() => {
    const parts = this.currentStudent().name.trim().split(/\s+/);
    return parts[0] || 'Student';
  });

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  });

  protected readonly formattedDate = computed(() => {
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date());
  });

  protected readonly todayFullDayName = computed(() => {
    return new Intl.DateTimeFormat('en-IN', { weekday: 'long' }).format(new Date());
  });

  private readonly todayShortDay = computed(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
    return days[new Date().getDay()] || 'Mon';
  });

  private parseSemesterNumber(semesterLabel: string): number {
    const match = semesterLabel.match(/\d+/);
    return match ? Number(match[0]) : 1;
  }

  private parseTimeToMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  private formatTimeRange(periodId: string): string {
    const startMins = this.parseTimeToMinutes(periodId);
    const endMins = startMins + 60;
    const fmt = (total: number) => {
      const h24 = Math.floor(total / 60) % 24;
      const m = total % 60;
      const suffix = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
    };
    return `${fmt(startMins)} - ${fmt(endMins)}`;
  }

  // c. Today's Schedule (filtered by student's courseId, semester, sectionId, and current system day)
  protected readonly todaysClasses = computed<SchedulePeriodView[]>(() => {
    const student = this.currentStudent();
    const semNum = this.parseSemesterNumber(student.semester);
    const day = this.todayShortDay();
    if (day === 'Sun') return [];

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const slots = this.timetableService
      .slots()
      .filter(s => s.courseId === student.courseId && s.semester === semNum && s.sectionId === student.sectionId && s.day === day)
      .slice()
      .sort((a, b) => this.parseTimeToMinutes(a.periodId) - this.parseTimeToMinutes(b.periodId));

    const hasCurrent = slots.some(s => {
      const start = this.parseTimeToMinutes(s.periodId);
      return nowMinutes >= start && nowMinutes < start + 60;
    });

    let markedNext = false;

    return slots.map(s => {
      const start = this.parseTimeToMinutes(s.periodId);
      let status: SchedulePeriodView['status'] = 'upcoming';

      if (nowMinutes >= start && nowMinutes < start + 60) {
        status = 'current';
      } else if (nowMinutes >= start + 60) {
        status = 'completed';
      } else if (!hasCurrent && !markedNext && start > nowMinutes) {
        status = 'next';
        markedNext = true;
      }

      return {
        id: s.id,
        timeRange: this.formatTimeRange(s.periodId),
        subjectName: s.subjectName,
        subjectType: s.subjectType,
        facultyName: s.facultyName,
        room: s.room,
        status
      };
    });
  });

  // d. Subject-wise Attendance (computed from AcademicService + AttendanceService sessions)
  protected readonly subjectAttendances = computed<SubjectAttendanceView[]>(() => {
    const student = this.currentStudent();
    const threshold = this.attendanceThreshold();

    const courseSubjects = this.academicService
      .subjects()
      .filter(sub => sub.course === student.course && sub.semester === student.semester && sub.status === 'Active');

    const sectionSessions = this.attendanceService
      .sessions()
      .filter(sess => sess.courseId === student.courseId && sess.semester === student.semester && sess.sectionId === student.sectionId);

    const subjectMap = new Map<string, { code: string; name: string }>();
    for (const sub of courseSubjects) {
      subjectMap.set(sub.id, { code: sub.code, name: sub.name });
    }
    for (const sess of sectionSessions) {
      if (!subjectMap.has(sess.subjectId)) {
        const subMeta = this.academicService.subjects().find(s => s.id === sess.subjectId);
        subjectMap.set(sess.subjectId, {
          code: subMeta?.code || sess.subjectId.toUpperCase(),
          name: subMeta?.name || sess.subjectId
        });
      }
    }

    const result: SubjectAttendanceView[] = [];
    for (const [subjectId, meta] of subjectMap.entries()) {
      const subSessions = sectionSessions.filter(s => s.subjectId === subjectId);
      if (subSessions.length === 0) continue;

      const attended = subSessions.reduce((acc, s) => acc + s.present, 0);
      const total = subSessions.reduce((acc, s) => acc + s.total, 0);
      const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;

      result.push({
        subjectId,
        code: meta.code,
        name: meta.name,
        attended,
        total,
        percentage,
        isLow: percentage < threshold
      });
    }

    return result;
  });

  protected readonly overallAttendancePct = computed(() => {
    const list = this.subjectAttendances();
    if (list.length === 0) return 0;
    const totalAttended = list.reduce((acc, s) => acc + s.attended, 0);
    const totalSessions = list.reduce((acc, s) => acc + s.total, 0);
    return totalSessions > 0 ? Math.round((totalAttended / totalSessions) * 1000) / 10 : 0;
  });

  // e. Pending Assignments (filtered by student's section & course subjects, keeping Drafts and excluding Submitted/Late/Evaluated)
  protected readonly pendingAssignments = computed(() => {
    const student = this.currentStudent();
    const courseSubjectIds = new Set(
      this.academicService
        .subjects()
        .filter(sub => sub.course === student.course)
        .map(sub => sub.id)
    );
    const submissionsByAsg = new Map(
      this.assignmentsService
        .submissions()
        .filter(subm => subm.studentId === student.id)
        .map(subm => [subm.assignmentId, subm])
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.assignmentsService
      .assignments()
      .filter(a => {
        if (a.sectionId !== student.sectionId || !courseSubjectIds.has(a.subjectId) || a.status === 'Closed') {
          return false;
        }
        const subm = submissionsByAsg.get(a.id);
        return !subm || subm.status === 'Draft';
      })
      .map(a => {
        const due = new Date(a.dueDate);
        due.setHours(0, 0, 0, 0);
        const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        let dueText = '';
        if (diffDays < 0) {
          const overdueDays = Math.abs(diffDays);
          dueText = overdueDays === 1 ? 'Overdue by 1 day' : `Overdue by ${overdueDays} days`;
        } else if (diffDays === 0) {
          dueText = 'Due today';
        } else if (diffDays === 1) {
          dueText = 'Due tomorrow';
        } else {
          dueText = `Due in ${diffDays} days`;
        }
        const subm = submissionsByAsg.get(a.id);

        return {
          ...a,
          dueText,
          isOverdue: diffDays < 0,
          isDraft: subm?.status === 'Draft'
        };
      });
  });

  protected readonly overdueAssignmentsCount = computed(
    () => this.pendingAssignments().filter(a => a.status === 'Overdue').length
  );

  // f. Upcoming Exams & Latest Published Results
  protected readonly upcomingExams = computed(() => {
    const student = this.currentStudent();
    return this.examinationsService
      .exams()
      .filter(ex => ex.courseId === student.courseId && ex.semester === student.semester && ex.status !== 'Completed')
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));
  });

  protected readonly publishedResults = computed(() => {
    const student = this.currentStudent();
    return this.resultsService
      .results()
      .filter(r => r.studentId === student.id && r.status === 'Published');
  });

  protected readonly resultAnnouncements = computed(() => {
    const student = this.currentStudent();
    const publishedIds = new Set(this.publishedResults().map(r => r.examId));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.examinationsService
      .exams()
      .filter(ex => ex.courseId === student.courseId && ex.semester === student.semester && !publishedIds.has(ex.id))
      .map(ex => {
        const announceDate = ex.resultAnnouncementDate || this.examinationsService.getExpectedResultDate(ex);
        const announceTime = ex.resultAnnouncementTime || '17:00';
        const target = new Date(announceDate);
        target.setHours(0, 0, 0, 0);
        const diff = Number.isNaN(target.getTime())
          ? 999
          : Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const countdownLabel =
          diff < 0
            ? 'Evaluation wrapping up'
            : diff === 0
              ? 'Announces Today'
              : diff === 1
                ? 'Tomorrow'
                : `In ${diff} days`;
        return {
          id: ex.id,
          title: ex.title,
          subjectName: ex.subjectName,
          mode: ex.mode,
          resultAnnouncementDate: announceDate,
          resultAnnouncementTime: announceTime,
          countdownLabel
        };
      })
      .sort((a, b) => a.resultAnnouncementDate.localeCompare(b.resultAnnouncementDate));
  });

  protected readonly nextResultAnnouncement = computed(
    () => this.resultAnnouncements()[0] ?? null
  );

  protected readonly averageMarksPct = computed<number | null>(() => {
    const res = this.publishedResults();
    if (res.length === 0) return null;
    const sum = res.reduce((acc, r) => acc + (r.maxMarks > 0 ? Math.round((r.marksObtained / r.maxMarks) * 100) : 0), 0);
    return Math.round((sum / res.length) * 10) / 10;
  });

  // g. Fee Summary (from FinanceService ledgers)
  protected readonly feeSummary = computed(() => {
    const student = this.currentStudent();
    const ledger = this.financeService.ledgers().find(l => l.studentId === student.id);
    if (!ledger) {
      return { total: 0, paid: 0, due: 0, nextDueDate: null as string | null };
    }

    const total = ledger.installments.reduce((acc, i) => acc + i.totalAmount + i.fineAmount - i.concessionAmount, 0);
    const paid = ledger.installments.reduce((acc, i) => acc + i.paidAmount, 0);
    const due = Math.max(0, total - paid);

    const unpaidInstallments = ledger.installments
      .filter(i => i.totalAmount + i.fineAmount - i.concessionAmount - i.paidAmount > 0)
      .slice()
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    return {
      total,
      paid,
      due,
      nextDueDate: unpaidInstallments.length > 0 ? unpaidInstallments[0].dueDate : null
    };
  });

  // h. Charts (Reactive ng2-charts data)
  protected readonly attendanceBarData = computed<ChartData<'bar'>>(() => {
    const subs = this.subjectAttendances();
    const threshold = this.attendanceThreshold();
    return {
      labels: subs.map(s => s.code),
      datasets: [
        {
          label: 'Attendance %',
          data: subs.map(s => s.percentage),
          backgroundColor: subs.map(s => (s.percentage < threshold ? '#E11D48' : '#4F46E5')),
          borderRadius: 6,
          barThickness: 28
        }
      ]
    };
  });

  protected readonly barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 0, max: 100, grid: { color: '#F1F5F9' }, ticks: { font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } }
    }
  };

  protected readonly assignmentProgressChart = computed<ChartData<'bar'>>(() => {
    const student = this.currentStudent();
    const subjects = this.academicService
      .subjects()
      .filter(sub => sub.course === student.course && sub.semester === student.semester);
    const submByAsg = new Map(
      this.assignmentsService
        .submissions()
        .filter(s => s.studentId === student.id)
        .map(s => [s.assignmentId, s])
    );

    const labels: string[] = [];
    const data: number[] = [];

    for (const sub of subjects) {
      const subAsgs = this.assignmentsService
        .assignments()
        .filter(a => a.sectionId === student.sectionId && a.subjectId === sub.id);
      if (subAsgs.length === 0) continue;
      const done = subAsgs.filter(a => {
        const st = submByAsg.get(a.id)?.status;
        return st === 'Submitted' || st === 'Late' || st === 'Evaluated';
      }).length;
      labels.push(sub.code);
      data.push(Math.round((done / subAsgs.length) * 100));
    }

    return {
      labels,
      datasets: [
        {
          label: 'Submitted %',
          data,
          backgroundColor: '#0EA5E9',
          borderRadius: 6,
          barThickness: 28
        }
      ]
    };
  });

  // i. Latest Notices (All, Students, or student's course; Published & not expired)
  protected readonly studentNotices = computed(() => {
    const student = this.currentStudent();
    return this.communicationService
      .notices()
      .filter(n =>
        n.status === 'Published' &&
        (n.audience === 'All' || n.audience === 'Students' || (n.audience === 'Course-wise' && n.courseId === student.courseId))
      )
      .slice()
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return b.publishDate.localeCompare(a.publishDate);
      })
      .slice(0, 5);
  });

  // j. Quick Actions (3x3 tiles)
  protected readonly quickActions = [
    { title: 'View Timetable', subtitle: 'Weekly schedule', icon: 'calendar_month', route: '/student/timetable' },
    { title: 'My Attendance', subtitle: 'Subject logs & leave requests', icon: 'how_to_reg', route: '/student/attendance' },
    { title: 'Assignments', subtitle: '25-Q multi-subject tasks', icon: 'assignment_late', route: '/student/assignments' },
    { title: 'Exams & Admit Card', subtitle: 'Hall ticket & datesheet', icon: 'event_note', route: '/student/exams' },
    { title: 'Results', subtitle: 'Scorecards & transcript', icon: 'grade', route: '/student/results' },
    { title: 'Pay Fees Online', subtitle: 'Instant UPI/Card checkout', icon: 'credit_card', route: '/student/my-fees' },
    { title: 'Helpdesk & Support', subtitle: 'Certificates & ID tickets', icon: 'support_agent', route: '/student/helpdesk' },
    { title: 'Campus Notices', subtitle: 'Advisories & circulars', icon: 'campaign', route: '/student/notices' },
    { title: 'Message Center', subtitle: 'Faculty chats & inbox', icon: 'mail', route: '/student/message-center' }
  ];


  protected formatINR(amount: number): string {
    return new Intl.NumberFormat('en-IN').format(amount);
  }

  protected formatShortDate(dateStr: string): string {
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(parsed);
  }
}
