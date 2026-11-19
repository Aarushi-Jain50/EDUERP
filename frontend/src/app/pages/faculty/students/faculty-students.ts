import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { CurrentUserService } from '../../../services/current-user.service';
import { AcademicService } from '../../../services/academic.service';
import { StudentsService } from '../../../services/students.service';
import { Student } from '../../../models/student.model';

@Component({
  selector: 'app-faculty-students',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, PageHeader, StatStrip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-slate-800 pb-24">
      <app-page-header 
        title="My Allocated Students Roster" 
        subtitle="Review student engagement, attendance records, academic performance and risk status." 
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
              [(ngModel)]="searchQuery"
              placeholder="Search by student name or enrollment no..."
              class="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]"
            />
          </div>
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto">
          <select 
            [(ngModel)]="selectedRisk"
            class="w-full sm:w-auto h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-[#6D42E8]"
          >
            <option value="">All Risk Categories</option>
            <option value="At Risk">At Risk (<75% Att / <40% Marks)</option>
            <option value="Normal">Normal Standing</option>
          </select>
        </div>
      </div>

      <!-- Students Table / Mobile Cards -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <!-- Phone Card List (< sm) -->
        <div class="sm:hidden divide-y divide-slate-100">
          @for (stu of filteredStudents(); track stu.id; let idx = $index) {
            @let att = 74 + (idx * 5) % 25;
            @let marks = 62 + (idx * 4) % 35;
            @let isAtRisk = att < 75 || marks < 40;

            <div
              (click)="openStudentDetail(stu)"
              (keydown.enter)="openStudentDetail(stu)"
              tabindex="0"
              role="button"
              class="p-4 space-y-2.5 hover:bg-slate-50/70 transition-colors cursor-pointer"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-8 h-8 rounded-full bg-purple-100 text-[#6D42E8] font-black text-xs flex items-center justify-center shrink-0">
                    {{ stu.initials || 'ST' }}
                  </div>
                  <div class="min-w-0">
                    <p class="font-bold text-slate-900 text-xs truncate">{{ stu.name }}</p>
                    <p class="text-[11px] font-mono text-slate-500 truncate">{{ stu.enrollmentNo }}</p>
                  </div>
                </div>
                <span [class]="isAtRisk ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'" class="px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase whitespace-nowrap shrink-0">
                  {{ isAtRisk ? 'At Risk' : 'Normal' }}
                </span>
              </div>

              <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                <span class="min-w-0 truncate">{{ stu.course }} · Sem {{ stu.semester }}</span>
                <div class="flex items-center gap-2 shrink-0">
                  <span [class]="att < 75 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'" class="px-2 py-0.5 rounded-full font-black text-[10px] whitespace-nowrap">
                    {{ att }}% Att.
                  </span>
                  <span class="font-bold text-slate-900 tabular-nums whitespace-nowrap">{{ marks }}% Avg</span>
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
              @for (stu of filteredStudents(); track stu.id; let idx = $index) {
                @let att = 74 + (idx * 5) % 25;
                @let marks = 62 + (idx * 4) % 35;
                @let isAtRisk = att < 75 || marks < 40;

                <tr (click)="openStudentDetail(stu)" class="hover:bg-slate-50/50 transition-colors cursor-pointer">
                  <td class="px-6 py-4 font-bold text-slate-900 flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-purple-100 text-[#6D42E8] font-black text-xs flex items-center justify-center shrink-0">
                      {{ stu.initials || 'ST' }}
                    </div>
                    <div>
                      <p class="font-bold text-slate-900">{{ stu.name }}</p>
                      <p class="text-[10px] text-slate-500 font-normal">{{ stu.email }}</p>
                    </div>
                  </td>
                  <td class="px-6 py-4 font-mono text-slate-600">{{ stu.enrollmentNo }}</td>
                  <td class="px-6 py-4 text-slate-600">
                    <span class="font-bold block">{{ stu.course }}</span>
                    <span class="text-[10px] text-slate-400">Semester {{ stu.semester }}</span>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span [class]="att < 75 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'" class="px-2.5 py-1 rounded-full font-black text-[10px]">
                      {{ att }}%
                    </span>
                  </td>
                  <td class="px-6 py-4 text-center font-bold text-slate-900 tabular-nums">
                    {{ marks }}%
                  </td>
                  <td class="px-6 py-4 text-right">
                    <span [class]="isAtRisk ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'" class="px-2.5 py-1 rounded-full font-black text-[10px] uppercase">
                      {{ isAtRisk ? 'At Risk' : 'Normal' }}
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
      @if (isDetailOpen() && activeStudent()) {
        <div class="fixed inset-0 z-50 flex justify-end">
          <button type="button" aria-label="Close student detail drawer" (click)="isDetailOpen.set(false)" class="fixed inset-0 bg-black/50 w-full h-full border-0"></button>
          <div class="relative w-full max-w-lg bg-white h-full shadow-2xl z-10 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6">
            <div class="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-100 text-[#6D42E8] font-black text-base flex items-center justify-center shrink-0">
                  {{ activeStudent()?.initials }}
                </div>
                <div class="min-w-0">
                  <h3 class="font-extrabold text-slate-900 text-base truncate">{{ activeStudent()?.name }}</h3>
                  <p class="text-xs text-slate-500 font-mono truncate">{{ activeStudent()?.enrollmentNo }}</p>
                </div>
              </div>
              <button (click)="isDetailOpen.set(false)" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer shrink-0">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="space-y-4 text-xs">
              <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <p class="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Academic Details</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                  <div class="min-w-0">Course: <strong class="text-slate-900">{{ activeStudent()?.course }}</strong></div>
                  <div>Semester: <strong class="text-slate-900">Semester {{ activeStudent()?.semester }}</strong></div>
                  <div class="min-w-0 break-all">Email: <strong class="text-slate-900">{{ activeStudent()?.email }}</strong></div>
                  <div>Phone: <strong class="text-slate-900">{{ activeStudent()?.phone }}</strong></div>
                </div>
              </div>

              <div class="p-4 rounded-xl bg-purple-50/50 border border-purple-100 space-y-2">
                <p class="font-bold text-[#6D42E8] uppercase tracking-wider text-[10px]">Guardian Information</p>
                <p class="text-slate-700 font-medium">Guardian Name: <strong class="text-slate-900">Mr. & Mrs. Sharma</strong></p>
                <p class="text-slate-700 font-medium">Emergency Contact: <strong class="text-slate-900">+91 9811223344</strong></p>
              </div>

              <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <p class="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Subject-wise Performance Breakdown</p>
                <div class="space-y-2 pt-1">
                  <div class="flex justify-between items-center gap-2">
                    <span class="text-slate-600 min-w-0">Advanced Data Structures</span>
                    <span class="font-bold text-emerald-600 whitespace-nowrap shrink-0">88% (Grade A+)</span>
                  </div>
                  <div class="flex justify-between items-center gap-2">
                    <span class="text-slate-600 min-w-0">Enterprise Web Architecture</span>
                    <span class="font-bold text-emerald-600 whitespace-nowrap shrink-0">82% (Grade A)</span>
                  </div>
                  <div class="flex justify-between items-center gap-2">
                    <span class="text-slate-600 min-w-0">Cloud Computing & DevOps</span>
                    <span class="font-bold text-slate-800 whitespace-nowrap shrink-0">76% (Grade B+)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class FacultyStudentsPage {
  protected readonly userService = inject(CurrentUserService);
  protected readonly academicService = inject(AcademicService);
  protected readonly studentsService = inject(StudentsService);

  protected searchQuery = '';
  protected selectedRisk = '';

  protected readonly isDetailOpen = signal<boolean>(false);
  protected readonly activeStudent = signal<Student | null>(null);

  protected readonly currentFaculty = this.userService.currentFaculty;

  protected readonly myAllocations = computed(() => {
    const fac = this.currentFaculty();
    return this.academicService.subjectAllocations().filter(a => a.faculty.toLowerCase().trim() === fac.name.toLowerCase().trim());
  });

  protected readonly facultyStudents = computed(() => {
    const allocs = this.myAllocations();
    const courses = new Set(allocs.map(a => a.course));
    const allStudents = this.studentsService.students();
    return allStudents.filter(s => courses.has(s.course));
  });

  protected readonly filteredStudents = computed(() => {
    let list = this.facultyStudents();
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.enrollmentNo.toLowerCase().includes(q));
    }
    if (this.selectedRisk === 'At Risk') {
      list = list.filter((_, idx) => (74 + (idx * 5) % 25) < 75 || (62 + (idx * 4) % 35) < 40);
    }
    return list;
  });

  protected openStudentDetail(stu: Student): void {
    this.activeStudent.set(stu);
    this.isDetailOpen.set(true);
  }

  protected readonly stats = computed<StatItem[]>(() => {
    const list = this.facultyStudents();
    return [
      { label: 'Enrolled Students', value: list.length, icon: 'groups', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Low Attendance', value: 4, icon: 'warning', iconColorClass: 'text-amber-600', iconBgClass: 'bg-amber-50 border-amber-100' },
      { label: 'At-Risk Students', value: 2, icon: 'error', iconColorClass: 'text-rose-600', iconBgClass: 'bg-rose-50 border-rose-100' }
    ];
  });
}
