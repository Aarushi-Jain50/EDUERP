import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AcademicService, Department } from '../../../services/academic.service';
import { FacultyService } from '../../../services/faculty.service';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-departments',
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
        title="Departments"
        subtitle="Manage academic faculties, department heads (HODs), roster allocations and course branches."
        actionLabel="Add Department"
        (actionClicked)="openAddDrawer()"
      />

      <!-- 2. Stat Strip (Max 3 small cards) -->
      <app-stat-strip [items]="statItems()" />

      <!-- 3. Data Toolbar -->
      <app-data-toolbar
        [searchValue]="searchQuery()"
        searchPlaceholder="Search by department name, code, or HOD..."
        [filter1Value]="statusFilter()"
        [filter1Options]="statusFilterOptions"
        [hasActiveFilters]="hasActiveFilters()"
        (searchChange)="onSearchChange($event)"
        (filter1Change)="onStatusFilterChange($event)"
        (resetClicked)="resetFilters()"
      />

      <!-- 4. Data Table Card -->
      <app-data-table
        [columns]="tableColumns"
        [data]="filteredDepartments()"
        idKey="id"
        emptyIcon="account_balance"
        emptyTitle="No departments found"
        emptyMessage="Try adjusting your search query or status filter."
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
        [saveLabel]="isViewOnly() ? 'Close' : (editingId() ? 'Update Department' : 'Save Department')"
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

          <!-- Department Name -->
          <div class="space-y-1.5">
            <label for="dept-name-input" class="block text-xs font-semibold text-slate-800">
              Department Name <span class="text-red-500">*</span>
            </label>
            <input
              id="dept-name-input"
              type="text"
              [disabled]="isViewOnly()"
              [(ngModel)]="formName"
              placeholder="e.g. Computer Applications"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 placeholder-[#64748B] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <!-- Department Code -->
          <div class="space-y-1.5">
            <label for="dept-code-input" class="block text-xs font-semibold text-slate-800">
              Department Code <span class="text-red-500">*</span>
            </label>
            <input
              id="dept-code-input"
              type="text"
              [disabled]="isViewOnly()"
              [(ngModel)]="formCode"
              placeholder="e.g. MCA, CSE, IT"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 uppercase placeholder-[#64748B] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
            <p class="text-[11px] text-[#64748B]">Short unique acronym identifier</p>
          </div>

          <!-- Head of Department (HOD) Dropdown -->
          <div class="space-y-1.5">
            <label for="dept-hod-select" class="block text-xs font-semibold text-slate-800">
              Head of Department (HOD) <span class="text-red-500">*</span>
            </label>
            <select
              id="dept-hod-select"
              [disabled]="isViewOnly()"
              [(ngModel)]="formHod"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer"
            >
              <option value="">-- Select HOD Faculty --</option>
              @for (f of facultyList(); track f.id) {
                <option [value]="f.name">{{ f.name }} ({{ f.designation }} - {{ f.department }})</option>
              }
            </select>
          </div>

          <!-- Faculty Count & Student Count Row -->
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label for="dept-faculty-input" class="block text-xs font-semibold text-slate-800">Faculty Count</label>
              <input
                id="dept-faculty-input"
                type="number"
                min="0"
                [disabled]="isViewOnly()"
                [(ngModel)]="formFacultyCount"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <div class="space-y-1.5">
              <label for="dept-student-input" class="block text-xs font-semibold text-slate-800">Student Count</label>
              <input
                id="dept-student-input"
                type="number"
                min="0"
                [disabled]="isViewOnly()"
                [(ngModel)]="formStudentCount"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <!-- Status Dropdown -->
          <div class="space-y-1.5">
            <label for="dept-status-select" class="block text-xs font-semibold text-slate-800">
              Status <span class="text-red-500">*</span>
            </label>
            <select
              id="dept-status-select"
              [disabled]="isViewOnly()"
              [(ngModel)]="formStatus"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <!-- Established Year -->
          <div class="space-y-1.5">
            <label for="dept-year-input" class="block text-xs font-semibold text-slate-800">Established Year</label>
            <input
              id="dept-year-input"
              type="number"
              min="1950"
              max="2030"
              [disabled]="isViewOnly()"
              [(ngModel)]="formEstablishedYear"
              placeholder="e.g. 2004"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
        </div>
      </app-form-drawer>

      <!-- Delete Confirmation Dialog -->
      <app-confirm-dialog
        [isOpen]="isDeleteDialogOpen()"
        title="Delete Department"
        [message]="deleteDialogMessage()"
        confirmLabel="Confirm Delete"
        (cancelled)="isDeleteDialogOpen.set(false)"
        (confirmed)="confirmDelete()"
      />

    </div>
  `
})
export class DepartmentsPage {
  private readonly academicService = inject(AcademicService);
  private readonly facultyService = inject(FacultyService);

  protected readonly facultyList = computed(() => this.facultyService.facultyList());

  protected readonly searchQuery = signal<string>('');
  protected readonly statusFilter = signal<string>('All');

  protected readonly statusFilterOptions: FilterOption[] = [
    { label: 'Status: All', value: 'All' },
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' }
  ];

  // Columns: Department, Code, HOD, Faculty, Students, Courses, Status, Actions
  protected readonly tableColumns: TableColumn[] = [
    { key: 'name', header: 'Department', isBold: true },
    { key: 'code', header: 'Code', isMono: true },
    { key: 'hod', header: 'Head of Department' },
    { key: 'facultyCount', header: 'Faculty', align: 'center' },
    { key: 'studentCount', header: 'Students', align: 'center' },
    { key: 'coursesCount', header: 'Courses', align: 'center' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  // Stats: Departments, Total Faculty, Total Students
  protected readonly statItems = computed<StatItem[]>(() => {
    const stats = this.academicService.departmentStats();
    return [
      {
        label: 'Total Departments',
        value: stats.departments,
        subtext: 'Academic faculties in ERP',
        icon: 'account_balance',
        iconBgClass: 'bg-purple-50 border-purple-100',
        iconColorClass: 'text-[#6D42E8]'
      },
      {
        label: 'Total Faculty',
        value: stats.totalFaculty,
        subtext: 'Active teaching roster',
        icon: 'badge',
        iconBgClass: 'bg-indigo-50 border-indigo-100',
        iconColorClass: 'text-indigo-600'
      },
      {
        label: 'Total Students',
        value: stats.totalStudents.toLocaleString(),
        subtext: 'Enrolled across faculties',
        icon: 'school',
        iconBgClass: 'bg-emerald-50 border-emerald-100',
        iconColorClass: 'text-emerald-600'
      }
    ];
  });

  // Filtered Departments
  protected readonly filteredDepartments = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    const rawList = this.academicService.departments();

    return rawList.filter(item => {
      if (status !== 'All' && item.status !== status) return false;
      if (query) {
        const match = `${item.name} ${item.code} ${item.hod}`.toLowerCase();
        if (!match.includes(query)) return false;
      }
      return true;
    });
  });

  protected readonly hasActiveFilters = computed(() => {
    return this.searchQuery().trim() !== '' || this.statusFilter() !== 'All';
  });

  // Drawer & Form State
  protected readonly isDrawerOpen = signal<boolean>(false);
  protected readonly isViewOnly = signal<boolean>(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formError = signal<string>('');

  protected formName = '';
  protected formCode = '';
  protected formHod = '';
  protected formFacultyCount = 0;
  protected formStudentCount = 0;
  protected formStatus: 'Active' | 'Inactive' = 'Active';
  protected formEstablishedYear = 2004;

  // Delete State
  protected readonly isDeleteDialogOpen = signal<boolean>(false);
  protected readonly deletingItem = signal<Department | null>(null);
  protected readonly deleteDialogMessage = computed(() => {
    const item = this.deletingItem();
    if (!item) return '';
    return `Are you sure you want to delete ${item.name} (${item.code})? This action cannot be undone.`;
  });

  protected readonly drawerTitle = computed(() => {
    if (this.isViewOnly()) return 'Department Details';
    return this.editingId() ? 'Edit Department' : 'Add Department';
  });

  protected readonly drawerSubtitle = computed(() => {
    if (this.isViewOnly()) return 'View institutional faculty information.';
    return 'Enter academic faculty credentials and HOD designation.';
  });

  protected onSearchChange(val: string): void {
    this.searchQuery.set(val);
  }

  protected onStatusFilterChange(val: string): void {
    this.statusFilter.set(val);
  }

  protected resetFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('All');
  }

  protected openAddDrawer(): void {
    this.isViewOnly.set(false);
    this.editingId.set(null);
    this.formError.set('');
    this.formName = '';
    this.formCode = '';
    this.formHod = '';
    this.formFacultyCount = 10;
    this.formStudentCount = 120;
    this.formStatus = 'Active';
    this.formEstablishedYear = 2012;
    this.isDrawerOpen.set(true);
  }

  protected onViewRecord(item: Department): void {
    this.isViewOnly.set(true);
    this.editingId.set(item.id);
    this.formError.set('');
    this.formName = item.name;
    this.formCode = item.code;
    this.formHod = item.hod;
    this.formFacultyCount = item.facultyCount;
    this.formStudentCount = item.studentCount;
    this.formStatus = item.status;
    this.formEstablishedYear = item.establishedYear || 2004;
    this.isDrawerOpen.set(true);
  }

  protected onEditRecord(item: Department): void {
    this.isViewOnly.set(false);
    this.editingId.set(item.id);
    this.formError.set('');
    this.formName = item.name;
    this.formCode = item.code;
    this.formHod = item.hod;
    this.formFacultyCount = item.facultyCount;
    this.formStudentCount = item.studentCount;
    this.formStatus = item.status;
    this.formEstablishedYear = item.establishedYear || 2004;
    this.isDrawerOpen.set(true);
  }

  protected onDeleteRecord(item: Department): void {
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
      this.formError.set('Department Name is required.');
      return;
    }
    if (!this.formCode.trim()) {
      this.formError.set('Department Code is required (e.g. MCA).');
      return;
    }
    if (!this.formHod.trim()) {
      this.formError.set('Head of Department (HOD) is required.');
      return;
    }

    const currentItem = this.editingId()
      ? this.academicService.departments().find(d => d.id === this.editingId())
      : null;

    const res = this.academicService.saveDepartment(
      {
        name: this.formName.trim(),
        code: this.formCode.trim().toUpperCase(),
        hod: this.formHod.trim(),
        facultyCount: Number(this.formFacultyCount) || 0,
        studentCount: Number(this.formStudentCount) || 0,
        coursesCount: currentItem ? currentItem.coursesCount : 0,
        status: this.formStatus,
        establishedYear: Number(this.formEstablishedYear) || 2000
      },
      this.editingId() || undefined
    );

    if (!res.success) {
      this.formError.set(res.error || 'Failed to save department.');
      return;
    }

    this.closeDrawer();
  }

  protected confirmDelete(): void {
    const item = this.deletingItem();
    if (!item) return;

    const res = this.academicService.deleteDepartment(item.id);
    this.isDeleteDialogOpen.set(false);
    if (!res.success && res.error) {
      alert(res.error);
    }
  }
}
