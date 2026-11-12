import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AcademicService, Course } from '../../../services/academic.service';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';

export interface CourseRow extends Course {
  displaySemesters: string;
  displayIntake: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-courses',
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
        title="Courses & Programs"
        subtitle="Configure degree programs, curriculum levels, semester splits, and sanctioned student intake."
        actionLabel="Add Course"
        (actionClicked)="openAddDrawer()"
      />

      <!-- 2. Stat Strip (Max 3 small cards: Courses, UG, PG) -->
      <app-stat-strip [items]="statItems()" />

      <!-- 3. Data Toolbar (Search + Department Filter + Level Filter) -->
      <app-data-toolbar
        [searchValue]="searchQuery()"
        searchPlaceholder="Search by course name or code..."
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

      <!-- 4. Data Table Card -->
      <app-data-table
        [columns]="tableColumns"
        [data]="filteredCourses()"
        idKey="id"
        emptyIcon="menu_book"
        emptyTitle="No courses found"
        emptyMessage="Try adjusting your department or level filters."
        emptyActionLabel="Clear filters"
        (emptyActionClicked)="resetFilters()"
        (viewClicked)="onViewRecord($event)"
        (editClicked)="onEditRecord($event)"
        (deleteClicked)="onDeleteRecord($event)"
      />

      <!-- Slide-in Form Drawer for Add / Edit / View -->
      <app-form-drawer
        [isOpen]="isDrawerOpen()"
        [title]="drawerTitle()"
        [subtitle]="drawerSubtitle()"
        [saveLabel]="isViewOnly() ? 'Close' : (editingId() ? 'Update Course' : 'Save Course')"
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

