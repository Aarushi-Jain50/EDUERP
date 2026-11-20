import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataTable, TableColumn, TableCustomAction } from '../../../components/shared/data-table';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { AttendanceRecord, AttendanceService, AttendanceSession, AttendanceStatus } from '../../../services/attendance.service';
import { AcademicService } from '../../../services/academic.service';
import { StudentFirebaseService } from '../../../services/student-firebase.service';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

interface SessionRow extends AttendanceSession {
  lockStatus: string;
  percentageLabel: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-attendance-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    PageHeader,
    StatStrip,
    DataTable,
    DataToolbar,
    FormDrawer,
    ConfirmDialog
  ],
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans">
      <app-page-header
        title="Attendance Control"
        subtitle="Mark daily sessions, audit historical registers, enforce locks, monitor <75% defaulters, and approve leave/OD requests."
        actionLabel="Export Attendance PDF"
        actionIcon="picture_as_pdf"
        (actionClicked)="exportSessionsPdf()"
      />

      <!-- Tabs -->
      <div class="flex flex-wrap border-b border-[#E2E8F0] gap-1">
        <button
          type="button"
          (click)="activeTab.set('mark')"
          [class]="activeTab() === 'mark' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold' : 'text-slate-500 hover:text-slate-700'"
          class="px-5 py-3 text-sm transition-colors cursor-pointer flex items-center gap-2"
        >
          <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">how_to_reg</mat-icon>
          Mark Session
        </button>
        <button
          type="button"
          (click)="activeTab.set('records')"
          [class]="activeTab() === 'records' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold' : 'text-slate-500 hover:text-slate-700'"
          class="px-5 py-3 text-sm transition-colors cursor-pointer flex items-center gap-2"
        >
          <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">history</mat-icon>
          Session Registers ({{ attendanceService.sessions().length }})
        </button>
        <button
          type="button"
          (click)="activeTab.set('defaulters')"
          [class]="activeTab() === 'defaulters' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold' : 'text-slate-500 hover:text-slate-700'"
          class="px-5 py-3 text-sm transition-colors cursor-pointer flex items-center gap-2"
        >
          <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">warning_amber</mat-icon>
          Low Attendance &lt;75% ({{ lowAttendanceList().length }})
        </button>
        <button
          type="button"
          (click)="activeTab.set('leaves')"
          [class]="activeTab() === 'leaves' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold' : 'text-slate-500 hover:text-slate-700'"
          class="px-5 py-3 text-sm transition-colors cursor-pointer flex items-center gap-2"
        >
          <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">event_busy</mat-icon>
          Leave / OD Requests ({{ pendingLeavesCount() }} Pending)
        </button>
      </div>

      @if (activeTab() === 'mark') {
        <div class="flex flex-col gap-6">
          <app-stat-strip [items]="markingStats()" />

          <form [formGroup]="markFilterForm" class="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-wrap items-end gap-4">
            <div class="flex-1 min-w-[180px] space-y-1.5">
              <label for="att-course" class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Course</label>
              <select id="att-course" formControlName="courseId" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]">
                <option value="">Select Course</option>
                @for (c of academicService.courses(); track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
            </div>
            <div class="flex-1 min-w-[140px] space-y-1.5">
              <label for="att-semester" class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Semester</label>
              <select id="att-semester" formControlName="semester" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]">
                <option value="">Select Semester</option>
                <option value="Semester 1">Semester 1</option>
                <option value="Semester 2">Semester 2</option>
                <option value="Semester 3">Semester 3</option>
                <option value="Semester 4">Semester 4</option>
              </select>
            </div>
            <div class="flex-1 min-w-[140px] space-y-1.5">
              <label for="att-section" class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Section</label>
              <select id="att-section" formControlName="sectionId" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]">
                <option value="">Select Section</option>
                @for (s of academicService.sections(); track s.id) {
                  <option [value]="s.id">{{ s.section }} ({{ s.course }})</option>
                }
              </select>
            </div>
            <div class="flex-1 min-w-[180px] space-y-1.5">
              <label for="att-subject" class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subject</label>
              <select id="att-subject" formControlName="subjectId" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]">
                <option value="">Select Subject</option>
                @for (sub of academicService.subjects(); track sub.id) {
                  <option [value]="sub.id">{{ sub.name }} ({{ sub.code }})</option>
                }
              </select>
            </div>
            <div class="flex-1 min-w-[140px] space-y-1.5">
              <label for="att-date" class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</label>
              <input id="att-date" type="date" formControlName="date" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]" />
            </div>
            <button
              type="button"
              (click)="loadStudents()"
              class="h-10 px-5 bg-[#6D42E8] text-white rounded-lg text-xs font-bold hover:bg-[#5b35c9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
              [disabled]="markFilterForm.invalid"
            >
              <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">group_add</mat-icon>
              Load Students
            </button>
          </form>

          @if (attendanceService.markingList().length > 0) {
            <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden mb-24">
              <div class="p-4 border-b border-[#E2E8F0] flex flex-wrap justify-between items-center gap-3 bg-slate-50/50">
                <span class="text-xs font-bold text-slate-700">Student Roster ({{ attendanceService.markingList().length }} Students)</span>
                <div class="flex items-center gap-3">
                  <label class="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" [checked]="lockOnSave()" (change)="toggleLockOnSave($event)" class="w-4 h-4 accent-[#6D42E8]" />
                    <span>Lock session on save</span>
                  </label>
                  <button type="button" (click)="markAllPresent()" class="px-3 py-1.5 text-[11px] font-bold text-[#6D42E8] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer">
                    Mark All Present
                  </button>
                  <button type="button" (click)="resetMarking()" class="px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
                    Reset
                  </button>
                </div>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th class="px-6 py-3 border-b border-[#E2E8F0]">Roll No</th>
                      <th class="px-6 py-3 border-b border-[#E2E8F0]">Student Name</th>
                      <th class="px-6 py-3 border-b border-[#E2E8F0]">Attendance Status</th>
                      <th class="px-6 py-3 border-b border-[#E2E8F0]">Cumulative %</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (r of attendanceService.markingList(); track r.id) {
                      @let stats = attendanceService.getStudentAttendanceStats(r.studentId);
                      <tr class="hover:bg-slate-50/50 transition-colors">
                        <td class="px-6 py-4 text-xs font-mono font-medium text-slate-600">{{ r.rollNo }}</td>
                        <td class="px-6 py-4">
                          <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-[#6D42E8] border border-[#E2E8F0]">
                              {{ r.initials }}
                            </div>
                            <span class="text-xs font-semibold text-slate-900">{{ r.studentName }}</span>
                          </div>
                        </td>
                        <td class="px-6 py-4">
                          <div class="flex items-center bg-slate-100 p-1 rounded-lg w-fit">
                            <button
                              type="button"
                              (click)="updateStatus(r.id, 'Present')"
                              [class]="r.status === 'Present' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'"
                              class="px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer"
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              (click)="updateStatus(r.id, 'Absent')"
                              [class]="r.status === 'Absent' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'"
                              class="px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer"
                            >
                              Absent
                            </button>
                            <button
                              type="button"
                              (click)="updateStatus(r.id, 'Leave')"
                              [class]="r.status === 'Leave' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'"
                              class="px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer"
                            >
                              Leave
                            </button>
                          </div>
                        </td>
                        <td class="px-6 py-4">
                          <div class="flex items-center gap-2">
                            <span class="text-xs font-semibold" [class.text-rose-600]="stats.isLow" [class.text-slate-700]="!stats.isLow">
                              {{ stats.percentage }}% ({{ stats.attended }}/{{ stats.total }})
                            </span>
                            @if (stats.isLow) {
                              <span class="px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold border border-rose-100 uppercase">Low</span>
                            }
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <div class="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-[1000px] px-6 z-40">
              <div class="bg-[#1A1745] text-white p-4 rounded-2xl shadow-2xl border border-white/10 flex justify-between items-center">
                <div class="flex gap-6 items-center px-4">
                  <div class="flex flex-col">
                    <span class="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Present</span>
                    <span class="text-xl font-black text-emerald-400">{{ markingStats()[1].value }}</span>
                  </div>
                  <div class="h-8 w-px bg-white/10"></div>
                  <div class="flex flex-col">
                    <span class="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Absent</span>
                    <span class="text-xl font-black text-rose-400">{{ markingStats()[2].value }}</span>
                  </div>
                </div>
                <button
                  type="button"
                  (click)="saveAttendance()"
                  class="bg-emerald-500 hover:bg-emerald-600 text-white px-7 py-2.5 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer text-xs"
                >
                  <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">save</mat-icon>
                  Save Attendance
                </button>
              </div>
            </div>
          } @else {
            <div class="bg-white rounded-2xl border border-dashed border-slate-300 p-16 flex flex-col items-center justify-center text-center">
              <div class="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-slate-100">
                <mat-icon class="!text-[36px] !w-[36px] !h-[36px]">how_to_reg</mat-icon>
              </div>
              <h3 class="text-lg font-bold text-slate-800">Select Class Filters to Load Roster</h3>
              <p class="text-slate-500 text-sm max-w-sm mt-1">Choose Course, Semester, Section, Subject and Date above to mark or update attendance.</p>
            </div>
          }
        </div>
      } @else if (activeTab() === 'records') {
        <div class="flex flex-col gap-6">
          <app-stat-strip [items]="recordsStats()" />

          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex-1 min-w-[260px]">
              <app-data-toolbar
                [searchValue]="searchQuery()"
                (searchChange)="searchQuery.set($event)"
                [filter1Value]="courseFilter()"
                [filter1Options]="courseOptions()"
                (filter1Change)="courseFilter.set($event)"
                searchPlaceholder="Search by subject, section, or date..."
              />
            </div>
            <button
              type="button"
              (click)="exportSessionsExcel()"
              class="h-10 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">download</mat-icon>
              Export Excel
            </button>
          </div>

          <app-data-table
            [columns]="sessionColumns"
            [data]="filteredSessions()"
            idKey="id"
            [hideEdit]="true"
            [customActions]="sessionCustomActions"
            (viewClicked)="openEditSession($event)"
            (deleteClicked)="confirmDeleteSession($event)"
            (customActionClicked)="onSessionCustomAction($event)"
            emptyIcon="history"
            emptyTitle="No attendance records"
            emptyMessage="Marked attendance sessions will appear here."
          />
        </div>
      } @else if (activeTab() === 'defaulters') {
        <div class="flex flex-col gap-5">
          <div class="bg-rose-50/70 border border-rose-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <mat-icon class="text-rose-600">report_problem</mat-icon>
              <div>
                <h3 class="text-sm font-bold text-slate-900">Academic Attendance Threshold Alert (&lt; 75%)</h3>
                <p class="text-xs text-slate-600">Students below 75% attendance require remediation notice before exam hall ticket clearance.</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="exportDefaultersExcel()"
                class="px-3.5 py-2 rounded-lg bg-white border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-50 cursor-pointer flex items-center gap-1.5"
              >
                <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">table_view</mat-icon>
                Excel
              </button>
              <button
                type="button"
                (click)="exportDefaultersPdf()"
                class="px-3.5 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer flex items-center gap-1.5"
              >
                <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">picture_as_pdf</mat-icon>
                Defaulter Notice PDF
              </button>
            </div>
          </div>

          <app-data-table
            [columns]="defaulterColumns"
            [data]="lowAttendanceList()"
            idKey="studentId"
            [hideEdit]="true"
            [hideDelete]="true"
            emptyIcon="verified"
            emptyTitle="No attendance defaulters"
            emptyMessage="All active students meet or exceed the 75% institutional attendance requirement."
          />
        </div>
      } @else {
        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Student Leave &amp; On-Duty Regularization Queue</h3>
              <p class="text-xs text-slate-500">Approved requests sync directly to the Student Portal leave tracker.</p>
            </div>
          </div>
          @if (studentFirebase.leaveRequests().length === 0) {
            <div class="p-12 text-center text-xs text-slate-500">No leave requests submitted.</div>
          } @else {
            <div class="divide-y divide-slate-100">
              @for (req of studentFirebase.leaveRequests(); track req.id) {
                <div class="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/50">
                  <div class="space-y-1 max-w-2xl">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-xs font-bold text-slate-900">{{ req.studentName }}</span>
                      <span class="text-[11px] font-mono text-slate-500">{{ req.enrollmentNo }}</span>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">{{ req.leaveType }}</span>
                      <span
                        [class]="req.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : req.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'"
                        class="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                      >
                        {{ req.status }}
                      </span>
                    </div>
                    <p class="text-xs text-slate-600">{{ req.reason }}</p>
                    <p class="text-[11px] text-slate-400">Dates: {{ req.fromDate }} to {{ req.toDate }}</p>
                  </div>
                  @if (req.status === 'Pending') {
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        (click)="reviewLeave(req.id, 'Rejected')"
                        class="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-50 cursor-pointer flex items-center gap-1"
                      >
                        <mat-icon class="!text-[15px] !w-[15px] !h-[15px]">close</mat-icon>
                        Reject
                      </button>
                      <button
                        type="button"
                        (click)="reviewLeave(req.id, 'Approved')"
                        class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer flex items-center gap-1"
                      >
                        <mat-icon class="!text-[15px] !w-[15px] !h-[15px]">check</mat-icon>
                        Approve OD / Leave
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Edit / View Session Register Drawer -->
      <app-form-drawer
        [isOpen]="editingSession() !== null"
        [title]="editingSession()?.locked ? 'Session Register (Locked)' : 'Edit Session Register'"
        [subtitle]="editingSessionSubtitle()"
        [saveLabel]="editingSession()?.locked ? 'Close' : 'Update Register'"
        [showSaveButton]="!(editingSession()?.locked)"
        widthClass="max-w-2xl"
        (closed)="editingSession.set(null)"
        (saved)="saveEditedSession()"
      >
        @if (editingSession(); as sess) {
          <div class="space-y-4 pt-2">
            @if (sess.locked) {
              <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">lock</mat-icon>
                <span>This session is locked. Unlock it from the table menu to edit student statuses.</span>
              </div>
            }
            <div class="border rounded-xl overflow-hidden divide-y divide-slate-100">
              @for (rec of editSessionRecords(); track rec.studentId) {
                <div class="p-3 flex items-center justify-between gap-3">
                  <div>
                    <p class="text-xs font-bold text-slate-900">{{ rec.studentName }}</p>
                    <p class="text-[11px] font-mono text-slate-500">{{ rec.rollNo }}</p>
                  </div>
                  <div class="flex items-center bg-slate-100 p-1 rounded-lg">
                    <button
                      type="button"
                      [disabled]="sess.locked"
                      (click)="setEditRecordStatus(rec.studentId, 'Present')"
                      [class]="rec.status === 'Present' ? 'bg-emerald-500 text-white' : 'text-slate-600'"
                      class="px-2.5 py-1 text-[10px] font-bold rounded cursor-pointer disabled:opacity-60"
                    >Present</button>
                    <button
                      type="button"
                      [disabled]="sess.locked"
                      (click)="setEditRecordStatus(rec.studentId, 'Absent')"
                      [class]="rec.status === 'Absent' ? 'bg-rose-500 text-white' : 'text-slate-600'"
                      class="px-2.5 py-1 text-[10px] font-bold rounded cursor-pointer disabled:opacity-60"
                    >Absent</button>
                    <button
                      type="button"
                      [disabled]="sess.locked"
                      (click)="setEditRecordStatus(rec.studentId, 'Leave')"
                      [class]="rec.status === 'Leave' ? 'bg-amber-500 text-white' : 'text-slate-600'"
                      class="px-2.5 py-1 text-[10px] font-bold rounded cursor-pointer disabled:opacity-60"
                    >Leave</button>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </app-form-drawer>

      <app-confirm-dialog
        [isOpen]="sessionToDelete() !== null"
        title="Delete Attendance Session"
        [message]="'Remove attendance session on ' + (sessionToDelete()?.date || '') + ' (' + (sessionToDelete()?.subjectName || '') + ')?'"
        confirmLabel="Delete Session"
        variant="danger"
        (cancelled)="sessionToDelete.set(null)"
        (confirmed)="confirmDeleteExecute()"
      />
    </div>
  `
})
export class AttendancePage {
  protected readonly attendanceService = inject(AttendanceService);
  protected readonly academicService = inject(AcademicService);
  protected readonly studentFirebase = inject(StudentFirebaseService);

  protected readonly activeTab = signal<'mark' | 'records' | 'defaulters' | 'leaves'>('mark');
  protected readonly lockOnSave = signal(false);
  protected readonly searchQuery = signal('');
  protected readonly courseFilter = signal('All');

  protected readonly editingSession = signal<AttendanceSession | null>(null);
  protected readonly editSessionRecords = signal<AttendanceRecord[]>([]);
  protected readonly sessionToDelete = signal<AttendanceSession | null>(null);

  protected readonly markFilterForm = new FormGroup({
    courseId: new FormControl('course-mca', Validators.required),
    semester: new FormControl('Semester 2', Validators.required),
    sectionId: new FormControl('sec-1', Validators.required),
    subjectId: new FormControl('sub-1', Validators.required),
    date: new FormControl(new Date().toISOString().split('T')[0], Validators.required)
  });

  protected readonly lowAttendanceList = computed(() => this.attendanceService.lowAttendanceStudents());
  protected readonly pendingLeavesCount = computed(
    () => this.studentFirebase.leaveRequests().filter(l => l.status === 'Pending').length
  );

  protected readonly courseOptions = computed<FilterOption[]>(() => [
    { label: 'Course: All', value: 'All' },
    ...this.academicService.courses().map(c => ({ label: c.name, value: c.id }))
  ]);

  protected readonly markingStats = computed<StatItem[]>(() => {
    const list = this.attendanceService.markingList();
    const present = list.filter(r => r.status === 'Present').length;
    const absent = list.filter(r => r.status === 'Absent').length;
    return [
      { label: 'Loaded Roster', value: list.length, icon: 'people', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Marked Present', value: present, icon: 'check_circle', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' },
      { label: 'Marked Absent', value: absent, icon: 'cancel', iconColorClass: 'text-rose-600', iconBgClass: 'bg-rose-50 border-rose-100' }
    ];
  });

  protected readonly recordsStats = computed<StatItem[]>(() => {
    const sessions = this.attendanceService.sessions();
    const avgPercent = sessions.length > 0
      ? Math.round(sessions.reduce((acc, s) => acc + s.percentage, 0) / sessions.length)
      : 0;
    return [
      { label: 'Total Sessions', value: sessions.length, icon: 'history', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Avg Attendance %', value: `${avgPercent}%`, icon: 'analytics', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' },
      { label: 'Low Attendance (<75%)', value: this.lowAttendanceList().length, icon: 'warning', iconColorClass: 'text-rose-600', iconBgClass: 'bg-rose-50 border-rose-100' }
    ];
  });

  protected readonly filteredSessions = computed<SessionRow[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const course = this.courseFilter();
    return this.attendanceService
      .sessions()
      .filter(s => {
        if (course !== 'All' && s.courseId !== course) return false;
        if (!q) return true;
        return (
          s.date.toLowerCase().includes(q) ||
          (s.subjectName || '').toLowerCase().includes(q) ||
          (s.sectionName || '').toLowerCase().includes(q) ||
          (s.courseName || '').toLowerCase().includes(q)
        );
      })
      .map(s => ({
        ...s,
        percentageLabel: `${s.percentage}%`,
        lockStatus: s.locked ? 'Locked' : 'Editable'
      }));
  });

  protected readonly sessionColumns: TableColumn[] = [
    { key: 'date', header: 'Date', isBold: true },
    { key: 'courseName', header: 'Course' },
    { key: 'subjectName', header: 'Subject' },
    { key: 'sectionName', header: 'Section' },
    { key: 'present', header: 'Present' },
    { key: 'total', header: 'Total' },
    { key: 'percentageLabel', header: 'Rate', isBadge: true },
    { key: 'lockStatus', header: 'Register', isBadge: true }
  ];

  protected readonly defaulterColumns: TableColumn[] = [
    { key: 'enrollmentNo', header: 'Roll No', isMono: true },
    { key: 'name', header: 'Student', isBold: true },
    { key: 'course', header: 'Course' },
    { key: 'section', header: 'Section' },
    { key: 'attended', header: 'Attended' },
    { key: 'totalSessions', header: 'Total Sessions' },
    { key: 'percentage', header: 'Attendance %', isBadge: true }
  ];

  protected readonly sessionCustomActions: TableCustomAction<SessionRow>[] = [
    { id: 'toggle-lock', label: 'Lock / Unlock Session', icon: 'lock' }
  ];

  toggleLockOnSave(event: Event): void {
    this.lockOnSave.set((event.target as HTMLInputElement).checked);
  }

  loadStudents(): void {
    const v = this.markFilterForm.getRawValue();
    if (!v.courseId || !v.semester || !v.sectionId || !v.subjectId) return;
    this.attendanceService.loadStudentsForMarking(v.courseId, v.semester, v.sectionId, v.date || undefined, v.subjectId);
  }

  updateStatus(id: string, status: AttendanceStatus): void {
    this.attendanceService.updateMarkingStatus(id, status);
  }

  markAllPresent(): void {
    this.attendanceService.markAllPresent();
  }

  resetMarking(): void {
    this.attendanceService.resetMarking();
  }

  saveAttendance(): void {
    const v = this.markFilterForm.getRawValue();
    this.attendanceService.saveAttendance({
      date: v.date || new Date().toISOString().split('T')[0],
      courseId: v.courseId || '',
      semester: v.semester || '',
      sectionId: v.sectionId || '',
      subjectId: v.subjectId || '',
      locked: this.lockOnSave()
    });
  }

  openEditSession(row: SessionRow): void {
    this.editingSession.set(row);
    this.editSessionRecords.set(this.attendanceService.loadSessionForEditing(row.id));
  }

  editingSessionSubtitle(): string {
    const s = this.editingSession();
    return s ? `${s.date} · ${s.subjectName || s.subjectId} (${s.sectionName || s.sectionId})` : '';
  }

  setEditRecordStatus(studentId: string, status: AttendanceStatus): void {
    this.editSessionRecords.update(list =>
      list.map(r => (r.studentId === studentId ? { ...r, status } : r))
    );
  }

  saveEditedSession(): void {
    const sess = this.editingSession();
    if (!sess || sess.locked) {
      this.editingSession.set(null);
      return;
    }
    const res = this.attendanceService.updateSessionRecords(sess.id, this.editSessionRecords());
    if (res.success) {
      this.editingSession.set(null);
    }
  }

  onSessionCustomAction(ev: { actionId: string; row: SessionRow }): void {
    if (ev.actionId === 'toggle-lock') {
      this.attendanceService.toggleSessionLock(ev.row.id);
    }
  }

  confirmDeleteSession(row: SessionRow): void {
    this.sessionToDelete.set(row);
  }

  confirmDeleteExecute(): void {
    const row = this.sessionToDelete();
    if (row) {
      this.attendanceService.deleteSession(row.id);
      this.sessionToDelete.set(null);
    }
  }

  async reviewLeave(id: string, decision: 'Approved' | 'Rejected'): Promise<void> {
    await this.studentFirebase.reviewLeaveRequest(id, decision);
  }

  exportSessionsExcel(): void {
    const rows = this.filteredSessions().map(s => ({
      Date: s.date,
      Course: s.courseName || s.courseId,
      Semester: s.semester,
      Section: s.sectionName || s.sectionId,
      Subject: s.subjectName || s.subjectId,
      Present: s.present,
      Absent: s.absent,
      Leave: s.leave,
      Total: s.total,
      Percentage: `${s.percentage}%`,
      Register: s.lockStatus
    }));
    exportToExcel(rows, 'eduerp-attendance-sessions');
  }

  exportSessionsPdf(): void {
    const cols = ['Date', 'Course', 'Subject', 'Section', 'Present', 'Total', 'Rate', 'State'];
    const rows = this.filteredSessions().map(s => [
      s.date,
      s.courseName || s.courseId,
      s.subjectName || s.subjectId,
      s.sectionName || s.sectionId,
      s.present,
      s.total,
      `${s.percentage}%`,
      s.lockStatus
    ]);
    exportToPdf('Institutional Attendance Register', cols, rows, 'eduerp-attendance-register');
  }

  exportDefaultersExcel(): void {
    const rows = this.lowAttendanceList().map(d => ({
      'Enrollment No': d.enrollmentNo,
      Student: d.name,
      Course: d.course,
      Semester: d.semester,
      Section: d.section,
      Attended: d.attended,
      'Total Sessions': d.totalSessions,
      'Attendance %': d.percentage,
      'Shortage %': d.shortagePct
    }));
    exportToExcel(rows, 'eduerp-attendance-defaulters');
  }

  exportDefaultersPdf(): void {
    const cols = ['Roll No', 'Student Name', 'Course', 'Section', 'Attended', 'Total', 'Attendance %', 'Shortage'];
    const rows = this.lowAttendanceList().map(d => [
      d.enrollmentNo,
      d.name,
      d.course,
      d.section,
      d.attended,
      d.totalSessions,
      `${d.percentage}%`,
      `-${d.shortagePct}%`
    ]);
    exportToPdf('Attendance Defaulters Notice (< 75%)', cols, rows, 'eduerp-attendance-defaulters');
  }
}
