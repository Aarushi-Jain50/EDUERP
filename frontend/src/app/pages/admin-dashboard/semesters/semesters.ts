import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AcademicService, SemesterRecord } from '../../../services/academic.service';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';

export interface SemesterRow extends SemesterRecord {
  displaySemester: string;
  formattedStartDate: string;
  formattedEndDate: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-semesters-page',
  imports: [
    FormsModule,
    PageHeader,
    StatStrip,
    DataToolbar,
    DataTable,
    FormDrawer,
    ConfirmDialog
  ],
  template: `
    <div class="flex flex-col gap-5 max-w-[1400px] mx-auto w-full font-sans">
      
      <!-- 1. Page Header -->
      <app-page-header
        title="Semesters"
        subtitle="Configure academic terms, duration windows, and active session alignments."
        actionLabel="Add Semester"
        (actionClicked)="openAddDrawer()"
      />

      <!-- 2. Stat Strip (Max 3 small cards) -->
      <app-stat-strip [items]="statItems()" />

      <!-- 3. Data Toolbar (Search + Course Filter + Academic Year Filter) -->
      <app-data-toolbar
        [searchValue]="searchQuery()"
        searchPlaceholder="Search by course or academic year..."
        [filter1Value]="selectedCourse()"
        [filter1Options]="courseFilterOptions()"
        [filter2Value]="selectedYear()"
        [filter2Options]="yearFilterOptions()"
        [hasActiveFilters]="hasActiveFilters()"
        (searchChange)="onSearchChange($event)"
        (filter1Change)="onCourseFilterChange($event)"
        (filter2Change)="onYearFilterChange($event)"
        (resetClicked)="resetFilters()"
      />

      <!-- 4. Data Table Card -->
      <app-data-table
        [columns]="tableColumns"
        [data]="filteredSemesters()"
        idKey="id"
        emptyIcon="layers"
        emptyTitle="No semesters found"
        emptyMessage="Try adjusting your course or academic year filters."
        emptyActionLabel="Clear filters"
        (emptyActionClicked)="resetFilters()"
        (viewClicked)="onViewRecord($event)"
        (editClicked)="onEditRecord($event)"
        (deleteClicked)="onDeleteRecord($event)"
      />

      <!-- Slide-in Form Drawer -->
      <app-form-drawer
        [isOpen]="isDrawerOpen()"
        [title]="drawerTitle()"
        [subtitle]="drawerSubtitle()"
        [saveLabel]="isViewOnly() ? 'Close' : (editingId() ? 'Update Semester' : 'Save Semester')"
        (closed)="closeDrawer()"
        (saved)="handleDrawerSave()"
      >
        <div class="space-y-4">
          @if (formError()) {
            <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <span class="material-icons text-base text-red-600 shrink-0">error_outline</span>
              <span>{{ formError() }}</span>
            </div>
          }

          <!-- Course Dropdown -->
          <div class="space-y-1.5">
            <label for="sem-course-select" class="block text-xs font-semibold text-slate-800">
              Course / Program <span class="text-red-500">*</span>
            </label>
            <select
              id="sem-course-select"
              [disabled]="isViewOnly()"
              [(ngModel)]="formCourse"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
              @for (c of courseList(); track c.id) {
                <option [value]="c.name">{{ c.name }} ({{ c.code }})</option>
              }
            </select>
          </div>

          <!-- Semester Number (1-8) -->
          <div class="space-y-1.5">
            <label for="sem-number-input" class="block text-xs font-semibold text-slate-800">
              Semester Number (1 to 8) <span class="text-red-500">*</span>
            </label>
            <input
              id="sem-number-input"
              type="number"
              min="1"
              max="8"
              [disabled]="isViewOnly()"
              [(ngModel)]="formSemesterNumber"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <!-- Academic Year Dropdown -->
          <div class="space-y-1.5">
            <label for="sem-year-select" class="block text-xs font-semibold text-slate-800">
              Academic Year <span class="text-red-500">*</span>
            </label>
            <select
              id="sem-year-select"
              [disabled]="isViewOnly()"
              [(ngModel)]="formAcademicYear"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
              @for (y of yearList(); track y.id) {
                <option [value]="y.year">{{ y.year }} ({{ y.status }})</option>
              }
            </select>
          </div>

          <!-- Start Date & End Date Row -->
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label for="sem-start-date" class="block text-xs font-semibold text-slate-800">
                Start Date <span class="text-red-500">*</span>
              </label>
              <input
                id="sem-start-date"
                type="date"
                [disabled]="isViewOnly()"
                [(ngModel)]="formStartDate"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <div class="space-y-1.5">
              <label for="sem-end-date" class="block text-xs font-semibold text-slate-800">
                End Date <span class="text-red-500">*</span>
              </label>
              <input
                id="sem-end-date"
                type="date"
                [disabled]="isViewOnly()"
                [(ngModel)]="formEndDate"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <!-- Status -->
          <div class="space-y-1.5">
            <label for="sem-status-select" class="block text-xs font-semibold text-slate-800">
              Status <span class="text-red-500">*</span>
            </label>
            <select
              id="sem-status-select"
              [disabled]="isViewOnly()"
              [(ngModel)]="formStatus"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="Active">Active</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
      </app-form-drawer>

      <!-- Delete Confirmation Dialog -->
      <app-confirm-dialog
        [isOpen]="isDeleteDialogOpen()"
        title="Delete Semester"
        [message]="deleteDialogMessage()"
        confirmLabel="Confirm Delete"
        (cancelled)="isDeleteDialogOpen.set(false)"
        (confirmed)="confirmDelete()"
      />

    </div>
  `
})
export class SemestersPage {
  private readonly academicService = inject(AcademicService);