          <!-- Course Name -->
          <div class="space-y-1.5">
            <label for="course-name-input" class="block text-xs font-semibold text-slate-800">
              Course Name <span class="text-red-500">*</span>
            </label>
            <input
              id="course-name-input"
              type="text"
              [disabled]="isViewOnly()"
              [(ngModel)]="formName"
              placeholder="e.g. Master of Computer Applications"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 placeholder-[#64748B] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <!-- Course Code -->
          <div class="space-y-1.5">
            <label for="course-code-input" class="block text-xs font-semibold text-slate-800">
              Course Code <span class="text-red-500">*</span>
            </label>
            <input
              id="course-code-input"
              type="text"
              [disabled]="isViewOnly()"
              [(ngModel)]="formCode"
              placeholder="e.g. MCA-400"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 uppercase placeholder-[#64748B] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
            <p class="text-[11px] text-[#64748B]">Official University Curriculum Code</p>
          </div>

          <!-- Department Dropdown -->
          <div class="space-y-1.5">
            <label for="course-dept-select" class="block text-xs font-semibold text-slate-800">
              Department <span class="text-red-500">*</span>
            </label>
            <select
              id="course-dept-select"
              [disabled]="isViewOnly()"
              [(ngModel)]="formDepartment"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
              @for (dept of departmentList(); track dept.id) {
                <option [value]="dept.name">{{ dept.name }} ({{ dept.code }})</option>
              }
            </select>
          </div>

          <!-- Level (UG / PG) & Duration Row -->
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label for="course-level-select" class="block text-xs font-semibold text-slate-800">
                Program Level <span class="text-red-500">*</span>
              </label>
              <select
                id="course-level-select"
                [disabled]="isViewOnly()"
                [(ngModel)]="formLevel"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
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
                [disabled]="isViewOnly()"
                [(ngModel)]="formDuration"
                placeholder="e.g. 2 Years"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <!-- Semesters & Sanctioned Intake Row -->
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label for="course-semesters-input" class="block text-xs font-semibold text-slate-800">Total Semesters</label>
              <input
                id="course-semesters-input"
                type="number"
                min="1"
                max="12"
                [disabled]="isViewOnly()"
                [(ngModel)]="formSemesters"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div class="space-y-1.5">
              <label for="course-intake-input" class="block text-xs font-semibold text-slate-800">Sanctioned Intake</label>
              <input
                id="course-intake-input"
                type="number"
                min="10"
                max="500"
                [disabled]="isViewOnly()"
                [(ngModel)]="formIntake"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <!-- Status Dropdown -->
          <div class="space-y-1.5">
            <label for="course-status-select" class="block text-xs font-semibold text-slate-800">
              Status <span class="text-red-500">*</span>
            </label>
            <select
              id="course-status-select"
              [disabled]="isViewOnly()"
              [(ngModel)]="formStatus"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </app-form-drawer>

      <!-- Delete Confirmation Dialog -->
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

  protected readonly departmentFilterOptions = computed<FilterOption[]>(() => {
    const list = this.academicService.departments();
    return [
      { label: 'Department: All', value: 'All' },
      ...list.map(d => ({ label: d.name, value: d.name }))
    ];
  });

  protected readonly levelFilterOptions: FilterOption[] = [
    { label: 'Level: All', value: 'All' },
    { label: 'UG (Undergraduate)', value: 'UG' },
    { label: 'PG (Postgraduate)', value: 'PG' }
  ];

  // Columns: Course, Code, Department, Level (UG/PG), Duration, Semesters, Intake, Status
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

  // Stats: Courses, UG, PG
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

  // Filtered Courses
  protected readonly filteredCourses = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const dept = this.selectedDept();
    const level = this.selectedLevel();
    const rawList = this.academicService.courses();

    return rawList
      .filter(item => {
        if (dept !== 'All' && item.department !== dept) return false;
        if (level !== 'All' && item.level !== level) return false;
        if (query) {
          const match = `${item.name} ${item.code} ${item.department} ${item.level}`.toLowerCase();
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
    return (
      this.searchQuery().trim() !== '' ||
      this.selectedDept() !== 'All' ||
      this.selectedLevel() !== 'All'
    );
  });

  // Drawer & Form State
  protected readonly isDrawerOpen = signal<boolean>(false);
  protected readonly isViewOnly = signal<boolean>(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formError = signal<string>('');

  protected formName = '';
  protected formCode = '';
  protected formDepartment = 'Computer Applications';
  protected formLevel: 'UG' | 'PG' = 'PG';
  protected formDuration = '2 Years';
  protected formSemesters = 4;
  protected formIntake = 60;
  protected formStatus: 'Active' | 'Inactive' = 'Active';

  // Delete State
  protected readonly isDeleteDialogOpen = signal<boolean>(false);
  protected readonly deletingItem = signal<Course | null>(null);
  protected readonly deleteDialogMessage = computed(() => {
    const item = this.deletingItem();
    if (!item) return '';
    return `Are you sure you want to delete ${item.name} (${item.code})?`;
  });

  protected readonly drawerTitle = computed(() => {
    if (this.isViewOnly()) return 'Course Program Details';
    return this.editingId() ? 'Edit Course Program' : 'Add Course Program';
  });

  protected readonly drawerSubtitle = computed(() => {
    if (this.isViewOnly()) return 'View curriculum breakdown and intake specifications.';
    return 'Enter curriculum details, degree level, and intake capacity.';
  });

  protected onSearchChange(val: string): void {
    this.searchQuery.set(val);
  }

  protected onDeptFilterChange(val: string): void {
    this.selectedDept.set(val);
  }

  protected onLevelFilterChange(val: string): void {
    this.selectedLevel.set(val);
  }

  protected resetFilters(): void {
    this.searchQuery.set('');
    this.selectedDept.set('All');
    this.selectedLevel.set('All');
  }

  protected openAddDrawer(): void {
    this.isViewOnly.set(false);
    this.editingId.set(null);
    this.formError.set('');
    this.formName = '';
    this.formCode = '';
    const firstDept = this.departmentList()[0]?.name || 'Computer Applications';
    this.formDepartment = firstDept;
    this.formLevel = 'PG';
    this.formDuration = '2 Years';
    this.formSemesters = 4;
    this.formIntake = 60;
    this.formStatus = 'Active';
    this.isDrawerOpen.set(true);
  }

  protected onViewRecord(item: CourseRow): void {
    this.isViewOnly.set(true);
    this.editingId.set(item.id);
    this.formError.set('');
    this.formName = item.name;
    this.formCode = item.code;
    this.formDepartment = item.department;
    this.formLevel = item.level;
    this.formDuration = item.duration;
    this.formSemesters = item.semesters;
    this.formIntake = item.intake;
    this.formStatus = item.status;
    this.isDrawerOpen.set(true);
  }

  protected onEditRecord(item: CourseRow): void {
    this.isViewOnly.set(false);
    this.editingId.set(item.id);
    this.formError.set('');
    this.formName = item.name;
    this.formCode = item.code;
    this.formDepartment = item.department;
    this.formLevel = item.level;
    this.formDuration = item.duration;
    this.formSemesters = item.semesters;
    this.formIntake = item.intake;
    this.formStatus = item.status;
    this.isDrawerOpen.set(true);
  }

  protected onDeleteRecord(item: CourseRow): void {
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

    if (!this.formName.trim()) {
      this.formError.set('Course Name is required.');
      return;
    }
    if (!this.formCode.trim()) {
      this.formError.set('Course Code is required (e.g. MCA-400).');
      return;
    }
    if (!this.formDepartment) {
      this.formError.set('Department is required.');
      return;
    }

    const res = this.academicService.saveCourse(
      {
        name: this.formName.trim(),
        code: this.formCode.trim().toUpperCase(),
        department: this.formDepartment,
        level: this.formLevel,
        duration: this.formDuration.trim() || '2 Years',
        semesters: Number(this.formSemesters) || 4,
        intake: Number(this.formIntake) || 60,
        status: this.formStatus
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
    if (!item) return;

    this.academicService.deleteCourse(item.id);
    this.isDeleteDialogOpen.set(false);
  }
}
