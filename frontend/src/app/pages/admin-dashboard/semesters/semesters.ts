import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AcademicService, SemesterRecord } from '../../../services/academic.service';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn, TableCustomAction } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

export interface SemesterRow extends SemesterRecord {
  displaySemester: string;
  formattedStartDate: string;
  formattedEndDate: string;
  examWindowLabel: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-semesters-page',
  imports: [
    ReactiveFormsModule,
    PageHeader,
    StatStrip,
    DataToolbar,
    DataTable,
    FormDrawer,
    ConfirmDialog
  ],
  template: `
    <div class="flex flex-col gap-5 max-w-[1400px] mx-auto w-full font-sans">

      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <app-page-header
          class="flex-1"
          title="Semesters"
          subtitle="Configure academic terms, registration windows, examination periods, and progression status."
          actionLabel="Add Semester"
          actionIcon="layers"
          (actionClicked)="openAddDrawer()"
        />
        <div class="flex items-center gap-2 shrink-0">
          <button type="button" (click)="exportExcel()" class="h-10 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-[#E2E8F0] rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5">
            <span class="material-icons text-sm text-emerald-600">table_view</span>
            <span>Excel</span>
          </button>
          <button type="button" (click)="exportPdf()" class="h-10 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-[#E2E8F0] rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5">
            <span class="material-icons text-sm text-rose-600">picture_as_pdf</span>
            <span>PDF</span>
          </button>
        </div>
      </div>

      <app-stat-strip [items]="statItems()" />

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

      <app-data-table
        [columns]="tableColumns"
        [data]="filteredSemesters()"
        idKey="id"
        [customActions]="customRowActions"
        emptyIcon="layers"
        emptyTitle="No semesters found"
        emptyMessage="Try adjusting your course or academic year filters."
        emptyActionLabel="Clear filters"
        (emptyActionClicked)="resetFilters()"
        (viewClicked)="onViewRecord($event)"
        (editClicked)="onEditRecord($event)"
        (deleteClicked)="onDeleteRecord($event)"
        (customActionClicked)="handleCustomAction($event)"
      />

      <app-form-drawer
        [isOpen]="isDrawerOpen()"
        [title]="drawerTitle()"
        [subtitle]="drawerSubtitle()"
        [saveLabel]="isViewOnly() ? 'Close' : (editingId() ? 'Update Semester' : 'Save Semester')"
        widthClass="max-w-[520px]"
        (closed)="closeDrawer()"
        (saved)="handleDrawerSave()"
      >
        <form [formGroup]="semForm" class="space-y-4">
          @if (formError()) {
            <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <span class="material-icons text-base text-red-600 shrink-0">error_outline</span>
              <span>{{ formError() }}</span>
            </div>
          }

          <div class="space-y-1.5">
            <label for="sem-course-select" class="block text-xs font-semibold text-slate-800">
              Course / Program <span class="text-red-500">*</span>
            </label>
            <select
              id="sem-course-select"
              formControlName="course"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 disabled:bg-slate-50"
            >
              @for (c of courseList(); track c.id) {
                <option [value]="c.name">{{ c.name }} ({{ c.code }})</option>
              }
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label for="sem-number-input" class="block text-xs font-semibold text-slate-800">
                Semester Number (1–8) <span class="text-red-500">*</span>
              </label>
              <input
                id="sem-number-input"
                type="number"
                min="1"
                max="8"
                formControlName="semesterNumber"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 disabled:bg-slate-50"
              />
            </div>

            <div class="space-y-1.5">
              <label for="sem-year-select" class="block text-xs font-semibold text-slate-800">
                Academic Year <span class="text-red-500">*</span>
              </label>
              <select
                id="sem-year-select"
                formControlName="academicYear"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 disabled:bg-slate-50"
              >
                @for (y of yearList(); track y.id) {
                  <option [value]="y.year">{{ y.year }} ({{ y.status }})</option>
                }
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label for="sem-start-date" class="block text-xs font-semibold text-slate-800">Term Start Date <span class="text-red-500">*</span></label>
              <input id="sem-start-date" type="date" formControlName="startDate" class="w-full px-3.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-xl text-slate-900 disabled:bg-slate-50" />
            </div>
            <div class="space-y-1.5">
              <label for="sem-end-date" class="block text-xs font-semibold text-slate-800">Term End Date <span class="text-red-500">*</span></label>
              <input id="sem-end-date" type="date" formControlName="endDate" class="w-full px-3.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-xl text-slate-900 disabled:bg-slate-50" />
            </div>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 class="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Registration & Examination Windows</h4>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label for="sem-reg-start" class="block text-[11px] font-semibold text-slate-700">Registration Start</label>
                <input id="sem-reg-start" type="date" formControlName="registrationStartDate" class="w-full px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-slate-900 disabled:bg-slate-100" />
              </div>
              <div class="space-y-1">
                <label for="sem-reg-end" class="block text-[11px] font-semibold text-slate-700">Registration End</label>
                <input id="sem-reg-end" type="date" formControlName="registrationEndDate" class="w-full px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-slate-900 disabled:bg-slate-100" />
              </div>
              <div class="space-y-1">
                <label for="sem-exam-start" class="block text-[11px] font-semibold text-slate-700">Exam Start</label>
                <input id="sem-exam-start" type="date" formControlName="examStartDate" class="w-full px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-slate-900 disabled:bg-slate-100" />
              </div>
              <div class="space-y-1">
                <label for="sem-exam-end" class="block text-[11px] font-semibold text-slate-700">Exam End</label>
                <input id="sem-exam-end" type="date" formControlName="examEndDate" class="w-full px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-slate-900 disabled:bg-slate-100" />
              </div>
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="sem-status-select" class="block text-xs font-semibold text-slate-800">Status</label>
            <select id="sem-status-select" formControlName="status" class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 disabled:bg-slate-50">
              <option value="Active">Active</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </form>
      </app-form-drawer>

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

  protected readonly courseFilterOptions = computed<FilterOption[]>(() => [
    { label: 'Course: All', value: 'All' },
    ...this.courseList().map(c => ({ label: c.name, value: c.name }))
  ]);

  protected readonly yearFilterOptions = computed<FilterOption[]>(() => [
    { label: 'Year: All', value: 'All' },
    ...this.yearList().map(y => ({ label: y.year, value: y.year }))
  ]);

  protected readonly tableColumns: TableColumn[] = [
    { key: 'displaySemester', header: 'Semester', isBold: true },
    { key: 'course', header: 'Course Program' },
    { key: 'academicYear', header: 'Academic Year', isMono: true },
    { key: 'formattedStartDate', header: 'Start Date' },
    { key: 'formattedEndDate', header: 'End Date' },
    { key: 'examWindowLabel', header: 'Exam Window' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  protected readonly customRowActions: TableCustomAction<SemesterRow>[] = [
    {
      id: 'advance',
      label: 'Advance Status',
      icon: 'fast_forward',
      showIf: row => row.status !== 'Completed'
    }
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

  protected readonly filteredSemesters = computed<SemesterRow[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const course = this.selectedCourse();
    const year = this.selectedYear();

    return this.academicService.semesters()
      .filter(item => {
        if (course !== 'All' && item.course !== course) return false;
        if (year !== 'All' && item.academicYear !== year) return false;
        if (query) {
          const match = `${item.course} ${item.academicYear} Semester ${item.semesterNumber}`.toLowerCase();
          if (!match.includes(query)) return false;
        }
        return true;
      })
      .map(item => ({
        ...item,
        displaySemester: `Semester ${item.semesterNumber}`,
        formattedStartDate: this.formatDate(item.startDate),
        formattedEndDate: this.formatDate(item.endDate),
        examWindowLabel:
          item.examStartDate && item.examEndDate
            ? `${this.formatDate(item.examStartDate)} – ${this.formatDate(item.examEndDate)}`
            : 'Not scheduled'
      }));
  });

  protected readonly hasActiveFilters = computed(() => {
    return this.searchQuery().trim() !== '' || this.selectedCourse() !== 'All' || this.selectedYear() !== 'All';
  });

  protected readonly isDrawerOpen = signal<boolean>(false);
  protected readonly isViewOnly = signal<boolean>(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formError = signal<string>('');

  protected readonly semForm = new FormGroup({
    semesterNumber: new FormControl(1, { nonNullable: true }),
    course: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    academicYear: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    startDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    registrationStartDate: new FormControl('', { nonNullable: true }),
    registrationEndDate: new FormControl('', { nonNullable: true }),
    examStartDate: new FormControl('', { nonNullable: true }),
    examEndDate: new FormControl('', { nonNullable: true }),
    status: new FormControl<'Active' | 'Upcoming' | 'Completed'>('Upcoming', { nonNullable: true })
  });

  protected readonly isDeleteDialogOpen = signal<boolean>(false);
  protected readonly deletingItem = signal<SemesterRow | null>(null);
  protected readonly deleteDialogMessage = computed(() => {
    const item = this.deletingItem();
    return item ? `Are you sure you want to delete Semester ${item.semesterNumber} for ${item.course}?` : '';
  });

  protected readonly drawerTitle = computed(() => {
    if (this.isViewOnly()) return 'Semester Details';
    return this.editingId() ? 'Edit Semester' : 'Add Semester';
  });

  protected readonly drawerSubtitle = computed(() => {
    if (this.isViewOnly()) return 'View term duration, registration window, and exam period.';
    return 'Configure term number, course, registration, and exam dates.';
  });

  protected onSearchChange(val: string): void { this.searchQuery.set(val); }
  protected onCourseFilterChange(val: string): void { this.selectedCourse.set(val); }
  protected onYearFilterChange(val: string): void { this.selectedYear.set(val); }
  protected resetFilters(): void {
    this.searchQuery.set('');
    this.selectedCourse.set('All');
    this.selectedYear.set('All');
  }

  private setFormDisabled(disabled: boolean): void {
    if (disabled) this.semForm.disable({ emitEvent: false });
    else this.semForm.enable({ emitEvent: false });
  }

  protected openAddDrawer(): void {
    this.isViewOnly.set(false);
    this.editingId.set(null);
    this.formError.set('');
    this.setFormDisabled(false);
    this.semForm.reset({
      semesterNumber: 1,
      course: this.courseList()[0]?.name || '',
      academicYear: this.yearList()[0]?.year || '',
      startDate: '',
      endDate: '',
      registrationStartDate: '',
      registrationEndDate: '',
      examStartDate: '',
      examEndDate: '',
      status: 'Upcoming'
    });
    this.isDrawerOpen.set(true);
  }

  protected onViewRecord(item: SemesterRow): void {
    this.isViewOnly.set(true);
    this.editingId.set(item.id);
    this.formError.set('');
    this.semForm.reset({
      semesterNumber: item.semesterNumber,
      course: item.course,
      academicYear: item.academicYear,
      startDate: item.startDate,
      endDate: item.endDate,
      registrationStartDate: item.registrationStartDate || '',
      registrationEndDate: item.registrationEndDate || '',
      examStartDate: item.examStartDate || '',
      examEndDate: item.examEndDate || '',
      status: item.status
    });
    this.setFormDisabled(true);
    this.isDrawerOpen.set(true);
  }

  protected onEditRecord(item: SemesterRow): void {
    this.isViewOnly.set(false);
    this.editingId.set(item.id);
    this.formError.set('');
    this.setFormDisabled(false);
    this.semForm.reset({
      semesterNumber: item.semesterNumber,
      course: item.course,
      academicYear: item.academicYear,
      startDate: item.startDate,
      endDate: item.endDate,
      registrationStartDate: item.registrationStartDate || '',
      registrationEndDate: item.registrationEndDate || '',
      examStartDate: item.examStartDate || '',
      examEndDate: item.examEndDate || '',
      status: item.status
    });
    this.isDrawerOpen.set(true);
  }

  protected onDeleteRecord(item: SemesterRow): void {
    this.deletingItem.set(item);
    this.isDeleteDialogOpen.set(true);
  }

  protected handleCustomAction(event: { actionId: string; row: SemesterRow }): void {
    if (event.actionId === 'advance') {
      const s = event.row;
      const nextStatus: 'Active' | 'Completed' = s.status === 'Upcoming' ? 'Active' : 'Completed';
      this.academicService.saveSemester(
        {
          semesterNumber: s.semesterNumber,
          course: s.course,
          academicYear: s.academicYear,
          startDate: s.startDate,
          endDate: s.endDate,
          registrationStartDate: s.registrationStartDate,
          registrationEndDate: s.registrationEndDate,
          examStartDate: s.examStartDate,
          examEndDate: s.examEndDate,
          status: nextStatus
        },
        s.id
      );
    }
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
    const val = this.semForm.getRawValue();
    if (!val.course || !val.academicYear || !val.startDate || !val.endDate) {
      this.formError.set('Course, Academic Year, Start Date, and End Date are required.');
      return;
    }

    const res = this.academicService.saveSemester(
      {
        semesterNumber: Number(val.semesterNumber) || 1,
        course: val.course,
        academicYear: val.academicYear,
        startDate: val.startDate,
        endDate: val.endDate,
        registrationStartDate: val.registrationStartDate || undefined,
        registrationEndDate: val.registrationEndDate || undefined,
        examStartDate: val.examStartDate || undefined,
        examEndDate: val.examEndDate || undefined,
        status: val.status
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
    if (item) this.academicService.deleteSemester(item.id);
    this.isDeleteDialogOpen.set(false);
  }

  protected exportExcel(): void {
    exportToExcel(
      this.filteredSemesters().map(s => ({
        Semester: s.displaySemester,
        Course: s.course,
        'Academic Year': s.academicYear,
        'Term Start': s.startDate,
        'Term End': s.endDate,
        'Exam Window': s.examWindowLabel,
        Status: s.status
      })),
      'EduERP_Semesters'
    );
  }

  protected exportPdf(): void {
    exportToPdf(
      'Semester Schedules & Examination Windows',
      ['Semester', 'Course', 'Academic Year', 'Term Dates', 'Exam Window', 'Status'],
      this.filteredSemesters().map(s => [
        s.displaySemester,
        s.course,
        s.academicYear,
        `${s.formattedStartDate} – ${s.formattedEndDate}`,
        s.examWindowLabel,
        s.status
      ]),
      'EduERP_Semesters'
    );
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
