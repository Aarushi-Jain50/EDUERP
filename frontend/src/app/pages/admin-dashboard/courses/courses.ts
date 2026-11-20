import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AcademicService, Course } from '../../../services/academic.service';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn, TableCustomAction } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

export interface CourseRow extends Course {
  displaySemesters: string;
  displayIntake: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-courses',
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
          title="Courses & Programs"
          subtitle="Configure degree programs, curriculum levels, eligibility criteria, semester splits, and sanctioned student intake."
          actionLabel="Add Course"
          actionIcon="menu_book"
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
        searchPlaceholder="Search by course name, code, or eligibility..."
        [filter1Value]="selectedDept()"
        [filter1Options]="departmentFilterOptions()"
        [filter2Value]="selectedLevel()"
        [filter2Options]="levelFilterOptions"
        [hasActiveFilters]="hasActiveFilters()"
        (searchChange)="onSearchChange($event)"
        (filter1Change)="onDeptFilterChange($event)"
        (filter2Change)="onLevelFilterChange($event)"
        (resetClicked)="resetFilters()"
      />

      <app-data-table
        [columns]="tableColumns"
        [data]="filteredCourses()"
        idKey="id"
        [customActions]="customRowActions"
        emptyIcon="menu_book"
        emptyTitle="No courses found"
        emptyMessage="Try adjusting your department or level filters."
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
        [saveLabel]="isViewOnly() ? 'Close' : (editingId() ? 'Update Course' : 'Save Course')"
        widthClass="max-w-[500px]"
        (closed)="closeDrawer()"
        (saved)="handleDrawerSave()"
      >
        <form [formGroup]="courseForm" class="space-y-4">
          @if (formError()) {
            <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <span class="material-icons text-base text-red-600 shrink-0">error_outline</span>
              <span>{{ formError() }}</span>
            </div>
          }

