import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { CurrentUserService } from '../../../services/current-user.service';
import { AcademicService } from '../../../services/academic.service';
import { TimetableService } from '../../../services/timetable.service';
import { StudentsService } from '../../../services/students.service';

@Component({
  selector: 'app-faculty-my-classes',
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, PageHeader, StatStrip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 sm:space-y-8 font-sans text-slate-800 pb-16">
      <app-page-header 
        title="My Allocated Classes" 
        subtitle="View and manage assigned courses, sections, student rosters and attendance." 
      />

      <div class="mb-6 sm:mb-8">
        <app-stat-strip [items]="stats()" />
      </div>

      <!-- Toolbar / Filters -->
      <div class="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div class="flex items-center gap-3 w-full sm:w-auto sm:flex-1 sm:min-w-[240px]">
          <div class="relative w-full sm:max-w-sm">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <mat-icon class="text-sm">search</mat-icon>
            </span>
            <input 
              type="text" 
              [(ngModel)]="searchQuery"
              placeholder="Search by subject or course name..."
              class="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto">
          <select 
            [(ngModel)]="selectedSemester"
            class="w-full sm:w-auto h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15"
          >
            <option value="">All Semesters</option>
            <option value="Semester 2">Semester 2</option>
            <option value="Semester 4">Semester 4</option>
            <option value="Semester 6">Semester 6</option>
          </select>
        </div>
      </div>

      <!-- Classes Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        @for (cls of filteredClasses(); track cls.id) {
          <div class="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 sm:p-6 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between group min-w-0">
            <div class="space-y-3.5">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <span class="inline-block px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[11px] tracking-wide border border-indigo-200/80 whitespace-nowrap">
                    {{ cls.section }}
                  </span>
                  <h3 class="font-bold text-slate-900 text-sm mt-2 group-hover:text-indigo-600 transition-colors">
                    {{ cls.subject }}
                  </h3>
                </div>
                <span class="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center font-semibold text-xs text-slate-600 tabular-nums shrink-0">
                  {{ cls.weeklyHours }}h
                </span>
              </div>

              <p class="text-xs text-slate-500 font-medium">{{ cls.course }} · <strong class="text-slate-700">{{ cls.semester }}</strong></p>

              <!-- Metrics -->
              <div class="space-y-2.5 pt-2.5 border-t border-slate-100">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-500 font-medium">Enrolled Students</span>
                  <span class="font-bold text-slate-900 tabular-nums">{{ cls.studentsCount }}</span>
                </div>
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-slate-500 font-medium">Avg Attendance</span>
                    <span [class]="cls.avgAttendance < 75 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'" class="tabular-nums">
                      {{ cls.avgAttendance }}%
                    </span>
                  </div>
                  <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      [style.width.%]="cls.avgAttendance" 
                      [class]="cls.avgAttendance < 75 ? 'bg-rose-500' : 'bg-emerald-500'" 
                      class="h-full rounded-full transition-all"
                    ></div>
                  </div>
                </div>
              </div>

              <!-- Next Class Info -->
              <div class="p-3 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center gap-2.5 text-[11px] text-slate-600">
                <mat-icon class="text-sm text-indigo-600 shrink-0">schedule</mat-icon>
                <span class="min-w-0">Next: <strong class="text-slate-900">{{ cls.nextSession || 'No upcoming slot today' }}</strong></span>
              </div>
            </div>

            <!-- Card Actions -->
            <div class="pt-4 sm:pt-5 mt-4 border-t border-slate-100 flex items-center gap-2.5 sm:gap-3">
              <router-link 
                routerLink="/faculty/attendance" 
                class="flex-1 py-2 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/70 text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <mat-icon class="text-sm shrink-0">how_to_reg</mat-icon> Attendance
              </router-link>
              <router-link 
                [routerLink]="['/faculty/my-classes', cls.id]" 
                class="flex-1 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <span>Open</span>
                <mat-icon class="text-sm shrink-0">arrow_forward</mat-icon>
              </router-link>
            </div>
          </div>
        } @empty {
          <div class="col-span-full py-12 sm:py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-300 text-center">
            <mat-icon class="text-4xl text-slate-300 mb-2">class</mat-icon>
            <p class="font-bold text-sm text-slate-700">No classes allocated to your profile</p>
            <p class="text-xs text-slate-400 mt-1">Please check subject allocations or switch demo faculty profile.</p>
          </div>
        }
      </div>
    </div>
  `
})
export class FacultyMyClassesPage {
  protected readonly userService = inject(CurrentUserService);
  protected readonly academicService = inject(AcademicService);
  protected readonly timetableService = inject(TimetableService);
  protected readonly studentsService = inject(StudentsService);

  protected searchQuery = '';
  protected selectedSemester = '';

  protected readonly currentFaculty = this.userService.currentFaculty;

  protected readonly myAllocations = computed(() => {
    const fac = this.currentFaculty();
    const allocations = this.academicService.subjectAllocations();
    // Match by faculty name
    return allocations.filter(a => a.faculty.toLowerCase().trim() === fac.name.toLowerCase().trim());
  });

  protected readonly enrichedClasses = computed(() => {
    const allocations = this.myAllocations();
    const slots = this.timetableService.slots();
    const students = this.studentsService.students();

    return allocations.map((a, idx) => {
      // Find matching slots for this subject + section
      const matchedSlots = slots.filter(s => s.subjectName.toLowerCase() === a.subject.toLowerCase() && s.sectionId === (a.section === 'Section A' ? 'sec-1' : 'sec-2'));
      const nextSession = matchedSlots.length > 0 ? `${matchedSlots[0].day} @ ${matchedSlots[0].periodId} (${matchedSlots[0].room})` : 'Mon / Wed 09:00 (L-101)';

      // Mock or calculate enrolled student count
      const enrolledCount = students.filter(s => s.course === a.course && s.semester === a.semester).length || 55;
      const avgAtt = 78 + (idx * 3) % 18; // realistic percentage 78-95

      return {
        id: a.id,
        subject: a.subject,
        course: a.course,
        semester: a.semester,
        section: a.section,
        weeklyHours: a.weeklyHours,
        studentsCount: enrolledCount,
        avgAttendance: avgAtt,
        nextSession
      };
    });
  });

  protected readonly filteredClasses = computed(() => {
    let list = this.enrichedClasses();
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(c => c.subject.toLowerCase().includes(q) || c.course.toLowerCase().includes(q));
    }
    if (this.selectedSemester) {
      list = list.filter(c => c.semester === this.selectedSemester);
    }
    return list;
  });

  protected readonly stats = computed<StatItem[]>(() => {
    const cls = this.enrichedClasses();
    const totalStudents = cls.reduce((sum, c) => sum + c.studentsCount, 0);
    const overallAvg = cls.length > 0 ? Math.round(cls.reduce((sum, c) => sum + c.avgAttendance, 0) / cls.length) : 88;

    return [
      { label: 'Allocated Classes', value: cls.length, icon: 'class', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Total Students', value: totalStudents, icon: 'groups', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' },
      { label: 'Average Attendance', value: `${overallAvg}%`, icon: 'how_to_reg', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' }
    ];
  });
}
