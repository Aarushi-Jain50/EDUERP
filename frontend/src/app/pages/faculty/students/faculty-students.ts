import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { exportToPdf } from '../../../utils/export.helper';
import { FacultyPortalFacade, FacultyStudentSummary } from '../shared/faculty-portal.facade';

@Component({
  selector: 'app-faculty-students',
  imports: [RouterLink, MatIconModule, PageHeader, StatStrip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-slate-800 pb-24">
      <app-page-header
        title="My Allocated Students Roster"
        subtitle="Review real-time attendance, exam performance, guardian contacts, and at-risk standing."
        [actionLabel]="filteredStudents().length > 0 ? 'Export Roster PDF' : ''"
        actionIcon="picture_as_pdf"
        (actionClicked)="exportStudentsPdf()"
      />

      <div class="mb-6 sm:mb-8">
        <app-stat-strip [items]="stats()" />
      </div>

      <!-- Toolbar / Filters -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div class="flex items-center gap-3 w-full sm:w-auto sm:flex-1 sm:min-w-[240px]">
          <div class="relative w-full sm:max-w-sm">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <mat-icon class="text-sm">search</mat-icon>
            </span>
            <input
              type="text"
              [value]="searchQuery()"
              (input)="onSearchInput($event)"
              placeholder="Search by student name or enrollment no..."
              aria-label="Search students"
              class="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]"
            />
          </div>
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto">
          <select
            [value]="selectedRisk()"
            (change)="onRiskChange($event)"
            aria-label="Filter by risk status"
            class="w-full sm:w-auto h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-[#6D42E8]"
          >
            <option value="">All Risk Categories</option>
            <option value="At Risk">At Risk (&lt; {{ facade.attendanceThreshold() }}% Att / &lt; 40% Marks)</option>
            <option value="Normal">Normal Standing</option>
          </select>
        </div>
      </div>

      <!-- Students Table / Mobile Cards -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <!-- Phone Card List (< sm) -->
        <div class="sm:hidden divide-y divide-slate-100">
          @for (item of filteredStudents(); track item.student.id) {
            <div
              (click)="openStudentDetail(item)"
              (keydown.enter)="openStudentDetail(item)"
              tabindex="0"
              role="button"
              class="p-4 space-y-2.5 hover:bg-slate-50/70 transition-colors cursor-pointer"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-8 h-8 rounded-full bg-purple-100 text-[#6D42E8] font-black text-xs flex items-center justify-center shrink-0">
                    {{ item.student.initials || 'ST' }}
                  </div>
                  <div class="min-w-0">
                    <p class="font-bold text-slate-900 text-xs truncate">{{ item.student.name }}</p>
                    <p class="text-[11px] font-mono text-slate-500 truncate">{{ item.student.enrollmentNo }}</p>
                  </div>
                </div>
                <span
                  [class]="item.isAtRisk ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'"
                  class="px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase whitespace-nowrap shrink-0"
                >
                  {{ item.isAtRisk ? 'At Risk' : 'Normal' }}
                </span>
              </div>

              <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                <span class="min-w-0 truncate">{{ item.student.course }} · {{ item.student.semester }}</span>
                <div class="flex items-center gap-2 shrink-0">
                  <span
                    [class]="item.isLowAttendance ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'"
                    class="px-2 py-0.5 rounded-full font-black text-[10px] whitespace-nowrap"
                  >
                    {{ item.attendancePct }}% Att.
                  </span>
                  <span class="font-bold text-slate-900 tabular-nums whitespace-nowrap">
                    {{ item.avgMarksPct !== null ? item.avgMarksPct + '% Avg' : 'No Marks' }}
                  </span>
                </div>
              </div>
            </div>
          } @empty {
            <div class="px-4 py-12 text-center text-slate-400 italic text-xs">
              No students found matching your criteria.
            </div>
          }
        </div>

        <!-- Tablet/Desktop Table (sm+) -->
        <div class="hidden sm:block overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-100">
                <th class="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Student Name & Email</th>
                <th class="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Enrollment No</th>
                <th class="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Course & Section</th>
                <th class="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px] text-center">Attendance %</th>
                <th class="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px] text-center">Avg Marks</th>
                <th class="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px] text-right">Academic Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              @for (item of filteredStudents(); track item.student.id) {
                <tr (click)="openStudentDetail(item)" class="hover:bg-slate-50/50 transition-colors cursor-pointer">
                  <td class="px-6 py-4 font-bold text-slate-900 flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-purple-100 text-[#6D42E8] font-black text-xs flex items-center justify-center shrink-0">
                      {{ item.student.initials || 'ST' }}
                    </div>
                    <div>
                      <p class="font-bold text-slate-900">{{ item.student.name }}</p>
                      <p class="text-[10px] text-slate-500 font-normal">{{ item.student.email }}</p>
                    </div>
                  </td>
                  <td class="px-6 py-4 font-mono text-slate-600">{{ item.student.enrollmentNo }}</td>
                  <td class="px-6 py-4 text-slate-600">
                    <span class="font-bold block">{{ item.student.course }}</span>
                    <span class="text-[10px] text-slate-400">{{ item.student.semester }} · {{ item.student.section }}</span>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span
                      [class]="item.isLowAttendance ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'"
                      class="px-2.5 py-1 rounded-full font-black text-[10px] tabular-nums"
                    >
                      {{ item.attendancePct }}%
                    </span>
                  </td>
                  <td class="px-6 py-4 text-center font-bold text-slate-900 tabular-nums">
                    {{ item.avgMarksPct !== null ? item.avgMarksPct + '%' : 'Pending' }}
                  </td>
                  <td class="px-6 py-4 text-right">
                    <span
                      [class]="item.isAtRisk ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'"
                      class="px-2.5 py-1 rounded-full font-black text-[10px] uppercase"
                    >
                      {{ item.isAtRisk ? 'At Risk' : 'Normal' }}
                    </span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="px-6 py-16 text-center text-slate-400 italic text-xs">
                    No students found matching your criteria.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Student Read-Only Summary Drawer -->
      @if (activeStudent(); as summary) {
        <div class="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close student detail drawer"
            (click)="activeStudent.set(null)"
            class="fixed inset-0 bg-black/50 w-full h-full border-0"
          ></button>
          <div class="relative w-full max-w-lg bg-white h-full shadow-2xl z-10 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6">
            <div class="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-100 text-[#6D42E8] font-black text-base flex items-center justify-center shrink-0">
                  {{ summary.student.initials }}
                </div>
                <div class="min-w-0">
                  <h3 class="font-extrabold text-slate-900 text-base truncate">{{ summary.student.name }}</h3>
                  <p class="text-xs text-slate-500 font-mono truncate">{{ summary.student.enrollmentNo }}</p>
                </div>
              </div>
              <button
                type="button"
                (click)="activeStudent.set(null)"
                aria-label="Close drawer"
                class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
              >
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="space-y-4 text-xs">
              <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <p class="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Academic Details</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                  <div class="min-w-0">Course: <strong class="text-slate-900">{{ summary.student.course }}</strong></div>
                  <div>Term: <strong class="text-slate-900">{{ summary.student.semester }} · {{ summary.student.section }}</strong></div>
                  <div class="min-w-0 break-all">Email: <strong class="text-slate-900">{{ summary.student.email }}</strong></div>
                  <div>Phone: <strong class="text-slate-900">{{ summary.student.phone }}</strong></div>
                  <div>Attendance: <strong [class]="summary.isLowAttendance ? 'text-rose-600' : 'text-emerald-700'">{{ summary.attendancePct }}% ({{ summary.attendedSessions }}/{{ summary.totalSessions }})</strong></div>
                  <div>Avg Marks: <strong class="text-slate-900">{{ summary.avgMarksPct !== null ? summary.avgMarksPct + '%' : 'Pending' }}</strong></div>
                </div>
              </div>

              <div class="p-4 rounded-xl bg-purple-50/50 border border-purple-100 space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="font-bold text-[#6D42E8] uppercase tracking-wider text-[10px]">Guardian Information</p>
                  <a
                    routerLink="/faculty/message-center"
                    (click)="activeStudent.set(null)"
                    class="text-[11px] font-semibold text-[#6D42E8] hover:underline"
                  >
                    Message Parent →
                  </a>
                </div>
                <p class="text-slate-700 font-medium">
                  Guardian Name: <strong class="text-slate-900">{{ summary.guardianName }}</strong> ({{ summary.guardianRelation }})
                </p>
                <p class="text-slate-700 font-medium">
                  Emergency Contact: <strong class="text-slate-900">{{ summary.guardianPhone }}</strong>
                </p>
              </div>

              <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <p class="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Published Examination Results</p>
                @if (summary.subjectResults.length > 0) {
                  <div class="space-y-2 pt-1">
                    @for (res of summary.subjectResults; track res.examTitle + res.subjectName) {
                      <div class="flex justify-between items-center gap-2">
                        <span class="text-slate-600 min-w-0 truncate">{{ res.subjectName }} ({{ res.examTitle }})</span>
                        <span class="font-bold text-slate-900 whitespace-nowrap shrink-0 tabular-nums">
                          {{ res.marksObtained }}/{{ res.maxMarks }} · {{ res.percentage }}% ({{ res.grade }})
                        </span>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="text-slate-400 italic py-2">No examination scores published yet.</p>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class FacultyStudentsPage {
  protected readonly facade = inject(FacultyPortalFacade);

  protected readonly searchQuery = signal<string>('');
  protected readonly selectedRisk = signal<string>('');
  protected readonly activeStudent = signal<FacultyStudentSummary | null>(null);

  protected onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected onRiskChange(event: Event): void {
    this.selectedRisk.set((event.target as HTMLSelectElement).value);
  }

  protected readonly filteredStudents = computed(() => {
    let list = this.facade.myStudents();
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(
        item =>
          item.student.name.toLowerCase().includes(q) ||
          item.student.enrollmentNo.toLowerCase().includes(q) ||
          item.student.course.toLowerCase().includes(q)
      );
    }
    if (this.selectedRisk() === 'At Risk') {
      list = list.filter(item => item.isAtRisk);
    } else if (this.selectedRisk() === 'Normal') {
      list = list.filter(item => !item.isAtRisk);
    }
    return list;
  });

  protected openStudentDetail(item: FacultyStudentSummary): void {
    this.activeStudent.set(item);
  }

  protected exportStudentsPdf(): void {
    const fac = this.facade.currentFaculty();
    const cols = ['Enrollment No', 'Student Name', 'Program & Section', 'Attendance %', 'Avg Marks', 'Standing'];
    const rows = this.filteredStudents().map(item => [
      item.student.enrollmentNo,
      item.student.name,
      `${item.student.course} (${item.student.section})`,
      `${item.attendancePct}%`,
      item.avgMarksPct !== null ? `${item.avgMarksPct}%` : '-',
      item.isAtRisk ? 'At Risk' : 'Normal'
    ]);

    exportToPdf(
      'Faculty Allocated Students Roster',
      cols,
      rows,
      `${fac.employeeId.toLowerCase()}-students-roster`,
      [
        `Faculty: ${fac.name} (${fac.employeeId}) | Department: ${fac.department}`,
        `Total Students: ${rows.length} | Threshold: ${this.facade.attendanceThreshold()}%`
      ]
    );
  }

  protected readonly stats = computed<StatItem[]>(() => {
    const list = this.facade.myStudents();
    const lowAtt = list.filter(s => s.isLowAttendance).length;
    const atRisk = list.filter(s => s.isAtRisk).length;
    return [
      { label: 'Enrolled Students', value: list.length, icon: 'groups', iconColorClass: 'text-[#6D42E8]', iconBgClass: 'bg-purple-50 border-purple-100' },
      { label: 'Low Attendance', value: lowAtt, icon: 'warning', iconColorClass: 'text-amber-600', iconBgClass: 'bg-amber-50 border-amber-100' },
      { label: 'At-Risk Students', value: atRisk, icon: 'error', iconColorClass: 'text-rose-600', iconBgClass: 'bg-rose-50 border-rose-100' }
    ];
  });
}
