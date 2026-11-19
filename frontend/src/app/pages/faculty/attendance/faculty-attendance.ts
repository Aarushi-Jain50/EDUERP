import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { CurrentUserService } from '../../../services/current-user.service';
import { AcademicService } from '../../../services/academic.service';
import { StudentsService } from '../../../services/students.service';

interface StudentAttendanceRow {
  studentId: string;
  name: string;
  enrollmentNo: string;
  overallAttendance: number;
  status: 'Present' | 'Absent' | 'Leave';
}

@Component({
  selector: 'app-faculty-attendance',
  imports: [CommonModule, FormsModule, MatIconModule, PageHeader, StatStrip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-slate-800 pb-24">
      <app-page-header 
        title="Student Attendance Register" 
        subtitle="Mark daily attendance roll and review session history for your assigned classes." 
      />

      <div class="mb-6 sm:mb-8">
        <app-stat-strip [items]="stats()" />
      </div>

      <!-- Main Navigation Tabs -->
      <div class="flex items-center gap-2 border-b border-slate-200 overflow-x-auto scrollbar-none">
        <button 
          (click)="activeTab.set('mark')"
          [class]="activeTab() === 'mark' ? 'border-b-2 border-indigo-600 text-indigo-600 font-semibold bg-white' : 'text-slate-500 hover:text-slate-800 font-medium'"
          class="px-4 sm:px-5 py-3 text-xs transition-all cursor-pointer rounded-t-xl whitespace-nowrap shrink-0"
        >
          Mark Attendance
        </button>
        <button 
          (click)="activeTab.set('records')"
          [class]="activeTab() === 'records' ? 'border-b-2 border-indigo-600 text-indigo-600 font-semibold bg-white' : 'text-slate-500 hover:text-slate-800 font-medium'"
          class="px-4 sm:px-5 py-3 text-xs transition-all cursor-pointer rounded-t-xl whitespace-nowrap shrink-0"
        >
          My Attendance Records
        </button>
      </div>

      @if (activeTab() === 'mark') {
        <!-- Filter & Setup Bar -->
        <div class="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div class="space-y-1.5">
            <label for="att-class" class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Allocated Subject & Section <span class="text-rose-500">*</span></label>
            <select 
              id="att-class" 
              [(ngModel)]="selectedAllocationId"
              class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15"
            >
              <option value="">Select Class / Subject</option>
              @for (a of myAllocations(); track a.id) {
                <option [value]="a.id">{{ a.subject }} ({{ a.section }} - {{ a.semester }})</option>
              }
            </select>
          </div>

          <div class="space-y-1.5">
            <label for="att-date" class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Session Date <span class="text-rose-500">*</span></label>
            <input 
              id="att-date" 
              type="date" 
              [max]="todayDate"
              [(ngModel)]="sessionDate"
              class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>

          <div>
            <button 
              (click)="loadStudents()"
              class="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
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
                <span>Attendance for this subject, section and date is already submitted. You are editing existing records.</span>
              </div>
              <span class="font-bold self-start sm:self-auto whitespace-nowrap shrink-0">Edit Mode</span>
            </div>
          }

          <!-- Roster Table with Segmented Toggles -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <h3 class="font-extrabold text-slate-900 text-sm">Attendance Register Roster</h3>
                <p class="text-[11px] text-slate-500 mt-0.5">Total: <strong class="text-slate-800">{{ roster().length }}</strong> • Present: <strong class="text-emerald-600">{{ presentCount() }}</strong> • Absent: <strong class="text-rose-600">{{ absentCount() }}</strong></p>
              </div>

              <div class="flex items-center flex-wrap gap-2">
                <button 
                  (click)="markAll('Present')"
                  class="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                >
                  Mark All Present
                </button>
                <button 
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
                      <span [class]="row.overallAttendance < 75 ? 'bg-rose-50 text-rose-700 border border-rose-200/80' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'" class="px-2 py-0.5 rounded-md font-semibold text-[11px] tabular-nums whitespace-nowrap">
                        {{ row.overallAttendance }}%
                      </span>
                      @if (row.overallAttendance < 75) {
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
                      <td class="px-6 py-4 font-bold text-slate-900">
                        {{ row.name }}
                      </td>
                      <td class="px-6 py-4 font-mono text-slate-600">{{ row.enrollmentNo }}</td>
                      <td class="px-6 py-4 text-center">
                        <div class="inline-flex items-center gap-1.5">
                          <span [class]="row.overallAttendance < 75 ? 'bg-rose-50 text-rose-700 border border-rose-200/80' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'" class="px-2 py-0.5 rounded-md font-semibold text-[11px] tabular-nums">
                            {{ row.overallAttendance }}%
                          </span>
                          @if (row.overallAttendance < 75) {
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
              <span class="text-xs text-slate-600 font-medium">Changes ready to submit for <strong class="text-slate-900">{{ selectedAllocation()?.subject }}</strong></span>
              <button 
                (click)="saveAttendance()"
                class="w-full sm:w-auto justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <mat-icon class="text-sm shrink-0">save</mat-icon> Submit Attendance
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
          <h3 class="font-bold text-slate-900 text-sm">Submitted Attendance Sessions</h3>
          <div class="space-y-3">
            @for (rec of savedRecords(); track rec.id) {
              <div class="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div class="min-w-0">
                  <p class="font-bold text-xs text-slate-900">{{ rec.subject }} ({{ rec.section }})</p>
                  <p class="text-[11px] text-slate-500 mt-0.5 tabular-nums">Date: {{ rec.date }} · Present: <strong class="text-emerald-600">{{ rec.present }}</strong> · Absent: <strong class="text-rose-600">{{ rec.absent }}</strong></p>
                </div>
                <span class="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-semibold text-[11px] self-start sm:self-auto whitespace-nowrap shrink-0">Verified & Synced</span>
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
  protected readonly userService = inject(CurrentUserService);
  protected readonly academicService = inject(AcademicService);
  protected readonly studentsService = inject(StudentsService);

  protected readonly activeTab = signal<'mark' | 'records'>('mark');
  protected readonly selectedAllocationId = signal<string>('');
  protected readonly todayDate = new Date().toISOString().split('T')[0];
  protected sessionDate = this.todayDate;
  protected readonly isLoaded = signal<boolean>(false);
  protected readonly existingSessionWarning = signal<boolean>(false);

  protected readonly roster = signal<StudentAttendanceRow[]>([]);
  protected readonly savedRecords = signal<{ id: string; subject: string; section: string; date: string; present: number; absent: number }[]>([
    { id: 'rec-1', subject: 'Advanced Data Structures & Algorithms', section: 'Section A', date: '2026-11-10', present: 52, absent: 6 },
    { id: 'rec-2', subject: 'Advanced Data Structures & Algorithms', section: 'Section A', date: '2026-11-08', present: 54, absent: 4 }
  ]);

  protected readonly currentFaculty = this.userService.currentFaculty;

  protected readonly myAllocations = computed(() => {
    const fac = this.currentFaculty();
    return this.academicService.subjectAllocations().filter(a => a.faculty.toLowerCase().trim() === fac.name.toLowerCase().trim());
  });

  protected readonly selectedAllocation = computed(() => {
    return this.myAllocations().find(a => a.id === this.selectedAllocationId());
  });

  protected loadStudents(): void {
    const alloc = this.selectedAllocation();
    if (!alloc) {
      this.studentsService.showToast('error', 'Please select a valid allocated class.');
      return;
    }

    const students = this.studentsService.students().filter(s => s.course === alloc.course && s.semester === alloc.semester);
    const rows: StudentAttendanceRow[] = students.map((s, idx) => ({
      studentId: s.id,
      name: s.name,
      enrollmentNo: s.enrollmentNo,
      overallAttendance: 74 + (idx * 3) % 20,
      status: 'Present'
    }));

    this.roster.set(rows);
    this.isLoaded.set(true);
    // Simulate check if session already exists for today
    this.existingSessionWarning.set(this.sessionDate === '2026-11-10');
  }

  protected setStatus(studentId: string, status: 'Present' | 'Absent' | 'Leave'): void {
    this.roster.update(list => list.map(r => r.studentId === studentId ? { ...r, status } : r));
  }

  protected markAll(status: 'Present' | 'Absent' | 'Leave'): void {
    this.roster.update(list => list.map(r => ({ ...r, status })));
  }

  protected resetRoster(): void {
    this.markAll('Present');
  }

  protected readonly presentCount = computed(() => this.roster().filter(r => r.status === 'Present').length);
  protected readonly absentCount = computed(() => this.roster().filter(r => r.status === 'Absent').length);

  protected saveAttendance(): void {
    const alloc = this.selectedAllocation();
    if (!alloc) return;

    const present = this.presentCount();
    const absent = this.absentCount();

    this.savedRecords.update(list => [
      {
        id: `rec-${Date.now()}`,
        subject: alloc.subject,
        section: alloc.section,
        date: this.sessionDate,
        present,
        absent
      },
      ...list
    ]);

    this.studentsService.showToast('success', `Attendance successfully submitted for ${alloc.subject} (${alloc.section}).`);
    this.activeTab.set('records');
  }

  protected readonly stats = computed<StatItem[]>(() => {
    return [
      { label: 'Total Allocated Classes', value: this.myAllocations().length, icon: 'class', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Sessions Logged', value: this.savedRecords().length, icon: 'how_to_reg', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' },
      { label: 'Attendance Compliance', value: '96.4%', icon: 'verified', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' }
    ];
  });
}
