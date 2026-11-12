import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { AttendanceService } from '../../../services/attendance.service';
import { AcademicService } from '../../../services/academic.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-attendance-page',
  imports: [CommonModule, FormsModule, PageHeader, StatStrip, DataTable],
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans">
      <app-page-header title="Attendance" subtitle="Manage student attendance sessions and academic records." />
      
      <!-- Tabs -->
      <div class="flex border-b border-[#E2E8F0]">
        <button 
          (click)="activeTab.set('mark')" 
          [class]="activeTab() === 'mark' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold' : 'text-slate-500 hover:text-slate-700'"
          class="px-6 py-3 text-sm transition-colors cursor-pointer"
        >
          Mark Attendance
        </button>
        <button 
          (click)="activeTab.set('records')" 
          [class]="activeTab() === 'records' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold' : 'text-slate-500 hover:text-slate-700'"
          class="px-6 py-3 text-sm transition-colors cursor-pointer"
        >
          Attendance Records
        </button>
      </div>

      @if (activeTab() === 'mark') {
        <!-- Mark Attendance View -->
        <div class="flex flex-col gap-6">
          <app-stat-strip [items]="markingStats()" />

          <div class="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-wrap items-end gap-4">
            <div class="flex-1 min-w-[180px] space-y-1.5">
              <label for="att-course" class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Course</label>
              <select id="att-course" [(ngModel)]="filters.courseId" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]">
                <option value="">Select Course</option>
                @for (c of academicService.courses(); track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
            </div>
            <div class="flex-1 min-w-[150px] space-y-1.5">
              <label for="att-semester" class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Semester</label>
              <select id="att-semester" [(ngModel)]="filters.semester" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]">
                <option value="">Select Semester</option>
                <option value="Semester 1">Semester 1</option>
                <option value="Semester 2">Semester 2</option>
                <option value="Semester 3">Semester 3</option>
                <option value="Semester 4">Semester 4</option>
              </select>
            </div>
            <div class="flex-1 min-w-[150px] space-y-1.5">
              <label for="att-section" class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Section</label>
              <select id="att-section" [(ngModel)]="filters.sectionId" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]">
                <option value="">Select Section</option>
                @for (s of academicService.sections(); track s.id) {
                  <option [value]="s.id">{{ s.section }}</option>
                }
              </select>
            </div>
            <div class="flex-1 min-w-[180px] space-y-1.5">
              <label for="att-subject" class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subject</label>
              <select id="att-subject" [(ngModel)]="filters.subjectId" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]">
                <option value="">Select Subject</option>
                @for (sub of academicService.subjects(); track sub.id) {
                  <option [value]="sub.id">{{ sub.name }} ({{ sub.code }})</option>
                }
              </select>
            </div>
            <div class="flex-1 min-w-[150px] space-y-1.5">
              <label for="att-date" class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</label>
              <input id="att-date" type="date" [(ngModel)]="filters.date" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]" />
            </div>
            <button 
              (click)="loadStudents()"
              class="h-10 px-6 bg-[#6D42E8] text-white rounded-lg text-xs font-bold hover:bg-[#5b35c9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              [disabled]="!canLoadStudents()"
            >
              Load Students
            </button>
          </div>

          <!-- Student List -->
          @if (attendanceService.markingList().length > 0) {
            <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden mb-20">
              <div class="p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50/50">
                <span class="text-xs font-bold text-slate-700">Student List ({{ attendanceService.markingList().length }} Students)</span>
                <div class="flex gap-2">
                  <button (click)="markAllPresent()" class="px-3 py-1.5 text-[11px] font-bold text-[#6D42E8] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer">
                    Mark All Present
                  </button>
                  <button (click)="resetMarking()" class="px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
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
                      <th class="px-6 py-3 border-b border-[#E2E8F0]">Overall %</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (r of attendanceService.markingList(); track r.id) {
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
                              (click)="updateStatus(r.id, 'Present')"
                              [class]="r.status === 'Present' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'"
                              class="px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer"
                            >
                              Present
                            </button>
                            <button 
                              (click)="updateStatus(r.id, 'Absent')"
                              [class]="r.status === 'Absent' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'"
                              class="px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer"
                            >
                              Absent
                            </button>
                            <button 
                              (click)="updateStatus(r.id, 'Leave')"
                              [class]="r.status === 'Leave' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'"
                              class="px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer"
                            >
                              Leave
                            </button>
                          </div>
                        </td>
                        <td class="px-6 py-4">
                          @let stats = attendanceService.getStudentAttendanceStats();
                          <div class="flex items-center gap-2">
                            <span class="text-xs font-medium" [class.text-rose-600]="stats.isLow">{{ stats.percentage }}%</span>
                            @if (stats.isLow) {
                              <span class="px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold border border-rose-100 uppercase tracking-tighter">Low</span>
                            }
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Sticky Bottom Bar -->
            <div class="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-[1200px] px-6 z-40">
              <div class="bg-[#1A1745] text-white p-4 rounded-2xl shadow-2xl border border-white/10 flex justify-between items-center">
                <div class="flex gap-6 items-center px-4">
                  <div class="flex flex-col">
                    <span class="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Marked Present</span>
                    <span class="text-xl font-black text-emerald-400">{{ markingStats()[1].value }}</span>
                  </div>
                  <div class="h-8 w-px bg-white/10"></div>
                  <div class="flex flex-col">
                    <span class="text-[10px] text-slate-400 uppercase font-bold tracking-widest text-right">Marked Absent</span>
                    <span class="text-xl font-black text-rose-400 text-right">{{ markingStats()[2].value }}</span>
                  </div>
                </div>
                <button 
                  (click)="saveAttendance()"
                  class="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/40 flex items-center gap-2 cursor-pointer"
                >
                  <span class="material-icons text-lg">save</span>
                  Save Attendance
                </button>
              </div>
            </div>
          } @else {
            <div class="bg-white rounded-2xl border border-dashed border-slate-300 p-20 flex flex-col items-center justify-center text-center">
              <div class="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4 border border-slate-100">
                <span class="material-icons text-4xl">how_to_reg</span>
              </div>
              <h3 class="text-lg font-bold text-slate-800">No students loaded</h3>
              <p class="text-slate-500 text-sm max-w-xs mt-1">Select the course, semester and section filters to start marking attendance.</p>
            </div>
          }
        </div>
      } @else {
        <!-- Attendance Records View -->
        <div class="flex flex-col gap-6">
          <app-stat-strip [items]="recordsStats()" />
          <app-data-table 
            [columns]="sessionColumns" 
            [data]="attendanceService.sessions()" 
            idKey="id"
            emptyIcon="history"
            emptyTitle="No attendance records"
            emptyMessage="History of all attendance sessions will appear here."
          />
        </div>
      }
    </div>
  `
})
export class AttendancePage {
  protected readonly attendanceService = inject(AttendanceService);
  protected readonly academicService = inject(AcademicService);
  
  protected readonly activeTab = signal<'mark' | 'records'>('mark');

  protected filters = {
    courseId: '',
    semester: '',
    sectionId: '',
    subjectId: '',
    date: new Date().toISOString().split('T')[0]
  };

  protected readonly markingStats = computed<StatItem[]>(() => {
    const list = this.attendanceService.markingList();
    const present = list.filter(r => r.status === 'Present').length;
    const absent = list.filter(r => r.status === 'Absent').length;
    return [
      { label: 'Total Students', value: list.length, icon: 'people', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
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
      { label: 'Avg Attendance', value: avgPercent, icon: 'analytics', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' },
      { label: 'Alerts (Low)', value: 0, icon: 'warning', iconColorClass: 'text-amber-600', iconBgClass: 'bg-amber-50 border-amber-100' }
    ];
  });

  protected readonly sessionColumns: TableColumn[] = [
    { key: 'date', header: 'Date', isBold: true },
    { key: 'courseName', header: 'Course' },
    { key: 'subjectName', header: 'Subject' },
    { key: 'present', header: 'Present' },
    { key: 'total', header: 'Total' },
    { key: 'percentage', header: 'Percentage', isBadge: true }
  ];

  canLoadStudents() {
    return this.filters.courseId && this.filters.semester && this.filters.sectionId && this.filters.subjectId;
  }

  loadStudents() {
    this.attendanceService.loadStudentsForMarking(
      this.filters.courseId,
      this.filters.semester,
      this.filters.sectionId
    );
  }

  updateStatus(id: string, status: 'Present' | 'Absent' | 'Leave') {
    this.attendanceService.updateMarkingStatus(id, status);
  }

  markAllPresent() {
    this.attendanceService.markAllPresent();
  }

  resetMarking() {
    this.attendanceService.resetMarking();
  }

  saveAttendance() {
    this.attendanceService.saveAttendance({
      date: this.filters.date,
      courseId: this.filters.courseId,
      semester: this.filters.semester,
      sectionId: this.filters.sectionId,
      subjectId: this.filters.subjectId
    });
    this.resetFilters();
  }

  private resetFilters() {
    // Only reset if needed, but usually we clear the list
    // the service saveAttendance already clears markingList
  }
}
