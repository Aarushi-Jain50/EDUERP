import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CurrentUserService } from '../../../services/current-user.service';
import { TimetableService } from '../../../services/timetable.service';
import { StudentsService } from '../../../services/students.service';
import { AttendanceService } from '../../../services/attendance.service';
import { AssignmentsService } from '../../../services/assignments.service';
import { ExaminationsService } from '../../../services/examinations.service';
import { ResultsService } from '../../../services/results.service';
import { AcademicService } from '../../../services/academic.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';

@Component({
  selector: 'app-faculty-dashboard',
  imports: [CommonModule, RouterLink, MatIconModule, BaseChartDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5 sm:space-y-6 pb-16 font-sans text-slate-900 min-w-0">
      
      <!-- 1. Welcome Banner -->
      <div class="gradient-brand text-white p-5 sm:p-6 md:p-7 rounded-xl shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 border border-slate-800/80">
        <div class="absolute -right-12 -top-12 w-48 h-48 rounded-full aurora-glow pointer-events-none"></div>
        <div class="relative z-10 space-y-1.5 min-w-0">
          <div class="flex flex-wrap items-center gap-2 text-xs text-slate-300 font-medium">
            <span class="text-indigo-300 font-semibold">{{ currentFaculty().designation }}</span>
            <span class="text-slate-600" aria-hidden="true">/</span>
            <span>{{ currentFaculty().department }}</span>
          </div>
          <h1 class="font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
            {{ greeting }}, {{ currentFaculty().name }}
          </h1>
          <p class="text-xs text-slate-300 max-w-xl leading-relaxed">
            You have <span class="font-semibold text-indigo-300">{{ todaysClasses().length }} classes scheduled today</span>. Review pending academic tasks and monitor student engagement below.
          </p>
        </div>
        <div class="relative z-10 flex items-center gap-3 shrink-0">
          <a routerLink="/faculty/attendance" class="w-full sm:w-auto justify-center bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap">
            <mat-icon class="text-base">how_to_reg</mat-icon>
            <span>Mark Attendance</span>
          </a>
        </div>
      </div>

      <!-- 2. Five KPI Stat Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div class="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex items-start justify-between gap-3 min-w-0">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">My Subjects</p>
            <h4 class="font-display text-2xl font-bold text-slate-900 tabular-nums mt-1.5">{{ stats().mySubjectsCount }}</h4>
            <p class="text-[11px] text-slate-500 mt-1">Active term</p>
          </div>
          <div class="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <mat-icon class="text-lg">library_books</mat-icon>
          </div>
        </div>

        <div class="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex items-start justify-between gap-3 min-w-0">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Today's Classes</p>
            <h4 class="font-display text-2xl font-bold text-slate-900 tabular-nums mt-1.5">{{ todaysClasses().length }}</h4>
            <p class="text-[11px] text-slate-500 mt-1">{{ todayDay }} schedule</p>
          </div>
          <div class="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
            <mat-icon class="text-lg">calendar_today</mat-icon>
          </div>
        </div>

        <div class="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex items-start justify-between gap-3 min-w-0">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">My Students</p>
            <h4 class="font-display text-2xl font-bold text-slate-900 tabular-nums mt-1.5">{{ stats().myStudentsCount }}</h4>
            <p class="text-[11px] text-slate-500 mt-1">Enrolled cohort</p>
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
            <p class="text-[11px] text-slate-500 mt-1">Across sections</p>
          </div>
          <div class="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
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
                <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <mat-icon class="text-base">schedule</mat-icon>
                </div>
                <h3 class="font-display font-bold text-slate-900 text-sm">Today's Teaching Schedule ({{ todayDay }})</h3>
              </div>
              <span class="text-xs font-semibold text-indigo-600 whitespace-nowrap shrink-0 tabular-nums">{{ todaysClasses().length }} Periods</span>
            </div>

            <div class="divide-y divide-slate-100 mt-2">
              @for (c of todaysClasses(); track c.id) {
                <div class="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-slate-50/60 px-2 rounded-lg transition-colors">
                  <div class="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div class="w-14 sm:w-16 shrink-0 py-2 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs text-center border border-indigo-100 tabular-nums font-mono">
                      {{ c.periodId }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="font-semibold text-[13px] text-slate-900">{{ c.subjectName }}</p>
                      <p class="text-xs text-slate-500 mt-0.5">Section {{ c.sectionId === 'sec-1' ? 'A' : 'B' }} · Room {{ c.room }} · <span class="font-semibold text-indigo-600">{{ c.subjectType }}</span></p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 pl-[68px] sm:pl-0 shrink-0">
                    <a routerLink="/faculty/attendance" class="bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1 whitespace-nowrap">
                      <mat-icon class="text-sm">how_to_reg</mat-icon> Attendance
                    </a>
                  </div>
                </div>
              } @empty {
                <div class="py-12 text-center">
                  <mat-icon class="text-4xl text-slate-300 mb-2">event_available</mat-icon>
                  <p class="font-semibold text-xs text-slate-700">No classes scheduled for you today.</p>
                  <p class="text-[11px] text-slate-400 mt-0.5">Check the weekly timetable for upcoming lectures.</p>
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
              <div class="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/70 flex items-start gap-3">
                <mat-icon class="text-amber-600 text-base mt-0.5 shrink-0">error_outline</mat-icon>
                <div class="min-w-0">
                  <p class="text-xs font-bold text-slate-900">Mark Attendance for Period 1</p>
                  <p class="text-[11px] text-slate-500 mt-0.5 leading-snug">Attendance roll not yet submitted for today's morning lecture.</p>
                  <a routerLink="/faculty/attendance" class="text-[11px] font-semibold text-indigo-600 hover:underline mt-1.5 inline-block">Submit Now →</a>
                </div>
              </div>

              <div class="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-200/70 flex items-start gap-3">
                <mat-icon class="text-indigo-600 text-base mt-0.5 shrink-0">grading</mat-icon>
                <div class="min-w-0">
                  <p class="text-xs font-bold text-slate-900">Enter Exam Mid-Term Marks</p>
                  <p class="text-[11px] text-slate-500 mt-0.5 leading-snug">Evaluation grades pending for 45 student submissions.</p>
                  <a routerLink="/faculty/results" class="text-[11px] font-semibold text-indigo-600 hover:underline mt-1.5 inline-block">Enter Grades →</a>
                </div>
              </div>

              <div class="p-3.5 rounded-xl bg-sky-50/50 border border-sky-200/70 flex items-start gap-3">
                <mat-icon class="text-sky-600 text-base mt-0.5 shrink-0">assignment</mat-icon>
                <div class="min-w-0">
                  <p class="text-xs font-bold text-slate-900">Review Assignment Submissions</p>
                  <p class="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {{ stats().pendingEvaluations }} {{ stats().pendingEvaluations === 1 ? 'submission' : 'submissions' }} awaiting evaluation across your active assignments.
                  </p>
                  <a routerLink="/faculty/assignments" class="text-[11px] font-semibold text-indigo-600 hover:underline mt-1.5 inline-block">Review Submissions →</a>
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
            <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <mat-icon class="text-base">class</mat-icon>
            </div>
            <h3 class="font-display font-bold text-slate-900 text-sm">My Allocated Classes</h3>
          </div>
          <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap shrink-0">Active Semester</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (cls of myClasses(); track cls.subjectId) {
            <div class="p-4 rounded-xl border border-slate-200/90 bg-slate-50/60 hover:border-indigo-300 transition-colors space-y-3">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">{{ cls.type }}</span>
                  <h4 class="font-bold text-slate-900 text-[13px] mt-1 truncate">{{ cls.subjectName }}</h4>
                </div>
                <span class="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-xs text-indigo-600 whitespace-nowrap shrink-0">
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
                  <span class="font-bold text-emerald-700 tabular-nums">{{ cls.avgAttendance }}%</span>
                </div>
              </div>
              <div class="pt-1 flex items-center justify-between gap-2">
                <span class="text-[11px] text-slate-500 font-medium">Room: <strong class="text-slate-800">{{ cls.room }}</strong></span>
                <a routerLink="/faculty/attendance" class="text-xs font-semibold text-indigo-600 hover:underline whitespace-nowrap shrink-0">Manage Class →</a>
              </div>
            </div>
          } @empty {
            <div class="col-span-full py-10 text-center text-slate-400 text-xs">
              No classes currently allocated to your profile.
            </div>
          }
        </div>
      </div>

      <!-- 5. Three Charts Only -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- Attendance Trend (Line) -->
        <div class="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 min-w-0 overflow-hidden">
          <h3 class="font-display font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <mat-icon class="text-indigo-600 text-base shrink-0">trending_up</mat-icon>
            <span>Attendance Trend (My Classes)</span>
          </h3>
          <div class="h-[200px] sm:h-[220px] relative">
            <canvas baseChart [data]="lineChartData" [options]="lineChartOptions" [type]="'line'"></canvas>
          </div>
        </div>

        <!-- Subject-wise Average Marks (Bar) -->
        <div class="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 min-w-0 overflow-hidden">
          <h3 class="font-display font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <mat-icon class="text-sky-600 text-base shrink-0">bar_chart</mat-icon>
            <span>Subject Average Marks (%)</span>
          </h3>
          <div class="h-[200px] sm:h-[220px] relative">
            <canvas baseChart [data]="barChartData()" [options]="barChartOptions" [type]="'bar'"></canvas>
          </div>
        </div>

        <!-- Assignment Submission Rate (Doughnut) -->
        <div class="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 min-w-0 overflow-hidden">
          <h3 class="font-display font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <mat-icon class="text-indigo-600 text-base shrink-0">donut_large</mat-icon>
            <span>Assignment Submission Rate</span>
          </h3>
          <div class="h-[200px] sm:h-[220px] relative">
            <canvas baseChart [data]="doughnutChartData()" [options]="doughnutOptions" [type]="'doughnut'"></canvas>
          </div>
        </div>
      </div>

      <!-- 6. Low Attendance Students (<75%) -->
      <div class="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div class="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="min-w-0">
            <h3 class="font-display font-bold text-slate-900 text-sm flex items-center gap-2">
              <mat-icon class="text-rose-600 text-base shrink-0">warning</mat-icon>
              <span>Low Attendance Students (&lt; 75%)</span>
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">Students enrolled in your subjects requiring attendance shortfall warnings.</p>
          </div>
          <span class="self-start sm:self-auto px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-xs whitespace-nowrap shrink-0 tabular-nums">{{ lowAttendanceStudents().length }} Students</span>
        </div>

        <!-- Phone Stacked Cards (< sm) -->
        <div class="sm:hidden divide-y divide-slate-100">
          @for (stu of lowAttendanceStudents(); track stu.id) {
            <div class="p-4 space-y-2.5">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="font-bold text-xs text-slate-900">{{ stu.name }}</p>
                  <p class="text-[11px] text-slate-500 mt-0.5">{{ stu.course }}</p>
                </div>
                <span class="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px] tabular-nums whitespace-nowrap shrink-0">
                  {{ stu.percentage }}%
                </span>
              </div>
              <div class="flex items-center justify-between gap-2 pt-1 text-[11px]">
                <span class="text-slate-500 font-medium">{{ stu.semester }}</span>
                <a routerLink="/faculty/message-center" class="text-indigo-600 font-semibold hover:underline whitespace-nowrap">Send Warning →</a>
              </div>
            </div>
          } @empty {
            <div class="px-4 py-10 text-center text-slate-400 text-xs">
              All students in your classes maintain above 75% attendance.
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
                <th class="px-6 py-3 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">Semester</th>
                <th class="px-6 py-3 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">Attendance %</th>
                <th class="px-6 py-3 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (stu of lowAttendanceStudents(); track stu.id) {
                <tr class="hover:bg-slate-50/60 transition-colors">
                  <td class="px-6 py-3.5 font-semibold text-slate-900">{{ stu.name }}</td>
                  <td class="px-6 py-3.5 text-slate-600">{{ stu.course }}</td>
                  <td class="px-6 py-3.5 text-slate-600 text-center">{{ stu.semester }}</td>
                  <td class="px-6 py-3.5 text-center">
                    <span class="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px] tabular-nums">{{ stu.percentage }}%</span>
                  </td>
                  <td class="px-6 py-3.5 text-right">
                    <a routerLink="/faculty/message-center" class="text-indigo-600 font-semibold hover:underline text-xs">Send Warning</a>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="px-6 py-12 text-center text-slate-400 text-xs">
                    All students in your classes maintain above 75% attendance.
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
              <mat-icon class="text-indigo-600 text-base shrink-0">event</mat-icon>
              <span>Upcoming Examinations</span>
            </h3>
          </div>
          <div class="space-y-3">
            @for (exam of upcomingExams(); track exam.id) {
              <div class="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <div class="min-w-0">
                  <p class="font-semibold text-xs text-slate-900">{{ exam.title }}</p>
                  <p class="text-[11px] text-slate-500 mt-0.5">{{ exam.subjectName }} · {{ exam.date }} ({{ exam.time }})</p>
                </div>
                <span class="self-start sm:self-auto px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold text-[11px] whitespace-nowrap shrink-0 tabular-nums">{{ exam.maxMarks }} Marks</span>
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
              <mat-icon class="text-indigo-600 text-base shrink-0">campaign</mat-icon>
              <span>Latest Academic Notices</span>
            </h3>
          </div>
          <div class="space-y-3">
            @for (notice of latestNotices(); track notice.id) {
              <div class="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-start gap-3">
                <mat-icon class="text-indigo-600 text-base mt-0.5 shrink-0">info</mat-icon>
                <div class="min-w-0 flex-1">
                  <p class="font-semibold text-xs text-slate-900">{{ notice.title }}</p>
                  <p class="text-[11px] text-slate-500 mt-0.5 leading-snug">{{ notice.content }}</p>
                  <span class="text-[10px] text-slate-400 mt-1 block">{{ notice.date }}</span>
                </div>
              </div>
            } @empty {
              <p class="text-xs text-slate-400 py-6 text-center">No active notices.</p>
            }
          </div>
        </div>
      </div>

      <!-- 8. Quick Actions (2x3 Tiles) -->
      <div class="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
        <h3 class="font-display font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
          <mat-icon class="text-indigo-600 text-base shrink-0">bolt</mat-icon>
          <span>Quick Actions</span>
        </h3>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          @for (action of quickActions; track action.title) {
            <a [routerLink]="action.route" class="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-indigo-50/50 hover:border-indigo-300 transition-colors text-center flex flex-col items-center justify-center gap-2 group">
              <div class="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform shrink-0">
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
  private readonly userService = inject(CurrentUserService);
  private readonly timetableService = inject(TimetableService);
  private readonly studentsService = inject(StudentsService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly assignmentsService = inject(AssignmentsService);
  private readonly examinationsService = inject(ExaminationsService);
  private readonly resultsService = inject(ResultsService);
  private readonly academicService = inject(AcademicService);

  protected readonly currentFaculty = this.userService.currentFaculty;

  protected readonly todayDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()] || 'Mon';

  protected readonly greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();

  protected readonly todaysClasses = computed(() => {
    const facId = this.userService.facultyId();
    // For demo/testing convenience, iffac-4 has classes on Mon, Tue, etc., let's match todayDay or fallback to 'Mon' if weekend
    const dayToUse = ['Sat', 'Sun'].includes(this.todayDay) ? 'Mon' : this.todayDay;
    return this.timetableService.slots().filter(s => s.facultyId === facId && s.day === dayToUse);
  });

  protected readonly myClasses = computed(() => {
    const facId = this.userService.facultyId();
    const slots = this.timetableService.slots().filter(s => s.facultyId === facId);
    
    // Unique subject-section mapping
    const map = new Map<string, {
      subjectId: string;
      subjectName: string;
      section: string;
      type: string;
      room: string;
      studentsCount: number;
      avgAttendance: number;
    }>();
    slots.forEach(s => {
      const key = `${s.subjectId}-${s.sectionId}`;
      if (!map.has(key)) {
        map.set(key, {
          subjectId: s.subjectId,
          subjectName: s.subjectName,
          section: s.sectionId === 'sec-1' ? 'Section A' : 'Section B',
          type: s.subjectType,
          room: s.room,
          studentsCount: Math.floor(Math.random() * 20 + 40),
          avgAttendance: Math.floor(Math.random() * 15 + 80)
        });
      }
    });
    return Array.from(map.values());
  });

  protected readonly facultyAssignments = computed(() => {
    const fac = this.currentFaculty();
    const allocs = this.academicService.subjectAllocations().filter(
      a => a.faculty.toLowerCase().trim() === fac.name.toLowerCase().trim()
    );
    const subNames = new Set(allocs.map(a => a.subject.toLowerCase()));
    return this.assignmentsService.assignments().filter(a => subNames.has(a.subjectName.toLowerCase()));
  });

  protected readonly assignmentStatsTotals = computed(() => {
    void this.assignmentsService.submissions();
    let submitted = 0;
    let late = 0;
    let pending = 0;
    let evaluated = 0;

    for (const a of this.facultyAssignments()) {
      const s = this.assignmentsService.getAssignmentStats(a.id);
      submitted += s.submitted;
      late += s.late;
      pending += s.pending;
      evaluated += s.evaluated;
    }

    return {
      submitted,
      late,
      pending,
      evaluated,
      pendingReview: submitted + late
    };
  });

  protected readonly stats = computed(() => {
    const classes = this.myClasses();
    const subjectsCount = new Set(classes.map(c => c.subjectId)).size;
    const totalStudents = classes.reduce((acc, c) => acc + c.studentsCount, 0);
    const avgAtt = classes.length > 0 ? Math.round(classes.reduce((acc, c) => acc + c.avgAttendance, 0) / classes.length) : 85;
    const asgTotals = this.assignmentStatsTotals();

    return {
      mySubjectsCount: subjectsCount || 3,
      myStudentsCount: totalStudents || 115,
      pendingEvaluations: asgTotals.pendingReview,
      avgAttendance: avgAtt
    };
  });

  protected readonly lowAttendanceStudents = computed(() => {
    return this.studentsService.students().slice(0, 4).map((s, idx) => ({
      id: s.id,
      name: s.name,
      course: s.course,
      semester: s.semester,
      percentage: 68 + (idx * 2) // mock short <75%
    }));
  });

  protected readonly upcomingExams = computed(() => {
    return this.examinationsService.exams().slice(0, 3);
  });

  protected readonly latestNotices = computed(() => {
    return [
      { id: 'n1', title: 'Mid-Term Evaluation Schedule Released', content: 'All faculty members are requested to upload question papers by Friday.', date: 'Today, 10:30 AM' },
      { id: 'n2', title: 'Campus Wi-Fi Maintenance Notice', content: 'Network maintenance scheduled for Sunday between 02:00 AM and 06:00 AM.', date: 'Yesterday' }
    ];
  });

  protected readonly quickActions = [
    { title: 'Mark Attendance', icon: 'how_to_reg', route: '/faculty/attendance' },
    { title: 'Create Assignment', icon: 'assignment_add', route: '/faculty/assignments' },
    { title: 'Enter Marks', icon: 'grading', route: '/faculty/results' },
    { title: 'View Timetable', icon: 'calendar_month', route: '/faculty/timetable' },
    { title: 'Send Message', icon: 'forum', route: '/faculty/messages' },
    { title: 'My Students', icon: 'groups', route: '/faculty/students' }
  ];

  // Charts
  protected lineChartData: ChartData<'line'> = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [{
      data: [88, 85, 92, 79, 94],
      label: 'Class Attendance %',
      borderColor: '#4F46E5',
      backgroundColor: 'rgba(79, 70, 229, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  protected lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 50, max: 100, grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 } } },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } }
    }
  };

  protected barChartData = computed<ChartData<'bar'>>(() => {
    const cls = this.myClasses();
    return {
      labels: cls.map(c => c.subjectName.length > 18 ? c.subjectName.substring(0, 18) + '...' : c.subjectName),
      datasets: [{
        data: cls.map(() => 78 + Math.floor(Math.random() * 15)),
        label: 'Average Score %',
        backgroundColor: '#0EA5E9',
        borderRadius: 6,
        barThickness: 24
      }]
    };
  });

  protected barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 0, max: 100, grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 } } },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } }
    }
  };

  protected readonly doughnutChartData = computed<ChartData<'doughnut'>>(() => {
    const t = this.assignmentStatsTotals();
    const hasData = t.submitted + t.late + t.pending + t.evaluated > 0;
    return {
      labels: ['Submitted', 'Pending', 'Late', 'Evaluated'],
      datasets: [{
        data: hasData ? [t.submitted, t.pending, t.late, t.evaluated] : [0, 1, 0, 0],
        backgroundColor: ['#10B981', '#F59E0B', '#0EA5E9', '#4F46E5'],
        borderWidth: 0
      }]
    };
  });

  protected doughnutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 8, font: { size: 10 } } }
    }
  };
}
