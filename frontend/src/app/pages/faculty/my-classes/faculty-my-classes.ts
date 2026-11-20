import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { FacultyPortalFacade } from '../shared/faculty-portal.facade';

@Component({
  selector: 'app-faculty-my-classes',
  imports: [RouterLink, MatIconModule, PageHeader, StatStrip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 sm:space-y-8 font-sans text-slate-800 pb-16">
      <app-page-header
        title="My Allocated Classes"
        subtitle="View and manage assigned subjects, sections, enrolled rosters, and class attendance."
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
              [value]="searchQuery()"
              (input)="onSearchInput($event)"
              placeholder="Search by subject or course name..."
              aria-label="Search classes"
              class="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#6D42E8] focus:ring-2 focus:ring-purple-500/15"
            />
          </div>
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto">
          <select
            [value]="selectedSemester()"
            (change)="onSemesterChange($event)"
            aria-label="Filter by semester"
            class="w-full sm:w-auto h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-[#6D42E8] focus:ring-2 focus:ring-purple-500/15"
          >
            <option value="">All Semesters</option>
            @for (sem of semesterOptions(); track sem) {
              <option [value]="sem">{{ sem }}</option>
            }
          </select>
        </div>
      </div>

      <!-- Classes Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        @for (cls of filteredClasses(); track cls.id) {
          <div class="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 sm:p-6 hover:border-purple-300 hover:shadow-sm transition-all flex flex-col justify-between group min-w-0">
            <div class="space-y-3.5">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <span class="inline-block px-2 py-0.5 rounded-md bg-purple-50 text-[#6D42E8] font-semibold text-[11px] tracking-wide border border-purple-200/80 whitespace-nowrap">
                    {{ cls.section }} · {{ cls.subjectCode }}
                  </span>
                  <h3 class="font-bold text-slate-900 text-sm mt-2 group-hover:text-[#6D42E8] transition-colors">
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
                    <span
                      [class]="cls.sessionsCount > 0 && cls.avgAttendance < facade.attendanceThreshold() ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'"
                      class="tabular-nums"
                    >
                      {{ cls.sessionsCount > 0 ? cls.avgAttendance + '%' : 'No Logs' }}
                    </span>
                  </div>
                  <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      [style.width.%]="cls.avgAttendance"
                      [class]="cls.avgAttendance < facade.attendanceThreshold() ? 'bg-rose-500' : 'bg-[#6D42E8]'"
                      class="h-full rounded-full transition-all"
                    ></div>
                  </div>
                </div>
              </div>

              <!-- Next Class Info -->
              <div class="p-3 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center gap-2.5 text-[11px] text-slate-600">
                <mat-icon class="text-sm text-[#6D42E8] shrink-0">schedule</mat-icon>
                <span class="min-w-0 truncate">Slot: <strong class="text-slate-900">{{ cls.nextSession }}</strong></span>
              </div>
            </div>

            <!-- Card Actions -->
            <div class="pt-4 sm:pt-5 mt-4 border-t border-slate-100 flex items-center gap-2.5 sm:gap-3">
              <a
                routerLink="/faculty/attendance"
                class="flex-1 py-2 px-3 rounded-lg bg-purple-50 hover:bg-purple-100 text-[#6D42E8] border border-purple-200/70 text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <mat-icon class="text-sm shrink-0">how_to_reg</mat-icon>
                <span>Attendance</span>
              </a>
              <a
                [routerLink]="['/faculty/my-classes', cls.id]"
                class="flex-1 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <span>Open</span>
                <mat-icon class="text-sm shrink-0">arrow_forward</mat-icon>
              </a>
            </div>
          </div>
        } @empty {
          <div class="col-span-full py-12 sm:py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-300 text-center">
            <mat-icon class="text-4xl text-slate-300 mb-2">class</mat-icon>
            <p class="font-bold text-sm text-slate-700">No classes found matching your filters</p>
            <p class="text-xs text-slate-400 mt-1">Adjust search criteria or inspect subject allocations.</p>
          </div>
        }
      </div>
    </div>
  `
})
export class FacultyMyClassesPage {
  protected readonly facade = inject(FacultyPortalFacade);

  protected readonly searchQuery = signal<string>('');
  protected readonly selectedSemester = signal<string>('');

  protected onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected onSemesterChange(event: Event): void {
    this.selectedSemester.set((event.target as HTMLSelectElement).value);
  }

  protected readonly semesterOptions = computed(() =>
    Array.from(new Set(this.facade.myClasses().map(c => c.semester))).sort()
  );

  protected readonly filteredClasses = computed(() => {
    let list = this.facade.myClasses();
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(
        c =>
          c.subject.toLowerCase().includes(q) ||
          c.course.toLowerCase().includes(q) ||
          c.subjectCode.toLowerCase().includes(q)
      );
    }
    const sem = this.selectedSemester();
    if (sem) {
      list = list.filter(c => c.semester === sem);
    }
    return list;
  });

  protected readonly stats = computed<StatItem[]>(() => {
    const cls = this.facade.myClasses();
    const logged = cls.filter(c => c.sessionsCount > 0);
    const overallAvg =
      logged.length > 0
        ? Math.round(logged.reduce((sum, c) => sum + c.avgAttendance, 0) / logged.length)
        : 0;

    return [
      { label: 'Allocated Classes', value: cls.length, icon: 'class', iconColorClass: 'text-[#6D42E8]', iconBgClass: 'bg-purple-50 border-purple-100' },
      { label: 'Unique Students', value: this.facade.myStudents().length, icon: 'groups', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' },
      { label: 'Average Attendance', value: `${overallAvg}%`, icon: 'how_to_reg', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' }
    ];
  });
}
