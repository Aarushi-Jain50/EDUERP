import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { StudentsService } from '../../../services/students.service';
import { AttendanceService } from '../../../services/attendance.service';
import { AcademicService } from '../../../services/academic.service';
import { exportToPdf } from '../../../utils/export.helper';
import { FacultyPortalFacade } from '../shared/faculty-portal.facade';

interface StudentAttendanceRow {
  studentId: string;
  name: string;
  enrollmentNo: string;
  overallAttendance: number;
  status: 'Present' | 'Absent' | 'Leave';
}

@Component({
  selector: 'app-faculty-attendance',
  imports: [MatIconModule, PageHeader, StatStrip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-slate-800 pb-24">
      <app-page-header
        title="Student Attendance Register"
        subtitle="Mark daily attendance roll, sync directly with student & parent records, and export session PDFs."
        [actionLabel]="facultySessions().length > 0 ? 'Export Log PDF' : ''"
        actionIcon="picture_as_pdf"
        (actionClicked)="exportAttendanceLogPdf()"
      />

      <div class="mb-6 sm:mb-8">
        <app-stat-strip [items]="stats()" />
      </div>

      <!-- Main Navigation Tabs -->
      <div class="flex items-center gap-2 border-b border-slate-200 overflow-x-auto scrollbar-none">
        <button
          type="button"
          (click)="activeTab.set('mark')"
          [class]="activeTab() === 'mark' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-semibold bg-white' : 'text-slate-500 hover:text-slate-800 font-medium'"
          class="px-4 sm:px-5 py-3 text-xs transition-all cursor-pointer rounded-t-xl whitespace-nowrap shrink-0"
        >
          Mark Attendance
        </button>
        <button
          type="button"
          (click)="activeTab.set('records')"
          [class]="activeTab() === 'records' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-semibold bg-white' : 'text-slate-500 hover:text-slate-800 font-medium'"
          class="px-4 sm:px-5 py-3 text-xs transition-all cursor-pointer rounded-t-xl whitespace-nowrap shrink-0"
        >
          My Attendance Records ({{ facultySessions().length }})
        </button>
      </div>

      @if (activeTab() === 'mark') {
        <!-- Filter & Setup Bar -->
        <div class="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div class="space-y-1.5">
            <label for="att-class" class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Allocated Subject & Section <span class="text-rose-500">*</span></label>
            <select
              id="att-class"
              [value]="selectedAllocationId()"
              (change)="onAllocationChange($event)"
              class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#6D42E8] focus:ring-2 focus:ring-purple-500/15"
            >
              <option value="">Select Class / Subject</option>
              @for (cls of myClasses(); track cls.id) {
                <option [value]="cls.id">{{ cls.subject }} ({{ cls.section }} · {{ cls.semester }})</option>
              }
            </select>
          </div>

          <div class="space-y-1.5">
            <label for="att-date" class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Session Date <span class="text-rose-500">*</span></label>
            <input
              id="att-date"
              type="date"
              [max]="todayDate"
              [value]="sessionDate()"
              (change)="onDateChange($event)"
              class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#6D42E8] focus:ring-2 focus:ring-purple-500/15"
            />
          </div>

          <div>
            <button
              type="button"
              (click)="loadStudents()"
              class="w-full h-10 bg-[#6D42E8] hover:bg-[#5b34cc] text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <mat-icon class="text-sm shrink-0">filter_alt</mat-icon> Load Roster
            </button>
          </div>
        </div>

        @if (isLoaded()) {
          @if (existingSessionWarning()) {
            <div class="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="flex items-start sm:items-center gap-2 min-w-0">
                <mat-icon class="text-amber-600 text-base shrink-0">warning</mat-icon>
                <span>An attendance session already exists for this subject, section, and date. Existing marks have been pre-loaded.</span>
              </div>
              <span class="font-bold self-start sm:self-auto whitespace-nowrap shrink-0">Session Recorded</span>
            </div>
          }

          <!-- Roster Table with Segmented Toggles -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <h3 class="font-extrabold text-slate-900 text-sm">
                  Attendance Register Roster — {{ selectedClass()?.subject }} ({{ selectedClass()?.section }})
                </h3>
                <p class="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                  Total: <strong class="text-slate-800">{{ roster().length }}</strong> •
                  Present: <strong class="text-emerald-600">{{ presentCount() }}</strong> •
                  Absent: <strong class="text-rose-600">{{ absentCount() }}</strong> •
                  Leave: <strong class="text-amber-600">{{ leaveCount() }}</strong>
                </p>
              </div>

              <div class="flex items-center flex-wrap gap-2">
                <button
                  type="button"
                  (click)="markAll('Present')"
                  class="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  (click)="resetRoster()"
                  class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                >
                  Reset
                </button>
              </div>
            </div>

            <!-- Phone Card Roster (< sm) -->
            <div class="sm:hidden divide-y divide-slate-100">
              @for (row of roster(); track row.studentId) {
                <div class="p-4 space-y-3">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="font-bold text-slate-900 text-xs">{{ row.name }}</p>
                      <p class="font-mono text-[11px] text-slate-500 mt-0.5">{{ row.enrollmentNo }}</p>
                    </div>
                    <div class="inline-flex items-center gap-1.5 shrink-0">
                      <span
                        [class]="row.overallAttendance < facade.attendanceThreshold() ? 'bg-rose-50 text-rose-700 border border-rose-200/80' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'"
                        class="px-2 py-0.5 rounded-md font-semibold text-[11px] tabular-nums whitespace-nowrap"
                      >
                        {{ row.overallAttendance }}%
                      </span>
                      @if (row.overallAttendance < facade.attendanceThreshold()) {
                        <span class="px-1.5 py-0.5 rounded-md bg-rose-600 text-white font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">Low</span>
                      }
                    </div>
                  </div>

                  <div class="grid grid-cols-3 p-1 bg-slate-100 rounded-xl gap-1">
                    <button
                      type="button"
                      (click)="setStatus(row.studentId, 'Present')"
                      [class]="row.status === 'Present' ? 'bg-emerald-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'"
                      class="py-1.5 px-2 rounded-lg text-xs transition-all cursor-pointer text-center"
                    >
                      Present
                    </button>
                    <button
                      type="button"
                      (click)="setStatus(row.studentId, 'Absent')"
                      [class]="row.status === 'Absent' ? 'bg-rose-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'"
                      class="py-1.5 px-2 rounded-lg text-xs transition-all cursor-pointer text-center"
                    >
                      Absent
                    </button>
                    <button
                      type="button"
                      (click)="setStatus(row.studentId, 'Leave')"
                      [class]="row.status === 'Leave' ? 'bg-amber-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'"
                      class="py-1.5 px-2 rounded-lg text-xs transition-all cursor-pointer text-center"
                    >
                      Leave
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- Tablet/Desktop Table (sm+) -->
            <div class="hidden sm:block overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-100">
                    <th class="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Student Name</th>
                    <th class="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Enrollment No</th>
                    <th class="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px] text-center">Overall %</th>
                    <th class="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px] text-right">Attendance Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                  @for (row of roster(); track row.studentId) {
                    <tr class="hover:bg-slate-50/50">
                      <td class="px-6 py-4 font-bold text-slate-900">{{ row.name }}</td>
                      <td class="px-6 py-4 font-mono text-slate-600">{{ row.enrollmentNo }}</td>
                      <td class="px-6 py-4 text-center">
                        <div class="inline-flex items-center gap-1.5">
                          <span
                            [class]="row.overallAttendance < facade.attendanceThreshold() ? 'bg-rose-50 text-rose-700 border border-rose-200/80' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'"
                            class="px-2 py-0.5 rounded-md font-semibold text-[11px] tabular-nums"
                          >
                            {{ row.overallAttendance }}%
                          </span>
                          @if (row.overallAttendance < facade.attendanceThreshold()) {
                            <span class="px-1.5 py-0.5 rounded-md bg-rose-600 text-white font-bold text-[10px] uppercase tracking-wider">Low</span>
                          }
                        </div>
                      </td>
                      <td class="px-6 py-4 text-right">
                        <div class="inline-flex items-center p-1 bg-slate-100 rounded-xl gap-1">
                          <button
                            type="button"
                            (click)="setStatus(row.studentId, 'Present')"
                            [class]="row.status === 'Present' ? 'bg-emerald-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'"
                            class="px-3 py-1 rounded-lg text-xs transition-all cursor-pointer"
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            (click)="setStatus(row.studentId, 'Absent')"
                            [class]="row.status === 'Absent' ? 'bg-rose-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'"
                            class="px-3 py-1 rounded-lg text-xs transition-all cursor-pointer"
                          >
                            Absent
                          </button>
                          <button
                            type="button"
                            (click)="setStatus(row.studentId, 'Leave')"
                            [class]="row.status === 'Leave' ? 'bg-amber-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'"
                            class="px-3 py-1 rounded-lg text-xs transition-all cursor-pointer"
                          >
                            Leave
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Sticky Save Bar -->
            <div class="p-4 bg-slate-50 border-t border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky bottom-0 z-20">
              <span class="text-xs text-slate-600 font-medium">
                Ready to sync to live attendance register for <strong class="text-slate-900">{{ selectedClass()?.subject }}</strong>
              </span>
              <button
                type="button"
                (click)="saveAttendance()"
                [disabled]="roster().length === 0"
                class="w-full sm:w-auto justify-center bg-[#6D42E8] hover:bg-[#5b34cc] disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <mat-icon class="text-sm shrink-0">save</mat-icon>
                <span>Submit Attendance</span>
              </button>
            </div>
          </div>
        } @else {
          <div class="p-8 sm:p-16 bg-white rounded-xl border border-dashed border-slate-300 text-center">
            <mat-icon class="text-4xl text-slate-300 mb-2">how_to_reg</mat-icon>
            <p class="font-semibold text-sm text-slate-700">Select a class subject and session date above, then click Load Roster.</p>
          </div>
        }
      } @else {
        <!-- Records Tab -->
        <div class="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 sm:p-6 space-y-4">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <h3 class="font-bold text-slate-900 text-sm">Synced Attendance Sessions</h3>
            <span class="text-xs text-slate-500">{{ facultySessions().length }} recorded sessions</span>
          </div>
          <div class="space-y-3">
            @for (rec of facultySessions(); track rec.id) {
              <div class="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div class="min-w-0">
                  <p class="font-bold text-xs text-slate-900">{{ resolveSubjectName(rec.subjectId) }} · {{ resolveSectionName(rec.sectionId) }}</p>
                  <p class="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                    Date: {{ facade.formatShortDate(rec.date) }} ·
                    Present: <strong class="text-emerald-600">{{ rec.present }}</strong> ·
                    Absent: <strong class="text-rose-600">{{ rec.absent }}</strong> ·
                    Leave: <strong class="text-amber-600">{{ rec.leave }}</strong>
                  </p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span
                    class="px-2.5 py-1 rounded-md font-bold text-[11px] tabular-nums"
                    [class]="rec.percentage < facade.attendanceThreshold() ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'"
                  >
                    {{ rec.percentage }}%
                  </span>
                  <span class="px-2.5 py-1 rounded-md bg-purple-50 text-[#6D42E8] border border-purple-200/80 font-semibold text-[11px] whitespace-nowrap">
                    Synced
                  </span>
                </div>
              </div>
            } @empty {
              <p class="text-xs text-slate-400 italic py-12 text-center">No attendance sessions submitted yet.</p>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class FacultyAttendancePage {
  protected readonly facade = inject(FacultyPortalFacade);
  private readonly studentsService = inject(StudentsService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly academicService = inject(AcademicService);

  protected readonly myClasses = this.facade.myClasses;
  protected readonly facultySessions = this.facade.facultySessions;

  protected readonly activeTab = signal<'mark' | 'records'>('mark');
  protected readonly selectedAllocationId = signal<string>('');
  protected readonly todayDate = new Date().toISOString().split('T')[0];
  protected readonly sessionDate = signal<string>(this.todayDate);
  protected readonly isLoaded = signal<boolean>(false);
  protected readonly existingSessionWarning = signal<boolean>(false);
  protected readonly roster = signal<StudentAttendanceRow[]>([]);

  protected readonly selectedClass = computed(() =>
    this.myClasses().find(c => c.id === this.selectedAllocationId()) || null
  );

  protected onAllocationChange(event: Event): void {
    this.selectedAllocationId.set((event.target as HTMLSelectElement).value);
  }

  protected onDateChange(event: Event): void {
    this.sessionDate.set((event.target as HTMLInputElement).value);
  }

  protected loadStudents(): void {
    const cls = this.selectedClass();
    if (!cls) {
      this.studentsService.showToast('error', 'Please select a valid allocated class.');
      return;
    }

    const students = cls.students;
    const targetDate = this.sessionDate();
    const existingSession = this.attendanceService
      .sessions()
      .find(
        s =>
          s.subjectId === cls.subjectId &&
          s.sectionId === cls.sectionId &&
          s.date === targetDate
      );

    const summaryByStudentId = new Map(this.facade.myStudents().map(s => [s.student.id, s]));

    const rows: StudentAttendanceRow[] = students.map(s => {
      const stats = summaryByStudentId.get(s.id);
      const status = existingSession
        ? this.attendanceService.getStudentStatusForSession(existingSession.id, s.id)
        : 'Present';
      return {
        studentId: s.id,
        name: s.name,
        enrollmentNo: s.enrollmentNo,
        overallAttendance: stats ? stats.attendancePct : 100,
        status
      };
    });

    this.roster.set(rows);
    this.isLoaded.set(true);
    this.existingSessionWarning.set(Boolean(existingSession));
  }

  protected setStatus(studentId: string, status: 'Present' | 'Absent' | 'Leave'): void {
    this.roster.update(list => list.map(r => (r.studentId === studentId ? { ...r, status } : r)));
  }

  protected markAll(status: 'Present' | 'Absent' | 'Leave'): void {
    this.roster.update(list => list.map(r => ({ ...r, status })));
  }

  protected resetRoster(): void {
    this.markAll('Present');
  }

  protected readonly presentCount = computed(() => this.roster().filter(r => r.status === 'Present').length);
  protected readonly absentCount = computed(() => this.roster().filter(r => r.status === 'Absent').length);
  protected readonly leaveCount = computed(() => this.roster().filter(r => r.status === 'Leave').length);

  protected saveAttendance(): void {
    const cls = this.selectedClass();
    const currentRoster = this.roster();
    if (!cls || currentRoster.length === 0) return;

    // Push into shared AttendanceService so Student, Parent, Admin & Dashboard update live
    this.attendanceService.loadStudentsForMarking(cls.courseId, cls.semester, cls.sectionId);
    for (const row of currentRoster) {
      this.attendanceService.updateMarkingStatus(`mark-${row.studentId}`, row.status);
    }
    this.attendanceService.saveAttendance({
      date: this.sessionDate(),
      courseId: cls.courseId,
      semester: cls.semester,
      sectionId: cls.sectionId,
      subjectId: cls.subjectId
    });

    this.isLoaded.set(false);
    this.activeTab.set('records');
  }

  protected resolveSubjectName(subjectId: string): string {
    return this.academicService.subjects().find(s => s.id === subjectId)?.name || subjectId;
  }

  protected resolveSectionName(sectionId: string): string {
    return this.academicService.sections().find(s => s.id === sectionId)?.section || sectionId;
  }

  protected exportAttendanceLogPdf(): void {
    const fac = this.facade.currentFaculty();
    const sessions = this.facultySessions();
    const cols = ['Date', 'Subject', 'Section', 'Total', 'Present', 'Absent', 'Leave', 'Attendance %'];
    const rows = sessions.map(s => [
      this.facade.formatShortDate(s.date),
      this.resolveSubjectName(s.subjectId),
      this.resolveSectionName(s.sectionId),
      s.total,
      s.present,
      s.absent,
      s.leave,
      `${s.percentage}%`
    ]);

    exportToPdf(
      'Faculty Class Attendance Log',
      cols,
      rows.length > 0 ? rows : [['-', 'No sessions recorded', '-', 0, 0, 0, 0, '0%']],
      `${fac.employeeId.toLowerCase()}-attendance-log`,
      [
        `Faculty: ${fac.name} (${fac.employeeId}) | Department: ${fac.department}`,
        `Total Sessions: ${sessions.length} | Minimum Threshold: ${this.facade.attendanceThreshold()}%`
      ]
    );
  }

  protected readonly stats = computed<StatItem[]>(() => {
    const sessions = this.facultySessions();
    const avgPct =
      sessions.length > 0
        ? Math.round(sessions.reduce((acc, s) => acc + s.percentage, 0) / sessions.length)
        : 0;
    return [
      { label: 'Allocated Classes', value: this.myClasses().length, icon: 'class', iconColorClass: 'text-[#6D42E8]', iconBgClass: 'bg-purple-50 border-purple-100' },
      { label: 'Sessions Logged', value: sessions.length, icon: 'how_to_reg', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' },
      { label: 'Average Attendance', value: `${avgPct}%`, icon: 'verified', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' }
    ];
  });
}
