import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AcademicService, Department } from '../../../services/academic.service';
import { FacultyService } from '../../../services/faculty.service';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-departments',
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

      @if (bannerMessage(); as banner) {
        <div
          class="p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-3"
          [class]="banner.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'"
        >
          <div class="flex items-center gap-2">
            <span class="material-icons text-base">{{ banner.type === 'error' ? 'error_outline' : 'check_circle' }}</span>
            <span>{{ banner.text }}</span>
          </div>
          <button type="button" (click)="bannerMessage.set(null)" class="text-slate-500 hover:text-slate-800 cursor-pointer">
            <span class="material-icons text-sm">close</span>
          </button>
        </div>
      }

      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <app-page-header
          class="flex-1"
          title="Departments"
          subtitle="Manage academic faculties, department heads (HODs), roster allocations and course branches."
          actionLabel="Add Department"
          actionIcon="account_balance"
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
        searchPlaceholder="Search by department name, code, or HOD..."
        [filter1Value]="statusFilter()"
        [filter1Options]="statusFilterOptions"
        [hasActiveFilters]="hasActiveFilters()"
        (searchChange)="onSearchChange($event)"
        (filter1Change)="onStatusFilterChange($event)"
        (resetClicked)="resetFilters()"
      />

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

      <app-form-drawer
        [isOpen]="isDrawerOpen()"
        [title]="drawerTitle()"
        [subtitle]="drawerSubtitle()"
        [saveLabel]="isViewOnly() ? 'Close' : (editingId() ? 'Update Department' : 'Save Department')"
        widthClass="max-w-[520px]"
        (closed)="closeDrawer()"
        (saved)="handleDrawerSave()"
      >
        <form [formGroup]="deptForm" class="space-y-4">
          @if (formError()) {
            <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <span class="material-icons text-base text-red-600 shrink-0">error_outline</span>
              <span>{{ formError() }}</span>
            </div>
          }

          <div class="space-y-1.5">
            <label for="dept-name-input" class="block text-xs font-semibold text-slate-800">
              Department Name <span class="text-red-500">*</span>
            </label>
            <input
              id="dept-name-input"
              type="text"
              formControlName="name"
              placeholder="e.g. Computer Applications"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 placeholder-[#64748B] focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label for="dept-code-input" class="block text-xs font-semibold text-slate-800">
                Department Code <span class="text-red-500">*</span>
              </label>
              <input
                id="dept-code-input"
                type="text"
                formControlName="code"
                placeholder="e.g. MCA, CSE"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 uppercase placeholder-[#64748B] focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div class="space-y-1.5">
              <label for="dept-year-input" class="block text-xs font-semibold text-slate-800">Established Year</label>
              <input
                id="dept-year-input"
                type="number"
                min="1950"
                max="2030"
                formControlName="establishedYear"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="dept-hod-select" class="block text-xs font-semibold text-slate-800">
              Head of Department (HOD) <span class="text-red-500">*</span>
            </label>
            <select
              id="dept-hod-select"
              formControlName="hod"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer"
            >
              <option value="">-- Select HOD Faculty --</option>
              @for (f of facultyList(); track f.id) {
                <option [value]="f.name">{{ f.name }} ({{ f.designation }} - {{ f.department }})</option>
              }
            </select>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div class="space-y-1.5">
              <label for="dept-faculty-input" class="block text-xs font-semibold text-slate-800">Faculty Count</label>
              <input
                id="dept-faculty-input"
                type="number"
                min="0"
                formControlName="facultyCount"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 disabled:bg-slate-50"
              />
            </div>
            <div class="space-y-1.5">
              <label for="dept-student-input" class="block text-xs font-semibold text-slate-800">Student Count</label>
              <input
                id="dept-student-input"
                type="number"
                min="0"
                formControlName="studentCount"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 disabled:bg-slate-50"
              />
            </div>
            <div class="space-y-1.5">
              <label for="dept-status-select" class="block text-xs font-semibold text-slate-800">Status</label>
              <select
                id="dept-status-select"
                formControlName="status"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 disabled:bg-slate-50"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          @if (isViewOnly() && viewingItem(); as dept) {
            <div class="pt-3 border-t border-slate-200 space-y-3">
              <div>
                <h4 class="text-[11px] font-bold uppercase tracking-wider text-indigo-700 mb-1.5">
                  Mapped Courses & Programs ({{ mappedCourses().length }})
                </h4>
                <div class="space-y-1.5">
                  @for (c of mappedCourses(); track c.id) {
                    <div class="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <span class="font-semibold text-slate-800">{{ c.name }}</span>
                      <span class="font-mono text-[11px] text-indigo-700">{{ c.code }} • {{ c.intake }} seats</span>
                    </div>
                  } @empty {
                    <p class="text-[11px] text-slate-500">No courses linked to this department yet.</p>
                  }
                </div>
              </div>

              <div>
                <h4 class="text-[11px] font-bold uppercase tracking-wider text-indigo-700 mb-1.5">
                  Mapped Faculty Roster ({{ mappedFaculty().length }})
                </h4>
                <div class="space-y-1.5">
                  @for (f of mappedFaculty(); track f.id) {
                    <div class="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <span class="font-semibold text-slate-800">{{ f.name }}</span>
                      <span class="text-[11px] text-slate-500">{{ f.designation }}</span>
                    </div>
                  } @empty {
                    <p class="text-[11px] text-slate-500">No faculty records mapped in directory.</p>
                  }
                </div>
              </div>
            </div>
          }
        </form>
      </app-form-drawer>

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
  protected readonly bannerMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  protected readonly searchQuery = signal<string>('');
  protected readonly statusFilter = signal<string>('All');

  protected readonly statusFilterOptions: FilterOption[] = [
    { label: 'Status: All', value: 'All' },
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' }
  ];

  protected readonly tableColumns: TableColumn[] = [
    { key: 'name', header: 'Department', isBold: true },
    { key: 'code', header: 'Code', isMono: true },
    { key: 'hod', header: 'Head of Department' },
    { key: 'facultyCount', header: 'Faculty', align: 'center' },
    { key: 'studentCount', header: 'Students', align: 'center' },
    { key: 'coursesCount', header: 'Courses', align: 'center' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

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

  protected readonly filteredDepartments = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    return this.academicService.departments().filter(item => {
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

  protected readonly isDrawerOpen = signal<boolean>(false);
  protected readonly isViewOnly = signal<boolean>(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly viewingItem = signal<Department | null>(null);
  protected readonly formError = signal<string>('');

  protected readonly mappedCourses = computed(() => {
    const dept = this.viewingItem();
    return dept ? this.academicService.courses().filter(c => c.department === dept.name) : [];
  });

  protected readonly mappedFaculty = computed(() => {
    const dept = this.viewingItem();
    return dept ? this.facultyService.facultyList().filter(f => f.department === dept.name) : [];
  });

  protected readonly deptForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    code: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    hod: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    facultyCount: new FormControl(10, { nonNullable: true }),
    studentCount: new FormControl(120, { nonNullable: true }),
    status: new FormControl<'Active' | 'Inactive'>('Active', { nonNullable: true }),
    establishedYear: new FormControl(2012, { nonNullable: true })
  });

  protected readonly isDeleteDialogOpen = signal<boolean>(false);
  protected readonly deletingItem = signal<Department | null>(null);
  protected readonly deleteDialogMessage = computed(() => {
    const item = this.deletingItem();
    return item ? `Are you sure you want to delete ${item.name} (${item.code})? This action cannot be undone.` : '';
  });

  protected readonly drawerTitle = computed(() => {
    if (this.isViewOnly()) return 'Department Dossier';
    return this.editingId() ? 'Edit Department' : 'Add Department';
  });

  protected readonly drawerSubtitle = computed(() => {
    if (this.isViewOnly()) return 'Department profile, mapped degree programs, and assigned faculty.';
    return 'Enter academic faculty credentials and HOD designation.';
  });

  protected onSearchChange(val: string): void { this.searchQuery.set(val); }
  protected onStatusFilterChange(val: string): void { this.statusFilter.set(val); }
  protected resetFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('All');
  }

  private setFormDisabled(disabled: boolean): void {
    if (disabled) this.deptForm.disable({ emitEvent: false });
    else this.deptForm.enable({ emitEvent: false });
  }

  protected openAddDrawer(): void {
    this.isViewOnly.set(false);
    this.editingId.set(null);
    this.viewingItem.set(null);
    this.formError.set('');
    this.setFormDisabled(false);
    this.deptForm.reset({
      name: '',
      code: '',
      hod: '',
      facultyCount: 10,
      studentCount: 120,
      status: 'Active',
      establishedYear: 2012
    });
    this.isDrawerOpen.set(true);
  }

  protected onViewRecord(item: Department): void {
    this.isViewOnly.set(true);
    this.editingId.set(item.id);
    this.viewingItem.set(item);
    this.formError.set('');
    this.deptForm.reset({
      name: item.name,
      code: item.code,
      hod: item.hod,
      facultyCount: item.facultyCount,
      studentCount: item.studentCount,
      status: item.status,
      establishedYear: item.establishedYear || 2004
    });
    this.setFormDisabled(true);
    this.isDrawerOpen.set(true);
  }

  protected onEditRecord(item: Department): void {
    this.isViewOnly.set(false);
    this.editingId.set(item.id);
    this.viewingItem.set(null);
    this.formError.set('');
    this.setFormDisabled(false);
    this.deptForm.reset({
      name: item.name,
      code: item.code,
      hod: item.hod,
      facultyCount: item.facultyCount,
      studentCount: item.studentCount,
      status: item.status,
      establishedYear: item.establishedYear || 2004
    });
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
    const val = this.deptForm.getRawValue();
    if (!val.name.trim() || !val.code.trim() || !val.hod.trim()) {
      this.formError.set('Department Name, Code, and HOD are required.');
      return;
    }

    const currentItem = this.editingId()
      ? this.academicService.departments().find(d => d.id === this.editingId())
      : null;

    const res = this.academicService.saveDepartment(
      {
        name: val.name.trim(),
        code: val.code.trim().toUpperCase(),
        hod: val.hod.trim(),
        facultyCount: Number(val.facultyCount) || 0,
        studentCount: Number(val.studentCount) || 0,
        coursesCount: currentItem ? currentItem.coursesCount : 0,
        status: val.status,
        establishedYear: Number(val.establishedYear) || 2000
      },
      this.editingId() || undefined
    );

    if (!res.success) {
      this.formError.set(res.error || 'Failed to save department.');
      return;
    }
    this.bannerMessage.set({ type: 'success', text: `Department "${val.name.trim()}" saved.` });
    this.closeDrawer();
  }

  protected confirmDelete(): void {
    const item = this.deletingItem();
    if (!item) return;
    const res = this.academicService.deleteDepartment(item.id);
    this.isDeleteDialogOpen.set(false);
    if (!res.success && res.error) {
      this.bannerMessage.set({ type: 'error', text: res.error });
    } else {
      this.bannerMessage.set({ type: 'success', text: `Department "${item.name}" removed.` });
    }
  }

  protected exportExcel(): void {
    exportToExcel(
      this.filteredDepartments().map(d => ({
        Department: d.name,
        Code: d.code,
        HOD: d.hod,
        Faculty: d.facultyCount,
        Students: d.studentCount,
        Courses: d.coursesCount,
        Established: d.establishedYear || '',
        Status: d.status
      })),
      'EduERP_Departments'
    );
  }

  protected exportPdf(): void {
    exportToPdf(
      'Academic Departments & HOD Directory',
      ['Department', 'Code', 'HOD', 'Faculty', 'Students', 'Courses', 'Status'],
      this.filteredDepartments().map(d => [d.name, d.code, d.hod, d.facultyCount, d.studentCount, d.coursesCount, d.status]),
      'EduERP_Departments'
    );
  }
}
