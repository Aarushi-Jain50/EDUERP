import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { ResultsService } from '../../../services/results.service';
import { QuestionPaperService } from '../../../services/question-paper.service';
import { FacultyPortalFacade } from '../shared/faculty-portal.facade';

@Component({
  selector: 'app-faculty-dashboard',
  imports: [RouterLink, MatIconModule, BaseChartDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5 sm:space-y-6 pb-16 font-sans text-slate-900 min-w-0">

      <!-- 1. Welcome Banner -->
      <div class="gradient-brand text-white p-5 sm:p-6 md:p-7 rounded-2xl shadow-sm relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 border border-slate-800/80">
        <div class="absolute -right-12 -top-12 w-56 h-56 rounded-full aurora-glow pointer-events-none"></div>
        <div class="relative z-10 space-y-2 min-w-0">
          <div class="flex flex-wrap items-center gap-2 text-xs text-slate-300 font-medium">
            <span class="px-2.5 py-0.5 rounded-full bg-[#6D42E8]/25 text-purple-300 border border-purple-400/30 font-semibold">
              {{ currentFaculty().designation }}
            </span>
            <span class="text-slate-500" aria-hidden="true">•</span>
            <span>{{ currentFaculty().department }}</span>
            <span class="text-slate-500" aria-hidden="true">•</span>
            <span class="font-mono text-slate-300">{{ currentFaculty().employeeId }}</span>
          </div>
          <h1 class="font-display text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white">
            {{ greeting }}, {{ currentFaculty().name }}
          </h1>
          <p class="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            You have <strong class="text-purple-300 font-semibold">{{ todaysClasses().length }} {{ todaysClasses().length === 1 ? 'lecture' : 'lectures' }}</strong> scheduled for {{ scheduleDayLabel }} across <strong class="text-white">{{ stats().mySubjectsCount }}</strong> allocated {{ stats().mySubjectsCount === 1 ? 'subject' : 'subjects' }}.
          </p>
        </div>

        <div class="relative z-10 flex items-center gap-2.5 flex-wrap shrink-0">
          <a
            routerLink="/faculty/reports"
            class="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2 whitespace-nowrap"
          >
            <mat-icon class="text-base text-purple-300">analytics</mat-icon>
            <span>Reports & PDF</span>
          </a>
          <a
            routerLink="/faculty/attendance"
            class="bg-[#6D42E8] hover:bg-[#5b34cc] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-colors inline-flex items-center gap-2 whitespace-nowrap"
          >
            <mat-icon class="text-base">how_to_reg</mat-icon>
            <span>Mark Attendance</span>
          </a>
        </div>
      </div>

      <!-- 2. Five KPI Stat Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div class="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex items-start justify-between gap-3 min-w-0">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">My Classes</p>
            <h4 class="font-display text-2xl font-bold text-slate-900 tabular-nums mt-1.5">{{ stats().mySubjectsCount }}</h4>
            <p class="text-[11px] text-slate-500 mt-1">Active allocations</p>
          </div>
          <div class="w-9 h-9 rounded-lg bg-purple-50 text-[#6D42E8] border border-purple-100 flex items-center justify-center shrink-0">
            <mat-icon class="text-lg">library_books</mat-icon>
          </div>
        </div>

        <div class="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex items-start justify-between gap-3 min-w-0">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Today's Classes</p>
            <h4 class="font-display text-2xl font-bold text-slate-900 tabular-nums mt-1.5">{{ todaysClasses().length }}</h4>
            <p class="text-[11px] text-slate-500 mt-1">{{ scheduleDayLabel }} timetable</p>
          </div>
          <div class="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <mat-icon class="text-lg">calendar_today</mat-icon>
          </div>
        </div>

        <div class="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex items-start justify-between gap-3 min-w-0">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">My Students</p>
            <h4 class="font-display text-2xl font-bold text-slate-900 tabular-nums mt-1.5">{{ stats().myStudentsCount }}</h4>
            <p class="text-[11px] text-slate-500 mt-1">Unique enrolled cohort</p>
          </div>
          <div class="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <mat-icon class="text-lg">groups</mat-icon>
          </div>
        </div>

        <div class="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex items-start justify-between gap-3 min-w-0">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Pending Evals</p>
            <h4 class="font-display text-2xl font-bold text-slate-900 tabular-nums mt-1.5">{{ stats().pendingEvaluations }}</h4>
            <p class="text-[11px] text-amber-700 mt-1">Awaiting review</p>
          </div>
          <div class="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <mat-icon class="text-lg">assignment_late</mat-icon>
          </div>
        </div>

        <div class="col-span-2 sm:col-span-1 bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex items-start justify-between gap-3 min-w-0">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Avg Attendance</p>
            <h4 class="font-display text-2xl font-bold text-slate-900 tabular-nums mt-1.5">{{ stats().avgAttendance }}%</h4>
            <p class="text-[11px] text-slate-500 mt-1">Across logged sessions</p>
          </div>
          <div class="w-9 h-9 rounded-lg bg-purple-50 text-[#6D42E8] border border-purple-100 flex items-center justify-center shrink-0">
            <mat-icon class="text-lg">how_to_reg</mat-icon>
          </div>
        </div>
      </div>

      <!-- 3. Today's Schedule Card & Pending Tasks -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- Today's Schedule (Span 2) -->
        <div class="lg:col-span-2 bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between min-w-0">
          <div>
            <div class="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-purple-50 text-[#6D42E8] flex items-center justify-center shrink-0">
                  <mat-icon class="text-base">schedule</mat-icon>
                </div>
                <h3 class="font-display font-bold text-slate-900 text-sm">Teaching Schedule ({{ scheduleDayLabel }})</h3>
              </div>
              <span class="text-xs font-semibold text-[#6D42E8] whitespace-nowrap shrink-0 tabular-nums">
                {{ todaysClasses().length }} {{ todaysClasses().length === 1 ? 'Period' : 'Periods' }}
              </span>
            </div>

            <div class="divide-y divide-slate-100 mt-2">
              @for (c of todaysClasses(); track c.id) {
                <div class="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-slate-50/60 px-2 rounded-lg transition-colors">
                  <div class="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div class="w-14 sm:w-16 shrink-0 py-2 rounded-lg bg-purple-50 text-[#6D42E8] font-bold text-xs text-center border border-purple-100 tabular-nums font-mono">
                      {{ c.periodId }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="font-semibold text-[13px] text-slate-900">{{ c.subjectName }}</p>
                      <p class="text-xs text-slate-500 mt-0.5">
                        {{ c.sectionId === 'sec-2' ? 'Section B' : 'Section A' }} · Room {{ c.room }} ·
                        <span class="font-semibold text-[#6D42E8]">{{ c.subjectType }}</span>
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 pl-[68px] sm:pl-0 shrink-0">
                    <a
                      routerLink="/faculty/attendance"
                      class="bg-purple-50 text-[#6D42E8] hover:bg-[#6D42E8] hover:text-white border border-purple-200 hover:border-[#6D42E8] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      <mat-icon class="text-sm">how_to_reg</mat-icon>
                      <span>Attendance</span>
                    </a>
                  </div>
                </div>
              } @empty {
                <div class="py-12 text-center">
                  <mat-icon class="text-4xl text-slate-300 mb-2">event_available</mat-icon>
                  <p class="font-semibold text-xs text-slate-700">No lectures scheduled for {{ scheduleDayLabel }}.</p>
                  <p class="text-[11px] text-slate-400 mt-0.5">Review your full weekly timetable or academic calendar.</p>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Pending Tasks Card (Span 1) -->
        <div class="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between min-w-0">
          <div>
            <div class="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <mat-icon class="text-base">task_alt</mat-icon>
              </div>
              <h3 class="font-display font-bold text-slate-900 text-sm">Action Items & Pending Tasks</h3>
            </div>

            <div class="space-y-3 mt-4">
              <div class="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/70 flex items-start gap-3">
                <mat-icon class="text-[#6D42E8] text-base mt-0.5 shrink-0">quiz</mat-icon>
                <div class="min-w-0">
                  <p class="text-xs font-bold text-slate-900">Question Papers & Bank</p>
                  <p class="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {{ facultyQuestionsCount() }} bank questions · {{ draftPapersCount() }} draft & {{ finalizedPapersCount() }} finalized papers.
                  </p>
                  <a routerLink="/faculty/question-papers" class="text-[11px] font-semibold text-[#6D42E8] hover:underline mt-1.5 inline-block">
                    Prepare Question Paper →
                  </a>
                </div>
              </div>

              <div class="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/70 flex items-start gap-3">
                <mat-icon class="text-amber-600 text-base mt-0.5 shrink-0">fact_check</mat-icon>
                <div class="min-w-0">
                  <p class="text-xs font-bold text-slate-900">Evaluate Answer Sheets & Tasks</p>
                  <p class="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {{ pendingAnswerSheetsCount() }} exam sheets & {{ facade.assignmentTotals().pendingReview }} coursework submissions awaiting grading.
                  </p>
                  <div class="flex flex-wrap items-center gap-3 mt-1.5">
                    <a routerLink="/faculty/answer-sheets" class="text-[11px] font-semibold text-[#6D42E8] hover:underline">
                      Evaluate Sheets →
                    </a>
                    <a routerLink="/faculty/assignments" class="text-[11px] font-semibold text-indigo-600 hover:underline">
                      Assignments & HW →
                    </a>
                  </div>
                </div>
              </div>

              <div class="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200/70 flex items-start gap-3">
                <mat-icon class="text-indigo-600 text-base mt-0.5 shrink-0">grading</mat-icon>
                <div class="min-w-0">
                  <p class="text-xs font-bold text-slate-900">Marks Entry & Result Approval</p>
                  <p class="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {{ draftResultsCount() > 0 ? draftResultsCount() + ' draft marks awaiting submission for approval.' : facade.facultyExams().length + ' examinations mapped to your subjects.' }}
                  </p>
                  <div class="flex flex-wrap items-center gap-3 mt-1.5">
                    <a routerLink="/faculty/results-marks" class="text-[11px] font-semibold text-[#6D42E8] hover:underline">
                      Marks & Approval →
                    </a>
                    <a routerLink="/faculty/attendance" class="text-[11px] font-semibold text-emerald-700 hover:underline">
                      Attendance ({{ lowAttendanceStudents().length }} alerts) →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. My Classes (Subject-Section Cards) -->
      <div class="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4">
        <div class="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-purple-50 text-[#6D42E8] flex items-center justify-center shrink-0">
              <mat-icon class="text-base">class</mat-icon>
            </div>
            <h3 class="font-display font-bold text-slate-900 text-sm">My Allocated Classes</h3>
          </div>
          <a routerLink="/faculty/my-classes" class="text-xs font-semibold text-[#6D42E8] hover:underline whitespace-nowrap shrink-0">
            View All →
          </a>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (cls of myClasses(); track cls.id) {
            <div class="p-4 rounded-xl border border-slate-200/90 bg-slate-50/60 hover:border-purple-300 transition-colors space-y-3">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-[#6D42E8] block">
                    {{ cls.subjectCode }} · {{ cls.subjectType }}
                  </span>
                  <h4 class="font-bold text-slate-900 text-[13px] mt-1 truncate">{{ cls.subject }}</h4>
                  <p class="text-[11px] text-slate-500 truncate mt-0.5">{{ cls.course }} · {{ cls.semester }}</p>
                </div>
                <span class="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-xs text-[#6D42E8] whitespace-nowrap shrink-0">
                  {{ cls.section }}
                </span>
              </div>
              <div class="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-200/70 text-xs">
                <div>
                  <span class="text-slate-500 block text-[11px]">Enrolled</span>
                  <span class="font-bold text-slate-900 tabular-nums">{{ cls.studentsCount }} Students</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[11px]">Avg Attendance</span>
                  <span
                    class="font-bold tabular-nums"
                    [class]="cls.avgAttendance > 0 && cls.avgAttendance < facade.attendanceThreshold() ? 'text-rose-600' : 'text-emerald-700'"
                  >
                    {{ cls.sessionsCount > 0 ? cls.avgAttendance + '%' : 'No Logs' }}
                  </span>
                </div>
              </div>
              <div class="pt-1 flex items-center justify-between gap-2">
                <span class="text-[11px] text-slate-500 font-medium truncate">
                  Next: <strong class="text-slate-800">{{ cls.nextSession }}</strong>
                </span>
                <a [routerLink]="['/faculty/my-classes', cls.id]" class="text-xs font-semibold text-[#6D42E8] hover:underline whitespace-nowrap shrink-0">
                  Manage →
                </a>
              </div>
            </div>
          } @empty {
            <div class="col-span-full py-10 text-center text-slate-400 text-xs">
              No classes currently allocated to your profile.
            </div>
          }
        </div>
      </div>

      <!-- 5. Three Live Analytics Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- Attendance Trend (Line) -->
        <div class="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 min-w-0 overflow-hidden">
          <h3 class="font-display font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <mat-icon class="text-[#6D42E8] text-base shrink-0">trending_up</mat-icon>
            <span>Attendance Trend (My Classes)</span>
          </h3>
          <div class="h-[200px] sm:h-[220px] relative">
            <canvas baseChart [data]="lineChartData()" [options]="lineChartOptions" [type]="'line'"></canvas>
          </div>
        </div>

        <!-- Subject-wise Average Marks (Bar) -->
        <div class="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 min-w-0 overflow-hidden">
          <h3 class="font-display font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <mat-icon class="text-indigo-600 text-base shrink-0">bar_chart</mat-icon>
            <span>Subject Average Marks (%)</span>
          </h3>
          <div class="h-[200px] sm:h-[220px] relative">
            <canvas baseChart [data]="barChartData()" [options]="barChartOptions" [type]="'bar'"></canvas>
          </div>
        </div>

        <!-- Assignment Submission Rate (Doughnut) -->
        <div class="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 min-w-0 overflow-hidden">
          <h3 class="font-display font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <mat-icon class="text-[#6D42E8] text-base shrink-0">donut_large</mat-icon>
            <span>Assignment Submission Rate</span>
          </h3>
          <div class="h-[200px] sm:h-[220px] relative">
            <canvas baseChart [data]="doughnutChartData()" [options]="doughnutOptions" [type]="'doughnut'"></canvas>
          </div>
        </div>
      </div>

      <!-- 6. Low Attendance Students (< Threshold) -->
      <div class="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div class="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="min-w-0">
            <h3 class="font-display font-bold text-slate-900 text-sm flex items-center gap-2">
              <mat-icon class="text-rose-600 text-base shrink-0">warning</mat-icon>
              <span>Low Attendance Students (&lt; {{ facade.attendanceThreshold() }}%)</span>
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">Students enrolled in your classes below the minimum attendance threshold.</p>
          </div>
          <span class="self-start sm:self-auto px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-xs whitespace-nowrap shrink-0 tabular-nums">
            {{ lowAttendanceStudents().length }} Students
          </span>
        </div>

        <!-- Phone Stacked Cards (< sm) -->
        <div class="sm:hidden divide-y divide-slate-100">
          @for (stu of lowAttendanceStudents(); track stu.student.id) {
            <div class="p-4 space-y-2.5">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="font-bold text-xs text-slate-900">{{ stu.student.name }}</p>
                  <p class="text-[11px] text-slate-500 mt-0.5">{{ stu.student.course }} · {{ stu.student.enrollmentNo }}</p>
                </div>
                <span class="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px] tabular-nums whitespace-nowrap shrink-0">
                  {{ stu.attendancePct }}%
                </span>
              </div>
              <div class="flex items-center justify-between gap-2 pt-1 text-[11px]">
                <span class="text-slate-500 font-medium">{{ stu.student.semester }} ({{ stu.attendedSessions }}/{{ stu.totalSessions }})</span>
                <a routerLink="/faculty/message-center" class="text-[#6D42E8] font-semibold hover:underline whitespace-nowrap">Send Warning →</a>
              </div>
            </div>
          } @empty {
            <div class="px-4 py-10 text-center text-slate-400 text-xs">
              All students in your classes maintain above {{ facade.attendanceThreshold() }}% attendance.
            </div>
          }
        </div>

        <!-- Desktop & Tablet Table (sm+) -->
        <div class="hidden sm:block overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="bg-slate-50/75 border-b border-slate-200">
                <th class="px-6 py-3 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Student Name</th>
                <th class="px-6 py-3 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Course / Program</th>
                <th class="px-6 py-3 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">Sessions</th>
                <th class="px-6 py-3 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">Attendance %</th>
                <th class="px-6 py-3 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (stu of lowAttendanceStudents(); track stu.student.id) {
                <tr class="hover:bg-slate-50/60 transition-colors">
                  <td class="px-6 py-3.5">
                    <p class="font-semibold text-slate-900">{{ stu.student.name }}</p>
                    <p class="text-[11px] font-mono text-slate-500">{{ stu.student.enrollmentNo }}</p>
                  </td>
                  <td class="px-6 py-3.5 text-slate-600">{{ stu.student.course }} · {{ stu.student.semester }}</td>
                  <td class="px-6 py-3.5 text-slate-600 text-center tabular-nums">{{ stu.attendedSessions }} / {{ stu.totalSessions }}</td>
                  <td class="px-6 py-3.5 text-center">
                    <span class="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px] tabular-nums">{{ stu.attendancePct }}%</span>
                  </td>
                  <td class="px-6 py-3.5 text-right">
                    <a routerLink="/faculty/message-center" class="text-[#6D42E8] font-semibold hover:underline text-xs">Send Warning</a>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="px-6 py-12 text-center text-slate-400 text-xs">
                    All students in your classes maintain above {{ facade.attendanceThreshold() }}% attendance.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- 7. Upcoming Exams & Latest Notices -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <!-- Upcoming Exams -->
        <div class="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <h3 class="font-display font-bold text-slate-900 text-sm flex items-center gap-2">
              <mat-icon class="text-[#6D42E8] text-base shrink-0">event</mat-icon>
              <span>Upcoming Examinations</span>
            </h3>
            <a routerLink="/faculty/results-marks" class="text-xs font-semibold text-[#6D42E8] hover:underline">Enter Marks →</a>
          </div>
          <div class="space-y-3">
            @for (exam of upcomingExams(); track exam.id) {
              <div class="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <div class="min-w-0">
                  <p class="font-semibold text-xs text-slate-900">{{ exam.title }}</p>
                  <p class="text-[11px] text-slate-500 mt-0.5">{{ exam.subjectName }} · {{ facade.formatShortDate(exam.date) }} ({{ exam.time }})</p>
                </div>
                <span class="self-start sm:self-auto px-2 py-0.5 rounded-md bg-purple-50 text-[#6D42E8] border border-purple-200 font-semibold text-[11px] whitespace-nowrap shrink-0 tabular-nums">
                  {{ exam.maxMarks }} Marks
                </span>
              </div>
            } @empty {
              <p class="text-xs text-slate-400 py-6 text-center">No upcoming examinations scheduled for your subjects.</p>
            }
          </div>
        </div>

        <!-- Latest Notices -->
        <div class="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <h3 class="font-display font-bold text-slate-900 text-sm flex items-center gap-2">
              <mat-icon class="text-[#6D42E8] text-base shrink-0">campaign</mat-icon>
              <span>Latest Academic Notices</span>
            </h3>
            <a routerLink="/faculty/notices" class="text-xs font-semibold text-[#6D42E8] hover:underline">View All →</a>
          </div>
          <div class="space-y-3">
            @for (notice of latestNotices(); track notice.id) {
              <div class="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-start gap-3">
                <mat-icon class="text-[#6D42E8] text-base mt-0.5 shrink-0">info</mat-icon>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <p class="font-semibold text-xs text-slate-900 truncate">{{ notice.title }}</p>
                    <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-[#6D42E8] shrink-0">{{ notice.priority }}</span>
                  </div>
                  <p class="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{{ notice.body }}</p>
                  <span class="text-[10px] text-slate-400 mt-1 block">{{ facade.formatShortDate(notice.publishDate) }} · {{ notice.createdBy }}</span>
                </div>
              </div>
            } @empty {
              <p class="text-xs text-slate-400 py-6 text-center">No active notices.</p>
            }
          </div>
        </div>
      </div>

      <!-- 8. Quick Actions -->
      <div class="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
        <h3 class="font-display font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
          <mat-icon class="text-[#6D42E8] text-base shrink-0">bolt</mat-icon>
          <span>Quick Actions</span>
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          @for (action of quickActions; track action.route) {
            <a
              [routerLink]="action.route"
              class="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-purple-50/60 hover:border-purple-300 transition-colors text-center flex flex-col items-center justify-center gap-2 group"
            >
              <div class="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#6D42E8] group-hover:scale-105 transition-transform shrink-0">
                <mat-icon class="text-xl">{{ action.icon }}</mat-icon>
              </div>
              <span class="text-xs font-semibold text-slate-800">{{ action.title }}</span>
            </a>
          }
        </div>
      </div>

    </div>
  `
})
export class FacultyDashboardPage {
  protected readonly facade = inject(FacultyPortalFacade);
  private readonly resultsService = inject(ResultsService);
  private readonly qpService = inject(QuestionPaperService);

  protected readonly currentFaculty = this.facade.currentFaculty;
  protected readonly myClasses = this.facade.myClasses;

  private readonly rawDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()] || 'Mon';
  protected readonly scheduleDayLabel = ['Sat', 'Sun'].includes(this.rawDay) ? 'Mon' : this.rawDay;

  protected readonly greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();

  protected readonly todaysClasses = computed(() =>
    this.facade.mySlots().filter(s => s.day === this.scheduleDayLabel)
  );

  protected readonly draftResultsCount = computed(() => {
    const examIds = new Set(this.facade.facultyExams().map(e => e.id));
    return this.resultsService
      .results()
      .filter(r => examIds.has(r.examId) && (r.status === 'Draft' || r.status === 'Revision Requested'))
      .length;
  });

  protected readonly facultyQuestionsCount = computed(() => {
    const subNames = new Set(this.myClasses().map(c => c.subject.toLowerCase()));
    return this.qpService.questions().filter(q => subNames.has(q.subjectName.toLowerCase())).length;
  });

  protected readonly draftPapersCount = computed(() => {
    const subNames = new Set(this.myClasses().map(c => c.subject.toLowerCase()));
    return this.qpService
      .papers()
      .filter(p => subNames.has(p.subjectName.toLowerCase()) && p.status === 'Draft')
      .length;
  });

  protected readonly finalizedPapersCount = computed(() => {
    const subNames = new Set(this.myClasses().map(c => c.subject.toLowerCase()));
    return this.qpService
      .papers()
      .filter(p => subNames.has(p.subjectName.toLowerCase()) && p.status === 'Finalized')
      .length;
  });

  protected readonly pendingAnswerSheetsCount = computed(() => {
    const examIds = new Set(this.facade.facultyExams().map(e => e.id));
    const subNames = new Set(this.myClasses().map(c => c.subject.toLowerCase()));
    return this.qpService
      .answerSheets()
      .filter(
        s =>
          (examIds.has(s.examId) || subNames.has(s.subjectName.toLowerCase())) &&
          s.status === 'Pending Evaluation'
      )
      .length;
  });

  protected readonly stats = computed(() => {
    const classes = this.myClasses();
    const logged = classes.filter(c => c.sessionsCount > 0);
    const avgAtt =
      logged.length > 0
        ? Math.round(logged.reduce((acc, c) => acc + c.avgAttendance, 0) / logged.length)
        : 0;

    return {
      mySubjectsCount: classes.length,
      myStudentsCount: this.facade.myStudents().length,
      pendingEvaluations:
        this.facade.assignmentTotals().pendingReview +
        this.pendingAnswerSheetsCount() +
        this.draftResultsCount(),
      avgAttendance: avgAtt
    };
  });

  protected readonly lowAttendanceStudents = computed(() =>
    this.facade
      .myStudents()
      .filter(s => s.isLowAttendance)
      .slice(0, 6)
  );

  protected readonly upcomingExams = computed(() =>
    this.facade
      .facultyExams()
      .filter(e => e.status !== 'Completed')
      .slice(0, 3)
  );

  protected readonly latestNotices = computed(() =>
    this.facade.facultyNotices().slice(0, 3)
  );

  protected readonly quickActions = [
    { title: 'Mark Attendance', icon: 'how_to_reg', route: '/faculty/attendance' },
    { title: 'Assignments & HW', icon: 'assignment_add', route: '/faculty/assignments' },
    { title: 'Question Papers', icon: 'quiz', route: '/faculty/question-papers' },
    { title: 'Answer Sheets', icon: 'fact_check', route: '/faculty/answer-sheets' },
    { title: 'Marks Approval', icon: 'grading', route: '/faculty/results-marks' },
    { title: 'Reports & PDF', icon: 'analytics', route: '/faculty/reports' },
    { title: 'Timetable', icon: 'calendar_month', route: '/faculty/timetable' },
    { title: 'My Students', icon: 'groups', route: '/faculty/my-students' }
  ];

  // Live Line Chart from Faculty Attendance Sessions
  protected readonly lineChartData = computed<ChartData<'line'>>(() => {
    const pts = this.facade.attendanceTrend();
    return {
      labels: pts.length > 0 ? pts.map(p => p.label) : ['No Sessions'],
      datasets: [
        {
          data: pts.length > 0 ? pts.map(p => p.percentage) : [0],
          label: 'Class Attendance %',
          borderColor: '#6D42E8',
          backgroundColor: 'rgba(109, 66, 232, 0.12)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#6D42E8'
        }
      ]
    };
  });

  protected readonly lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 0, max: 100, grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 } } },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } }
    }
  };

  // Live Bar Chart from ResultsService
  protected readonly barChartData = computed<ChartData<'bar'>>(() => {
    const cls = this.myClasses();
    return {
      labels: cls.length > 0 ? cls.map(c => (c.subjectCode || c.subject.slice(0, 12))) : ['No Classes'],
      datasets: [
        {
          data: cls.length > 0 ? cls.map(c => c.avgMarksPct ?? 0) : [0],
          label: 'Average Score %',
          backgroundColor: '#6D42E8',
          borderRadius: 6,
          barThickness: 28
        }
      ]
    };
  });

  protected readonly barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 0, max: 100, grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 } } },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } }
    }
  };

  // Live Doughnut Chart from AssignmentsService
  protected readonly doughnutChartData = computed<ChartData<'doughnut'>>(() => {
    const t = this.facade.assignmentTotals();
    const hasData = t.submitted + t.late + t.pending + t.evaluated > 0;
    return {
      labels: ['Submitted', 'Pending', 'Late', 'Evaluated'],
      datasets: [
        {
          data: hasData ? [t.submitted, t.pending, t.late, t.evaluated] : [0, 1, 0, 0],
          backgroundColor: ['#10B981', '#F59E0B', '#0EA5E9', '#6D42E8'],
          borderWidth: 0
        }
      ]
    };
  });

  protected readonly doughnutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 8, font: { size: 10 } } }
    }
  };
}
