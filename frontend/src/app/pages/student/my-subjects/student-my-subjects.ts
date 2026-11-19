import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { EmptyState } from '../../../components/shared/empty-state';
import { StudentPortalFacade, StudentSubjectDetail } from '../shared/student-portal.facade';

@Component({
  selector: 'app-student-my-subjects',
  imports: [RouterLink, MatIconModule, PageHeader, StatStrip, DataToolbar, FormDrawer, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-[#172554] text-[13px] pb-10 min-w-0">
      <app-page-header
        title="My Subjects"
        [subtitle]="'Enrolled subjects, credit load, and attendance status for ' + facade.currentStudent().course + ' (' + facade.currentStudent().semester + ').'"
      />

      <app-stat-strip [items]="stats()" />

      <app-data-toolbar
        searchPlaceholder="Search by subject code, title, or faculty..."
        [searchValue]="searchQuery()"
        (searchChange)="searchQuery.set($event)"
        [filter1Value]="typeFilter()"
        [filter1Options]="typeOptions"
        (filter1Change)="typeFilter.set($event)"
        [hasActiveFilters]="hasActiveFilters()"
        (resetClicked)="resetFilters()"
      />

      @if (filteredSubjects().length > 0) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          @for (sub of filteredSubjects(); track sub.id) {
            <button
              type="button"
              (click)="openDetail(sub)"
              class="text-left bg-white rounded-xl border border-[#E2E8F0] hover:border-[#6D42E8] shadow-sm p-4 sm:p-5 space-y-3.5 sm:space-y-4 transition-colors cursor-pointer min-w-0 flex flex-col justify-between"
            >
              <div class="space-y-3 w-full">
                <div class="flex items-center justify-between gap-2">
                  <span class="px-2 py-0.5 rounded-lg bg-slate-100 text-[#172554] font-mono text-[11px] font-semibold whitespace-nowrap shrink-0">
                    {{ sub.code }}
                  </span>
                  <span
                    class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap shrink-0"
                    [class]="typeBadgeClass(sub.type)"
                  >
                    {{ sub.type }}
                  </span>
                </div>

                <div>
                  <h2 class="text-[14px] font-bold text-[#172554] leading-snug line-clamp-2">{{ sub.name }}</h2>
                  <p class="text-xs text-[#64748B] mt-1.5 flex items-center gap-1.5 truncate">
                    <mat-icon class="text-sm text-[#6D42E8] shrink-0">person</mat-icon>
                    <span class="truncate">{{ sub.faculty }}</span>
                  </p>
                </div>
              </div>

              <div class="space-y-3 pt-3 border-t border-[#E2E8F0] w-full">
                <div class="flex items-center justify-between text-xs text-[#64748B]">
                  <span>{{ sub.credits }} Credits · {{ sub.weeklyHours }} hrs/wk</span>
                  <span
                    class="font-bold tabular-nums"
                    [class]="sub.isLowAttendance ? 'text-rose-600' : 'text-[#172554]'"
                  >
                    {{ sub.held > 0 ? sub.attendancePercentage + '%' : 'N/A' }}
                  </span>
                </div>

                <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all"
                    [style.width.%]="sub.held > 0 ? sub.attendancePercentage : 0"
                    [class]="sub.isLowAttendance ? 'bg-rose-500' : 'bg-[#6D42E8]'"
                  ></div>
                </div>

                <div class="flex items-center justify-between text-[11px]">
                  <span class="text-[#64748B]">
                    {{ sub.held > 0 ? 'Attended ' + sub.attended + '/' + sub.held + ' classes' : 'No classes recorded yet' }}
                  </span>
                  <span class="text-[#6D42E8] font-semibold inline-flex items-center gap-0.5">
                    <span>Details</span>
                    <mat-icon class="text-sm">chevron_right</mat-icon>
                  </span>
                </div>
              </div>
            </button>
          }
        </div>
      } @else {
        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
          <app-empty-state
            icon="menu_book"
            title="No subjects match your filters"
            message="Try clearing your search query or switching the subject type filter."
            [actionLabel]="hasActiveFilters() ? 'Reset Filters' : ''"
            (actionClicked)="resetFilters()"
          />
        </div>
      }

      <!-- Read-only Subject Detail Drawer -->
      <app-form-drawer
        [isOpen]="selectedSubject() !== null"
        [title]="selectedSubject()?.name || 'Subject Details'"
        [subtitle]="selectedSubject() ? selectedSubject()!.code + ' · ' + selectedSubject()!.type + ' · ' + selectedSubject()!.credits + ' Credits' : ''"
        [showSaveButton]="false"
        widthClass="max-w-full sm:max-w-[460px]"
        (closed)="selectedSubject.set(null)"
      >
        @if (selectedSubject(); as sub) {
          <div class="space-y-5 text-[13px] text-[#172554]">
            <!-- Core Info -->
            <div class="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
              <div class="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0]">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Faculty</p>
                <p class="font-semibold text-[#172554] mt-1">{{ sub.faculty }}</p>
              </div>
              <div class="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0]">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Weekly Hours</p>
                <p class="font-semibold text-[#172554] mt-1 tabular-nums">{{ sub.weeklyHours }} hrs / week</p>
              </div>
            </div>

            <!-- Attendance Progress -->
            <div class="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-[#172554]">Subject Attendance</span>
                <span
                  class="font-bold tabular-nums"
                  [class]="sub.isLowAttendance ? 'text-rose-600' : 'text-emerald-700'"
                >
                  {{ sub.held > 0 ? sub.attendancePercentage + '%' : 'Not Started' }}
                </span>
              </div>
              <div class="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full"
                  [style.width.%]="sub.held > 0 ? sub.attendancePercentage : 0"
                  [class]="sub.isLowAttendance ? 'bg-rose-500' : 'bg-[#6D42E8]'"
                ></div>
              </div>
              <p class="text-[11px] text-[#64748B]">
                {{ sub.held > 0 ? sub.attended + ' present out of ' + sub.held + ' held sessions (Threshold: ' + facade.attendanceThreshold() + '%)' : 'No attendance sessions logged yet.' }}
              </p>
            </div>

            <!-- Exam Results Notice (Results Tab Only) -->
            <div class="space-y-2">
              <h3 class="text-xs font-bold uppercase tracking-wider text-[#64748B]">Examination Results</h3>
              <div class="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-semibold text-xs text-[#172554]">
                    {{ sub.marksSoFar.length > 0 ? sub.marksSoFar.length + ' published result(s)' : 'No results announced yet' }}
                  </p>
                  <p class="text-[11px] text-[#64748B] mt-0.5">
                    Scores, grades, and SGPA are displayed exclusively in the Results tab.
                  </p>
                </div>
                <a
                  routerLink="/student/results"
                  (click)="selectedSubject.set(null)"
                  class="px-3 py-1.5 rounded-xl bg-white border border-purple-200 text-xs font-semibold text-[#6D42E8] hover:bg-purple-100/60 shrink-0 whitespace-nowrap"
                >
                  Open Results Tab
                </a>
              </div>
            </div>

            <!-- Upcoming Exams -->
            <div class="space-y-2">
              <h3 class="text-xs font-bold uppercase tracking-wider text-[#64748B]">Upcoming Exams</h3>
              @if (sub.upcomingExams.length > 0) {
                <div class="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl bg-white">
                  @for (ex of sub.upcomingExams; track ex.id) {
                    <div class="p-3 flex items-center justify-between gap-2">
                      <div class="min-w-0">
                        <p class="font-semibold text-[#172554] truncate">{{ ex.title }} ({{ ex.mode }})</p>
                        <p class="text-[11px] text-[#64748B]">{{ facade.formatShortDate(ex.date) }} at {{ ex.time }}</p>
                        <p class="text-[11px] text-[#6D42E8] font-medium mt-0.5">
                          Result announces: {{ facade.formatShortDate(ex.resultAnnouncementDate) }} at {{ ex.resultAnnouncementTime }}
                        </p>
                      </div>
                      <span class="text-xs font-semibold text-[#6D42E8] shrink-0">Max {{ ex.maxMarks }}</span>
                    </div>
                  }
                </div>
              } @else {
                <p class="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs text-[#64748B]">
                  No upcoming exams scheduled for this subject.
                </p>
              }
            </div>

            <!-- Pending Assignments -->
            <div class="space-y-2">
              <h3 class="text-xs font-bold uppercase tracking-wider text-[#64748B]">Pending Assignments</h3>
              @if (sub.pendingAssignments.length > 0) {
                <div class="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl bg-white">
                  @for (asg of sub.pendingAssignments; track asg.id) {
                    <a
                      [routerLink]="['/student/assignments', asg.id]"
                      (click)="selectedSubject.set(null)"
                      class="p-3 flex items-center justify-between gap-2 hover:bg-purple-50/50 transition-colors"
                    >
                      <div class="min-w-0">
                        <p class="font-semibold text-[#172554] truncate">{{ asg.title }}</p>
                        <p class="text-[11px] text-[#64748B]">{{ asg.dueText }}</p>
                      </div>
                      <div class="flex items-center gap-1.5 shrink-0">
                        <span
                          class="px-2 py-0.5 rounded-full text-[11px] font-semibold border"
                          [class]="asg.status === 'Overdue'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : asg.status === 'Draft'
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'"
                        >
                          {{ asg.status }}
                        </span>
                        <mat-icon class="text-sm text-[#6D42E8]">chevron_right</mat-icon>
                      </div>
                    </a>
                  }
                </div>
              } @else {
                <p class="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs text-[#64748B]">
                  All coursework for this subject is up to date.
                </p>
              }
            </div>
          </div>
        }
      </app-form-drawer>
    </div>
  `
})
export class StudentMySubjects {
  protected readonly facade = inject(StudentPortalFacade);

  protected readonly searchQuery = signal<string>('');
  protected readonly typeFilter = signal<string>('All');
  protected readonly selectedSubject = signal<StudentSubjectDetail | null>(null);

  protected readonly typeOptions: FilterOption[] = [
    { label: 'All Types', value: 'All' },
    { label: 'Theory', value: 'Theory' },
    { label: 'Practical', value: 'Practical' },
    { label: 'Elective', value: 'Elective' }
  ];

  protected readonly hasActiveFilters = computed(
    () => this.searchQuery().trim().length > 0 || this.typeFilter() !== 'All'
  );

  protected readonly filteredSubjects = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const type = this.typeFilter();
    return this.facade.studentSubjects().filter(sub => {
      const matchesType = type === 'All' || sub.type === type;
      const matchesQuery =
        !q ||
        sub.code.toLowerCase().includes(q) ||
        sub.name.toLowerCase().includes(q) ||
        sub.faculty.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  });

  protected readonly stats = computed<StatItem[]>(() => {
    const list = this.facade.studentSubjects();
    const totalCredits = list.reduce((acc, s) => acc + s.credits, 0);
    const overallAtt = this.facade.overallAttendanceSummary().percentage;
    return [
      {
        label: 'Subjects',
        value: list.length,
        subtext: this.facade.currentStudent().semester,
        icon: 'menu_book',
        iconColorClass: 'text-[#6D42E8]',
        iconBgClass: 'bg-purple-50 border-purple-100'
      },
      {
        label: 'Total Credits',
        value: totalCredits,
        subtext: 'Current semester load',
        icon: 'workspace_premium',
        iconColorClass: 'text-indigo-600',
        iconBgClass: 'bg-indigo-50 border-indigo-100'
      },
      {
        label: 'Avg Attendance',
        value: overallAtt + '%',
        subtext: 'Threshold ' + this.facade.attendanceThreshold() + '%',
        icon: 'how_to_reg',
        iconColorClass: overallAtt < this.facade.attendanceThreshold() ? 'text-rose-600' : 'text-emerald-600',
        iconBgClass: overallAtt < this.facade.attendanceThreshold() ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'
      }
    ];
  });

  protected openDetail(sub: StudentSubjectDetail): void {
    this.selectedSubject.set(sub);
  }

  protected resetFilters(): void {
    this.searchQuery.set('');
    this.typeFilter.set('All');
  }

  protected typeBadgeClass(type: string): string {
    switch (type) {
      case 'Theory':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Practical':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Elective':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  }
}
