import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AcademicService } from '../../../services/academic.service';
import { StudentsService } from '../../../services/students.service';
import { AttendanceService } from '../../../services/attendance.service';
import { AssignmentsService } from '../../../services/assignments.service';
import { ExaminationsService } from '../../../services/examinations.service';

@Component({
  selector: 'app-faculty-class-detail',
  imports: [CommonModule, RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-slate-800 pb-16">
      <div class="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <router-link routerLink="/faculty/my-classes" class="hover:text-indigo-600 transition-colors">My Classes</router-link>
        <span class="text-slate-300">/</span>
        <span class="text-slate-900">Class Details</span>
      </div>

      @if (allocation()) {
        <!-- Header Summary Card -->
        <div class="gradient-brand text-white p-5 sm:p-6 md:p-8 rounded-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 border border-slate-800">
          <div class="relative z-10 space-y-2 min-w-0">
            <div class="flex items-center flex-wrap gap-2 text-xs text-slate-300">
              <span class="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-400/25 text-[11px] font-semibold whitespace-nowrap shrink-0">
                {{ allocation()?.section }}
              </span>
              <span aria-hidden="true">·</span>
              <span>{{ allocation()?.semester }}</span>
            </div>
            <h1 class="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              {{ allocation()?.subject }}
            </h1>
            <p class="text-xs text-slate-300 leading-relaxed">
              Program: <strong class="text-white">{{ allocation()?.course }}</strong> · Weekly Load: <strong class="text-indigo-300 whitespace-nowrap tabular-nums">{{ allocation()?.weeklyHours }} Hours</strong>
            </p>
          </div>
          <div class="relative z-10 flex items-center gap-3 shrink-0 w-full md:w-auto">
            <router-link routerLink="/faculty/attendance" class="w-full md:w-auto justify-center bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap">
              <mat-icon class="text-sm shrink-0">how_to_reg</mat-icon> Take Attendance
            </router-link>
          </div>
        </div>

        <!-- Tab Navigation -->
        <div class="flex items-center gap-2 border-b border-slate-200 overflow-x-auto scrollbar-none">
          @for (tab of tabs; track tab.id) {
            <button
              (click)="activeTab.set(tab.id)"
              [class]="activeTab() === tab.id ? 'border-b-2 border-indigo-600 text-indigo-600 font-semibold bg-white' : 'text-slate-500 hover:text-slate-800 font-medium'"
              class="px-4 sm:px-5 py-3 text-xs transition-all cursor-pointer rounded-t-xl whitespace-nowrap shrink-0"
            >
              {{ tab.label }}
            </button>
          }
        </div>

        <!-- Tab Content -->
        <div class="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 sm:p-6">
          @switch (activeTab()) {
            @case ('students') {
              <div class="space-y-4">
                <div class="flex items-center justify-between flex-wrap gap-2">
                  <h3 class="font-extrabold text-slate-900 text-sm">Enrolled Students Roster ({{ classStudents().length }})</h3>
                </div>

                <!-- Phone Card List (< sm) -->
                <div class="sm:hidden divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  @for (stu of classStudents(); track stu.id; let idx = $index) {
                    <div class="p-3.5 space-y-2">
                      <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2.5 min-w-0">
                          <div class="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {{ stu.initials || 'ST' }}
                          </div>
                          <div class="min-w-0">
                            <p class="font-bold text-slate-900 text-xs truncate">{{ stu.name }}</p>
                            <p class="text-[11px] text-slate-500 font-mono truncate">{{ stu.enrollmentNo }}</p>
                          </div>
                        </div>
                        <span [class]="(82 - idx * 3) < 75 ? 'bg-rose-50 text-rose-700 border border-rose-200/80' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'" class="px-2 py-0.5 rounded-md font-semibold text-[11px] tabular-nums whitespace-nowrap shrink-0">
                          {{ 82 - (idx * 3) % 15 }}% Att.
                        </span>
                      </div>
                      <div class="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                        <span class="truncate">{{ stu.email }}</span>
                        <span class="font-bold text-slate-900 tabular-nums whitespace-nowrap shrink-0">{{ 76 + (idx * 2) % 20 }} / 100</span>
                      </div>
                    </div>
                  } @empty {
                    <p class="px-4 py-8 text-center text-slate-400 italic text-xs">No students found for this class.</p>
                  }
                </div>

                <!-- Tablet/Desktop Table (sm+) -->
                <div class="hidden sm:block overflow-x-auto">
                  <table class="w-full text-left text-xs">
                    <thead>
                      <tr class="bg-slate-50 border-b border-slate-100">
                        <th class="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Student Name</th>
                        <th class="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Enrollment No</th>
                        <th class="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Email</th>
                        <th class="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px] text-center">Attendance %</th>
                        <th class="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px] text-right">Avg Marks</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                      @for (stu of classStudents(); track stu.id; let idx = $index) {
                        <tr class="hover:bg-slate-50/50">
                          <td class="px-4 py-3 font-bold text-slate-900 flex items-center gap-2.5">
                            <div class="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {{ stu.initials || 'ST' }}
                            </div>
                            <span>{{ stu.name }}</span>
                          </td>
                          <td class="px-4 py-3 text-slate-600 font-mono">{{ stu.enrollmentNo }}</td>
                          <td class="px-4 py-3 text-slate-600">{{ stu.email }}</td>
                          <td class="px-4 py-3 text-center">
                            <span [class]="(82 - idx * 3) < 75 ? 'bg-rose-50 text-rose-700 border border-rose-200/80' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'" class="px-2 py-0.5 rounded-md font-semibold text-[11px] tabular-nums">
                              {{ 82 - (idx * 3) % 15 }}%
                            </span>
                          </td>
                          <td class="px-4 py-3 text-right font-bold text-slate-900 tabular-nums">
                            {{ 76 + (idx * 2) % 20 }} / 100
                          </td>
                        </tr>
                      } @empty {
                        <tr>
                          <td colspan="5" class="px-4 py-8 text-center text-slate-400 italic">No students found for this class.</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }

            @case ('attendance') {
              <div class="space-y-4">
                <div class="flex items-center justify-between flex-wrap gap-2">
                  <h3 class="font-extrabold text-slate-900 text-sm">Attendance Session History</h3>
                  <router-link routerLink="/faculty/attendance" class="text-xs font-semibold text-indigo-600 hover:underline whitespace-nowrap">Mark New Session →</router-link>
                </div>
                <div class="space-y-3">
                  @for (s of attendanceSessions(); track s.id) {
                    <div class="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div class="min-w-0">
                        <p class="font-bold text-xs text-slate-900">Session Date: {{ s.date }} (Period: {{ s.periodId }})</p>
                        <p class="text-[11px] text-slate-500 mt-0.5 tabular-nums">Present: <strong class="text-emerald-600">{{ s.presentCount }}</strong> · Absent: <strong class="text-rose-600">{{ s.absentCount }}</strong></p>
                      </div>
                      <span class="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-semibold text-[11px] self-start sm:self-auto whitespace-nowrap shrink-0">Completed</span>
                    </div>
                  } @empty {
                    <p class="text-xs text-slate-400 italic py-6 text-center">No attendance sessions recorded yet for this subject.</p>
                  }
                </div>
              </div>
            }

            @case ('assignments') {
              <div class="space-y-4">
                <div class="flex items-center justify-between flex-wrap gap-2">
                  <h3 class="font-extrabold text-slate-900 text-sm">Active Assignments</h3>
                  <router-link routerLink="/faculty/assignments" class="text-xs font-semibold text-indigo-600 hover:underline whitespace-nowrap">Manage Assignments →</router-link>
                </div>
                <div class="space-y-3">
                  @for (a of classAssignments(); track a.id) {
                    <div class="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div class="min-w-0">
                        <p class="font-bold text-xs text-slate-900">{{ a.title }}</p>
                        <p class="text-[11px] text-slate-500 mt-0.5 tabular-nums">Due: {{ a.dueDate }} · Max Marks: {{ a.maxMarks }}</p>
                      </div>
                      <span class="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-semibold text-[11px] self-start sm:self-auto whitespace-nowrap shrink-0">Active</span>
                    </div>
                  } @empty {
                    <p class="text-xs text-slate-400 italic py-6 text-center">No assignments posted for this class yet.</p>
                  }
                </div>
              </div>
            }

            @case ('results') {
              <div class="space-y-4">
                <div class="flex items-center justify-between flex-wrap gap-2">
                  <h3 class="font-extrabold text-slate-900 text-sm">Examinations & Result Summaries</h3>
                  <router-link routerLink="/faculty/results-marks" class="text-xs font-semibold text-indigo-600 hover:underline whitespace-nowrap">Enter / Publish Grades →</router-link>
                </div>
                <div class="space-y-3">
                  @for (ex of classExams(); track ex.id) {
                    <div class="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div class="min-w-0">
                        <p class="font-bold text-xs text-slate-900">{{ ex.title }} ({{ ex.type }})</p>
                        <p class="text-[11px] text-slate-500 mt-0.5 tabular-nums">Date: {{ ex.date }} · Max Marks: {{ ex.maxMarks }} · Passing: {{ ex.passingMarks }}</p>
                      </div>
                      <span class="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-semibold text-[11px] self-start sm:self-auto whitespace-nowrap shrink-0">{{ ex.status }}</span>
                    </div>
                  } @empty {
                    <p class="text-xs text-slate-400 italic py-6 text-center">No examinations scheduled for this subject yet.</p>
                  }
                </div>
              </div>
            }
          }
        </div>
      } @else {
        <div class="p-10 sm:p-16 bg-white rounded-xl text-center border border-slate-200/90">
          <p class="text-sm font-bold text-slate-700">Allocation not found.</p>
          <router-link routerLink="/faculty/my-classes" class="text-xs font-semibold text-indigo-600 mt-2 inline-block">← Back to My Classes</router-link>
        </div>
      }
    </div>
  `
})
export class FacultyClassDetailPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly academicService = inject(AcademicService);
  protected readonly studentsService = inject(StudentsService);
  protected readonly attendanceService = inject(AttendanceService);
  protected readonly assignmentsService = inject(AssignmentsService);
  protected readonly examinationsService = inject(ExaminationsService);

  protected readonly activeTab = signal<'students' | 'attendance' | 'assignments' | 'results'>('students');

  protected readonly tabs = [
    { id: 'students', label: 'Students Roster' },
    { id: 'attendance', label: 'Attendance Sessions' },
    { id: 'assignments', label: 'Assignments' },
    { id: 'results', label: 'Results & Exams' }
  ] as const;

  protected readonly allocationId = computed(() => this.route.snapshot.paramMap.get('allocationId'));

  protected readonly allocation = computed(() => {
    const id = this.allocationId();
    return this.academicService.subjectAllocations().find(a => a.id === id);
  });

  protected readonly classStudents = computed(() => {
    const alloc = this.allocation();
    if (!alloc) return [];
    return this.studentsService.students().filter(s => s.course === alloc.course && s.semester === alloc.semester);
  });

  protected readonly attendanceSessions = computed(() => {
    const alloc = this.allocation();
    if (!alloc) return [];
    // Mock sessions matching subject name
    return [
      { id: 'att-1', date: '2026-11-10', periodId: '09:00', presentCount: 52, absentCount: 6 },
      { id: 'att-2', date: '2026-11-08', periodId: '10:00', presentCount: 54, absentCount: 4 }
    ];
  });

  protected readonly classAssignments = computed(() => {
    const alloc = this.allocation();
    if (!alloc) return [];
    return this.assignmentsService.assignments().filter(a => a.subjectName.toLowerCase() === alloc.subject.toLowerCase());
  });

  protected readonly classExams = computed(() => {
    const alloc = this.allocation();
    if (!alloc) return [];
    return this.examinationsService.exams().filter(e => e.subjectName.toLowerCase() === alloc.subject.toLowerCase());
  });
}