  protected readonly searchQuery = signal<string>('');
  protected readonly selectedCourse = signal<string>('All');
  protected readonly selectedYear = signal<string>('All');

  protected readonly courseList = computed(() => this.academicService.courses());
  protected readonly yearList = computed(() => this.academicService.academicYears());

  protected readonly courseFilterOptions = computed<FilterOption[]>(() => {
    return [
      { label: 'Course: All', value: 'All' },
      ...this.courseList().map(c => ({ label: c.name, value: c.name }))
    ];
  });

  protected readonly yearFilterOptions = computed<FilterOption[]>(() => {
    return [
      { label: 'Year: All', value: 'All' },
      ...this.yearList().map(y => ({ label: y.year, value: y.year }))
    ];
  });

  protected readonly tableColumns: TableColumn[] = [
    { key: 'displaySemester', header: 'Semester', isBold: true },
    { key: 'course', header: 'Course Program' },
    { key: 'academicYear', header: 'Academic Year', isMono: true },
    { key: 'formattedStartDate', header: 'Start Date' },
    { key: 'formattedEndDate', header: 'End Date' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  protected readonly statItems = computed<StatItem[]>(() => {
    const list = this.academicService.semesters();
    const active = list.filter(s => s.status === 'Active').length;
    const upcoming = list.filter(s => s.status === 'Upcoming').length;
    return [
      {
        label: 'Total Semesters',
        value: list.length,
        subtext: 'Configured terms',
        icon: 'layers',
        iconBgClass: 'bg-indigo-50 border-indigo-100',
        iconColorClass: 'text-indigo-600'
      },
      {
        label: 'Active Semesters',
        value: active,
        subtext: 'Currently in session',
        icon: 'verified',
        iconBgClass: 'bg-emerald-50 border-emerald-100',
        iconColorClass: 'text-emerald-600'
      },
      {
        label: 'Upcoming Semesters',
        value: upcoming,
        subtext: 'Next academic rotation',
        icon: 'schedule',
        iconBgClass: 'bg-blue-50 border-blue-100',
        iconColorClass: 'text-blue-600'
      }
    ];
  });

  protected readonly filteredSemesters = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const course = this.selectedCourse();
    const year = this.selectedYear();
    const rawList = this.academicService.semesters();

    return rawList
      .filter(item => {
        if (course !== 'All' && item.course !== course) return false;
        if (year !== 'All' && item.academicYear !== year) return false;
        if (query) {
          const match = `${item.course} ${item.academicYear}`.toLowerCase();
          if (!match.includes(query)) return false;
        }
        return true;
      })
      .map(item => ({
        ...item,
        displaySemester: `Semester ${item.semesterNumber}`,
        formattedStartDate: this.formatDate(item.startDate),
        formattedEndDate: this.formatDate(item.endDate)
      }));
  });

  protected readonly hasActiveFilters = computed(() => {
    return (
      this.searchQuery().trim() !== '' ||
      this.selectedCourse() !== 'All' ||
      this.selectedYear() !== 'All'
    );
  });