          <div class="space-y-1.5">
            <label for="course-name-input" class="block text-xs font-semibold text-slate-800">
              Course Name <span class="text-red-500">*</span>
            </label>
            <input
              id="course-name-input"
              type="text"
              formControlName="name"
              placeholder="e.g. Master of Computer Applications"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 placeholder-[#64748B] focus:outline-none focus:border-indigo-500 disabled:bg-slate-50"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label for="course-code-input" class="block text-xs font-semibold text-slate-800">
                Course Code <span class="text-red-500">*</span>
              </label>
              <input
                id="course-code-input"
                type="text"
                formControlName="code"
                placeholder="e.g. MCA-400"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 uppercase disabled:bg-slate-50"
              />
            </div>

            <div class="space-y-1.5">
              <label for="course-status-select" class="block text-xs font-semibold text-slate-800">Status</label>
              <select
                id="course-status-select"
                formControlName="status"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 disabled:bg-slate-50"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="course-dept-select" class="block text-xs font-semibold text-slate-800">
              Department <span class="text-red-500">*</span>
            </label>
            <select
              id="course-dept-select"
              formControlName="department"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 disabled:bg-slate-50"
            >
              @for (dept of departmentList(); track dept.id) {
                <option [value]="dept.name">{{ dept.name }} ({{ dept.code }})</option>
              }
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label for="course-level-select" class="block text-xs font-semibold text-slate-800">Program Level</label>
              <select
                id="course-level-select"
                formControlName="level"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 disabled:bg-slate-50"
              >
                <option value="UG">Undergraduate (UG)</option>
                <option value="PG">Postgraduate (PG)</option>
              </select>
            </div>

            <div class="space-y-1.5">
              <label for="course-duration-input" class="block text-xs font-semibold text-slate-800">Duration</label>
              <input
                id="course-duration-input"
                type="text"
                formControlName="duration"
                placeholder="e.g. 2 Years"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 disabled:bg-slate-50"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label for="course-semesters-input" class="block text-xs font-semibold text-slate-800">Total Semesters</label>
              <input
                id="course-semesters-input"
                type="number"
                min="1"
                max="12"
                formControlName="semesters"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 disabled:bg-slate-50"
              />
            </div>

            <div class="space-y-1.5">
              <label for="course-intake-input" class="block text-xs font-semibold text-slate-800">Sanctioned Intake</label>
              <input
                id="course-intake-input"
                type="number"
                min="10"
                max="500"
                formControlName="intake"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 disabled:bg-slate-50"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="course-eligibility-input" class="block text-xs font-semibold text-slate-800">Eligibility Criteria</label>
            <textarea
              id="course-eligibility-input"
              rows="2"
              formControlName="eligibilityCriteria"
              placeholder="e.g. BCA / B.Sc (CS/IT) with minimum 50% aggregate"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 resize-none disabled:bg-slate-50"
            ></textarea>
          </div>
        </form>
      </app-form-drawer>

      <app-confirm-dialog
        [isOpen]="isDeleteDialogOpen()"
        title="Delete Course"
        [message]="deleteDialogMessage()"
        confirmLabel="Confirm Delete"
        (cancelled)="isDeleteDialogOpen.set(false)"
        (confirmed)="confirmDelete()"
      />

    </div>
  `
})
export class CoursesPage {
  private readonly academicService = inject(AcademicService);

  protected readonly searchQuery = signal<string>('');
  protected readonly selectedDept = signal<string>('All');
  protected readonly selectedLevel = signal<string>('All');

  protected readonly departmentList = computed(() => this.academicService.departments());

  protected readonly departmentFilterOptions = computed<FilterOption[]>(() => [
    { label: 'Department: All', value: 'All' },
    ...this.academicService.departments().map(d => ({ label: d.name, value: d.name }))
  ]);

  protected readonly levelFilterOptions: FilterOption[] = [
    { label: 'Level: All', value: 'All' },
    { label: 'UG (Undergraduate)', value: 'UG' },
    { label: 'PG (Postgraduate)', value: 'PG' }
  ];

  protected readonly tableColumns: TableColumn[] = [
    { key: 'name', header: 'Course', isBold: true },
    { key: 'code', header: 'Code', isMono: true },
    { key: 'department', header: 'Department' },
    { key: 'level', header: 'Level', align: 'center' },
    { key: 'duration', header: 'Duration' },
    { key: 'displaySemesters', header: 'Semesters', align: 'center' },
    { key: 'displayIntake', header: 'Intake', align: 'center' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  protected readonly customRowActions: TableCustomAction<CourseRow>[] = [
    {
      id: 'toggle_status',
      label: 'Toggle Active Status',
      icon: 'sync'
    }
  ];

  protected readonly statItems = computed<StatItem[]>(() => {
    const stats = this.academicService.courseStats();
    return [
      {
        label: 'Total Courses',
        value: stats.total,
        subtext: 'Active programs in catalog',
        icon: 'menu_book',
        iconBgClass: 'bg-indigo-50 border-indigo-100',
        iconColorClass: 'text-indigo-600'
      },
      {
        label: 'Undergraduate (UG)',
        value: stats.ug,
        subtext: 'BCA, B.Tech, BBA, B.Com',
        icon: 'school',
        iconBgClass: 'bg-purple-50 border-purple-100',
        iconColorClass: 'text-[#6D42E8]'
      },
      {
        label: 'Postgraduate (PG)',
        value: stats.pg,
        subtext: 'MCA, M.Tech, MBA, M.Com',
        icon: 'workspace_premium',
        iconBgClass: 'bg-emerald-50 border-emerald-100',
        iconColorClass: 'text-emerald-600'
      }
    ];
  });

  protected readonly filteredCourses = computed<CourseRow[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const dept = this.selectedDept();
    const level = this.selectedLevel();

    return this.academicService.courses()
      .filter(item => {
        if (dept !== 'All' && item.department !== dept) return false;
        if (level !== 'All' && item.level !== level) return false;
        if (query) {
          const match = `${item.name} ${item.code} ${item.department} ${item.level} ${item.eligibilityCriteria || ''}`.toLowerCase();
          if (!match.includes(query)) return false;
        }
        return true;
      })
      .map(item => ({
        ...item,
        displaySemesters: `${item.semesters} Sems`,
        displayIntake: `${item.intake} Seats`
      }));
  });

  protected readonly hasActiveFilters = computed(() => {
    return this.searchQuery().trim() !== '' || this.selectedDept() !== 'All' || this.selectedLevel() !== 'All';
  });

  protected readonly isDrawerOpen = signal<boolean>(false);
  protected readonly isViewOnly = signal<boolean>(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formError = signal<string>('');

  protected readonly courseForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    code: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    department: new FormControl('Computer Applications', { nonNullable: true, validators: [Validators.required] }),
    level: new FormControl<'UG' | 'PG'>('PG', { nonNullable: true }),
    duration: new FormControl('2 Years', { nonNullable: true }),
    semesters: new FormControl(4, { nonNullable: true }),
    intake: new FormControl(60, { nonNullable: true }),
    eligibilityCriteria: new FormControl('', { nonNullable: true }),
    status: new FormControl<'Active' | 'Inactive'>('Active', { nonNullable: true })
  });

  protected readonly isDeleteDialogOpen = signal<boolean>(false);
  protected readonly deletingItem = signal<Course | null>(null);
  protected readonly deleteDialogMessage = computed(() => {
    const item = this.deletingItem();
    return item ? `Are you sure you want to delete ${item.name} (${item.code})?` : '';
  });

  protected readonly drawerTitle = computed(() => {
    if (this.isViewOnly()) return 'Course Program Details';
    return this.editingId() ? 'Edit Course Program' : 'Add Course Program';
  });

  protected readonly drawerSubtitle = computed(() => {
    if (this.isViewOnly()) return 'View curriculum breakdown, eligibility criteria, and intake specifications.';
    return 'Enter curriculum details, degree level, and intake capacity.';
  });

  protected onSearchChange(val: string): void { this.searchQuery.set(val); }
  protected onDeptFilterChange(val: string): void { this.selectedDept.set(val); }
  protected onLevelFilterChange(val: string): void { this.selectedLevel.set(val); }
  protected resetFilters(): void {
    this.searchQuery.set('');
    this.selectedDept.set('All');
    this.selectedLevel.set('All');
  }

  private setFormDisabled(disabled: boolean): void {
    if (disabled) this.courseForm.disable({ emitEvent: false });
    else this.courseForm.enable({ emitEvent: false });
  }

  protected openAddDrawer(): void {
    this.isViewOnly.set(false);
    this.editingId.set(null);
    this.formError.set('');
    this.setFormDisabled(false);
    this.courseForm.reset({
      name: '',
      code: '',
      department: this.departmentList()[0]?.name || 'Computer Applications',
      level: 'PG',
      duration: '2 Years',
      semesters: 4,
      intake: 60,
      eligibilityCriteria: '',
      status: 'Active'
    });
    this.isDrawerOpen.set(true);
  }

  protected onViewRecord(item: CourseRow): void {
    this.isViewOnly.set(true);
    this.editingId.set(item.id);
    this.formError.set('');
    this.courseForm.reset({
      name: item.name,
      code: item.code,
      department: item.department,
      level: item.level,
      duration: item.duration,
      semesters: item.semesters,
      intake: item.intake,
      eligibilityCriteria: item.eligibilityCriteria || '',
      status: item.status
    });
    this.setFormDisabled(true);
    this.isDrawerOpen.set(true);
  }

  protected onEditRecord(item: CourseRow): void {
    this.isViewOnly.set(false);
    this.editingId.set(item.id);
    this.formError.set('');
    this.setFormDisabled(false);
    this.courseForm.reset({
      name: item.name,
      code: item.code,
      department: item.department,
      level: item.level,
      duration: item.duration,
      semesters: item.semesters,
      intake: item.intake,
      eligibilityCriteria: item.eligibilityCriteria || '',
      status: item.status
    });
    this.isDrawerOpen.set(true);
  }

  protected onDeleteRecord(item: CourseRow): void {
    this.deletingItem.set(item);
    this.isDeleteDialogOpen.set(true);
  }

  protected handleCustomAction(event: { actionId: string; row: CourseRow }): void {
    if (event.actionId === 'toggle_status') {
      const c = event.row;
      this.academicService.saveCourse(
        {
          name: c.name,
          code: c.code,
          department: c.department,
          level: c.level,
          duration: c.duration,
          semesters: c.semesters,
          intake: c.intake,
          eligibilityCriteria: c.eligibilityCriteria,
          status: c.status === 'Active' ? 'Inactive' : 'Active'
        },
        c.id
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
    const val = this.courseForm.getRawValue();
    if (!val.name.trim() || !val.code.trim() || !val.department) {
      this.formError.set('Course Name, Code, and Department are required.');
      return;
    }

    const res = this.academicService.saveCourse(
      {
        name: val.name.trim(),
        code: val.code.trim().toUpperCase(),
        department: val.department,
        level: val.level,
        duration: val.duration.trim() || '2 Years',
        semesters: Number(val.semesters) || 4,
        intake: Number(val.intake) || 60,
        eligibilityCriteria: val.eligibilityCriteria.trim(),
        status: val.status
      },
      this.editingId() || undefined
    );

    if (!res.success) {
      this.formError.set(res.error || 'Failed to save course.');
      return;
    }
    this.closeDrawer();
  }

  protected confirmDelete(): void {
    const item = this.deletingItem();
    if (item) this.academicService.deleteCourse(item.id);
    this.isDeleteDialogOpen.set(false);
  }

  protected exportExcel(): void {
    exportToExcel(
      this.filteredCourses().map(c => ({
        Course: c.name,
        Code: c.code,
        Department: c.department,
        Level: c.level,
        Duration: c.duration,
        Semesters: c.semesters,
        Intake: c.intake,
        Eligibility: c.eligibilityCriteria || '',
        Status: c.status
      })),
      'EduERP_Courses'
    );
  }

  protected exportPdf(): void {
    exportToPdf(
      'Academic Courses & Degree Programs Catalog',
      ['Course', 'Code', 'Department', 'Level', 'Duration', 'Intake', 'Status'],
      this.filteredCourses().map(c => [c.name, c.code, c.department, c.level, c.duration, `${c.intake} Seats`, c.status]),
      'EduERP_Courses'
    );
  }
}