  protected readonly isDrawerOpen = signal<boolean>(false);
  protected readonly isViewOnly = signal<boolean>(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formError = signal<string>('');

  protected formSemesterNumber = 1;
  protected formCourse = '';
  protected formAcademicYear = '';
  protected formStartDate = '';
  protected formEndDate = '';
  protected formStatus: 'Active' | 'Upcoming' | 'Completed' = 'Upcoming';

  protected readonly isDeleteDialogOpen = signal<boolean>(false);
  protected readonly deletingItem = signal<SemesterRow | null>(null);
  protected readonly deleteDialogMessage = computed(() => {
    const item = this.deletingItem();
    if (!item) return '';
    return `Are you sure you want to delete Semester ${item.semesterNumber} for ${item.course}?`;
  });

  protected readonly drawerTitle = computed(() => {
    if (this.isViewOnly()) return 'Semester Details';
    return this.editingId() ? 'Edit Semester' : 'Add Semester';
  });

  protected readonly drawerSubtitle = computed(() => {
    if (this.isViewOnly()) return 'View term duration and session mapping.';
    return 'Configure term number, course, and calendar dates.';
  });

  protected onSearchChange(val: string): void {
    this.searchQuery.set(val);
  }
  protected onCourseFilterChange(val: string): void {
    this.selectedCourse.set(val);
  }
  protected onYearFilterChange(val: string): void {
    this.selectedYear.set(val);
  }
  protected resetFilters(): void {
    this.searchQuery.set('');
    this.selectedCourse.set('All');
    this.selectedYear.set('All');
  }

  protected openAddDrawer(): void {
    this.isViewOnly.set(false);
    this.editingId.set(null);
    this.formError.set('');
    this.formSemesterNumber = 1;
    this.formCourse = this.courseList()[0]?.name || '';
    this.formAcademicYear = this.yearList()[0]?.year || '';
    this.formStartDate = '';
    this.formEndDate = '';
    this.formStatus = 'Upcoming';
    this.isDrawerOpen.set(true);
  }

  protected onViewRecord(item: SemesterRow): void {
    this.isViewOnly.set(true);
    this.editingId.set(item.id);
    this.formError.set('');
    this.formSemesterNumber = item.semesterNumber;
    this.formCourse = item.course;
    this.formAcademicYear = item.academicYear;
    this.formStartDate = item.startDate;
    this.formEndDate = item.endDate;
    this.formStatus = item.status;
    this.isDrawerOpen.set(true);
  }

  protected onEditRecord(item: SemesterRow): void {
    this.isViewOnly.set(false);
    this.editingId.set(item.id);
    this.formError.set('');
    this.formSemesterNumber = item.semesterNumber;
    this.formCourse = item.course;
    this.formAcademicYear = item.academicYear;
    this.formStartDate = item.startDate;
    this.formEndDate = item.endDate;
    this.formStatus = item.status;
    this.isDrawerOpen.set(true);
  }

  protected onDeleteRecord(item: SemesterRow): void {
    this.deletingItem.set(item);
    this.isDeleteDialogOpen.set(true);
  }

  protected closeDrawer(): void {
    this.isDrawerOpen.set(false);
    this.formError.set('');
  }

  protected handleDrawerSave(): void {
    if (this.isViewOnly()) {
      this.closeDrawer();
      return;
    }
    if (!this.formCourse || !this.formAcademicYear) {
      this.formError.set('Course and Academic Year are required.');
      return;
    }
    if (!this.formStartDate || !this.formEndDate) {
      this.formError.set('Start Date and End Date are required.');
      return;
    }

    const res = this.academicService.saveSemester(
      {
        semesterNumber: Number(this.formSemesterNumber) || 1,
        course: this.formCourse,
        academicYear: this.formAcademicYear,
        startDate: this.formStartDate,
        endDate: this.formEndDate,
        status: this.formStatus
      },
      this.editingId() || undefined
    );

    if (!res.success) {
      this.formError.set(res.error || 'Failed to save semester.');
      return;
    }
    this.closeDrawer();
  }

  protected confirmDelete(): void {
    const item = this.deletingItem();
    if (item) {
      this.academicService.deleteSemester(item.id);
    }
    this.isDeleteDialogOpen.set(false);
  }

  private formatDate(iso: string): string {
    if (!iso) return '-';
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  }
}
