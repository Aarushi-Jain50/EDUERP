import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { AcademicService } from '../../../services/academic.service';
import { FacultyService } from '../../../services/faculty.service';
import { Faculty, DesignationType, FacultyStatus } from '../../../models/faculty-parent.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-faculty-page',
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
      
      <!-- 1. Page Header -->
      <app-page-header
        title="Faculty Directory"
        subtitle="Manage academic teaching staff, designations, and departmental allocations."
        primaryActionLabel="Add Faculty"
        primaryActionIcon="badge"
        (primaryActionClicked)="openAddDrawer()"
      />

      <!-- 2. Stat Strip -->
      <app-stat-strip [items]="stats()" />

      <!-- 3. Data Toolbar -->
      <app-data-toolbar
        searchPlaceholder="Search by faculty name, employee ID, or email..."
        [searchValue]="searchQuery()"
        [filter1Options]="departmentFilterOptions()"
        [filter1Value]="departmentFilter()"
        [filter2Options]="designationFilterOptions"
        [filter2Value]="designationFilter()"
        (searchChange)="searchQuery.set($event)"
        (filter1Change)="departmentFilter.set($event)"
        (filter2Change)="designationFilter.set($event)"
      />

      <!-- 4. Data Table Card -->
      <app-data-table
        [columns]="columns"
        [data]="filteredFaculty()"
        idKey="id"
        emptyIcon="badge"
        emptyTitle="No faculty members found"
        emptyMessage="Try adjusting search or department filters."
        emptyActionLabel="Add Faculty Member"
        (emptyActionClicked)="openAddDrawer()"
        (viewClicked)="openViewDrawer($event)"
        (editClicked)="openEditDrawer($event)"
        (deleteClicked)="openDeleteDialog($event)"
      />

      <!-- 5. Add / Edit Form Drawer (560px Wide) -->
      <app-form-drawer
        [isOpen]="isFormDrawerOpen()"
        [title]="editingFacultyId() ? 'Edit Faculty Record' : 'Register New Faculty Member'"
        [subtitle]="editingFacultyId() ? 'Update personal, qualification, and department details.' : 'Enter faculty credentials, department, and academic experience.'"
        [saveLabel]="editingFacultyId() ? 'Update Faculty' : 'Add Faculty Member'"
        widthClass="max-w-[560px]"
        (closed)="closeFormDrawer()"
        (saved)="submitForm()"
      >
        @if (formErrorMessage()) {
          <div class="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 mb-3">
            <span class="material-icons text-base text-red-500">error</span>
            <span>{{ formErrorMessage() }}</span>
          </div>
        }

        <form [formGroup]="facultyForm" class="space-y-4 text-xs sm:text-[13px]">
          
          <!-- SECTION 1: PERSONAL INFORMATION -->
          <div class="space-y-3">
            <div class="flex items-center gap-2 pb-1 border-b border-[#E2E8F0]">
              <span class="material-icons text-sm text-[#6D42E8]">person</span>
              <h3 class="font-bold text-slate-900 uppercase tracking-wider text-[11px]">1. Personal Information</h3>
            </div>

            <div>
              <label for="faculty-name" class="block font-semibold text-slate-700 mb-1">
                Full Name (with Title) <span class="text-red-500">*</span>
              </label>
              <input
                id="faculty-name"
                type="text"
                formControlName="name"
                placeholder="e.g. Dr. Amit Joshi or Prof. Ananya Sen"
                class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="faculty-gender" class="block font-semibold text-slate-700 mb-1">
                  Gender <span class="text-red-500">*</span>
                </label>
                <select
                  id="faculty-gender"
                  formControlName="gender"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label for="faculty-phone" class="block font-semibold text-slate-700 mb-1">
                  Contact Phone (10 Digits) <span class="text-red-500">*</span>
                </label>
                <input
                  id="faculty-phone"
                  type="tel"
                  maxLength="10"
                  formControlName="phone"
                  placeholder="e.g. 9811002233"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                />
              </div>
            </div>

            <div>
              <label for="faculty-email" class="block font-semibold text-slate-700 mb-1">
                Official Institutional Email <span class="text-red-500">*</span>
              </label>
              <input
                id="faculty-email"
                type="email"
                formControlName="email"
                placeholder="e.g. amit.joshi@eduerp.edu"
                class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
              />
            </div>
          </div>

          <!-- SECTION 2: PROFESSIONAL & ACADEMIC ALLOCATION -->
          <div class="space-y-3 pt-2">
            <div class="flex items-center gap-2 pb-1 border-b border-[#E2E8F0]">
              <span class="material-icons text-sm text-[#6D42E8]">work</span>
              <h3 class="font-bold text-slate-900 uppercase tracking-wider text-[11px]">2. Professional & Academic Record</h3>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="faculty-empid" class="block font-semibold text-slate-700 mb-1">
                  Employee ID <span class="text-red-500">*</span>
                </label>
                <input
                  id="faculty-empid"
                  type="text"
                  formControlName="employeeId"
                  placeholder="e.g. FAC-0012"
                  class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-slate-900 font-mono font-semibold focus:outline-none focus:border-[#6D42E8]"
                />
              </div>

              <div>
                <label for="faculty-status" class="block font-semibold text-slate-700 mb-1">
                  Employment Status <span class="text-red-500">*</span>
                </label>
                <select
                  id="faculty-status"
                  formControlName="status"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                >
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="faculty-dept" class="block font-semibold text-slate-700 mb-1">
                  Department <span class="text-red-500">*</span>
                </label>
                <select
                  id="faculty-dept"
                  formControlName="department"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                >
                  <option value="">-- Select Department --</option>
                  @for (d of departments(); track d.id) {
                    <option [value]="d.name">{{ d.name }} ({{ d.code }})</option>
                  }
                </select>
              </div>

              <div>
                <label for="faculty-designation" class="block font-semibold text-slate-700 mb-1">
                  Designation <span class="text-red-500">*</span>
                </label>
                <select
                  id="faculty-designation"
                  formControlName="designation"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                >
                  <option value="Professor">Professor</option>
                  <option value="Associate Professor">Associate Professor</option>
                  <option value="Assistant Professor">Assistant Professor</option>
                  <option value="Lecturer">Lecturer</option>
                </select>
              </div>
            </div>

            <div>
              <label for="faculty-qualification" class="block font-semibold text-slate-700 mb-1">
                Highest Academic Qualification <span class="text-red-500">*</span>
              </label>
              <input
                id="faculty-qualification"
                type="text"
                formControlName="qualification"
                placeholder="e.g. Ph.D. in Computer Science (IIT Delhi)"
                class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="faculty-exp" class="block font-semibold text-slate-700 mb-1">
                  Teaching Experience (Years) <span class="text-red-500">*</span>
                </label>
                <input
                  id="faculty-exp"
                  type="number"
                  min="0"
                  max="50"
                  formControlName="experienceYears"
                  placeholder="e.g. 12"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                />
              </div>

              <div>
                <label for="faculty-joining" class="block font-semibold text-slate-700 mb-1">
                  Date of Joining <span class="text-red-500">*</span>
                </label>
                <input
                  id="faculty-joining"
                  type="date"
                  formControlName="joiningDate"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                />
              </div>
            </div>

          </div>

        </form>
      </app-form-drawer>

      <!-- 6. View Faculty Profile Drawer -->
      @if (viewingFaculty(); as fac) {
        <app-form-drawer
          [isOpen]="true"
          title="Faculty Profile"
          subtitle="Read-only view of academic faculty member."
          widthClass="max-w-[560px]"
          [showSaveButton]="false"
          (closed)="viewingFaculty.set(null)"
        >
          <div class="space-y-4">
            
            <div class="p-4 bg-gradient-to-r from-[#1A1745] to-[#2E286E] text-white rounded-2xl shadow-sm flex items-center gap-4">
              <div class="w-14 h-14 rounded-full bg-gradient-to-tr from-[#6D42E8] to-[#D946EF] p-0.5 shrink-0 shadow-md">
                <div class="w-full h-full rounded-full bg-[#1A1745] flex items-center justify-center text-lg font-extrabold text-white uppercase">
                  {{ fac.initials }}
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <h3 class="text-base font-bold truncate">{{ fac.name }}</h3>
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/10 text-emerald-300 border border-white/20">
                    {{ fac.status }}
                  </span>
                </div>
                <p class="text-xs text-purple-200 font-mono mt-0.5">{{ fac.employeeId }} • {{ fac.designation }}</p>
                <p class="text-xs text-slate-300 mt-1 truncate">{{ fac.department }}</p>
              </div>
            </div>

            <div class="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2.5 text-xs">
              <div class="font-bold text-slate-900 uppercase tracking-wider text-purple-800 pb-1 border-b border-slate-200">
                Academic & Employment Record
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <span class="text-slate-500 block text-[11px]">Employee ID</span>
                  <span class="font-semibold font-mono text-slate-800">{{ fac.employeeId }}</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[11px]">Designation</span>
                  <span class="font-semibold text-slate-800">{{ fac.designation }}</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[11px]">Department</span>
                  <span class="font-semibold text-slate-800">{{ fac.department }}</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[11px]">Teaching Experience</span>
                  <span class="font-semibold text-slate-800">{{ fac.experience }}</span>
                </div>
                <div class="col-span-2">
                  <span class="text-slate-500 block text-[11px]">Qualification</span>
                  <span class="font-semibold text-slate-800">{{ fac.qualification }}</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[11px]">Date of Joining</span>
                  <span class="font-semibold text-slate-800">{{ fac.joiningDate }}</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[11px]">Official Email</span>
                  <span class="font-semibold text-slate-800 truncate block">{{ fac.email }}</span>
                </div>
              </div>
            </div>

          </div>
        </app-form-drawer>
      }

      <!-- 7. Confirm Delete Dialog (With Active Allocation Error Protection) -->
      <app-confirm-dialog
        [isOpen]="isDeleteDialogOpen()"
        title="Delete Faculty Member"
        [message]="deleteDialogMessage()"
        confirmLabel="Delete Faculty"
        (closed)="closeDeleteDialog()"
        (confirmed)="confirmDelete()"
      />

    </div>
  `
})
export class FacultyPage {
  private readonly academicService = inject(AcademicService);
  private readonly facultyService = inject(FacultyService);

  // Filters & State
  protected readonly searchQuery = signal<string>('');
  protected readonly departmentFilter = signal<string>('');
  protected readonly designationFilter = signal<string>('');

  protected readonly isFormDrawerOpen = signal<boolean>(false);
  protected readonly editingFacultyId = signal<string | null>(null);
  protected readonly viewingFaculty = signal<Faculty | null>(null);

  protected readonly isDeleteDialogOpen = signal<boolean>(false);
  protected readonly facultyToDelete = signal<Faculty | null>(null);
  protected readonly deleteErrorMessage = signal<string | null>(null);
  protected readonly formErrorMessage = signal<string | null>(null);

  protected readonly departments = computed(() => this.academicService.departments());

  // Table Columns
  protected readonly columns: TableColumn[] = [
    { key: 'name', header: 'Faculty', isAvatarCell: true, avatarInitialsKey: 'initials', subtextKey: 'email' },
    { key: 'employeeId', header: 'Employee ID', isMono: true, isBold: true },
    { key: 'department', header: 'Department' },
    { key: 'designation', header: 'Designation' },
    { key: 'qualification', header: 'Qualification' },
    { key: 'experience', header: 'Experience' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  // Stat Strip
  protected readonly stats = computed<StatItem[]>(() => {
    const s = this.facultyService.facultyStats();
    return [
      { label: 'Total Faculty Members', value: s.total, helperText: 'Teaching staff directory', icon: 'badge', colorClass: 'text-[#6D42E8] bg-purple-50' },
      { label: 'Academic Hierarchy', value: s.total > 0 ? `${s.total} Staff` : '0 Staff', helperText: s.breakdown, icon: 'military_tech', colorClass: 'text-indigo-600 bg-indigo-50' },
      { label: 'Departments Covered', value: s.departmentsCovered, helperText: 'With active faculty allocations', icon: 'account_balance', colorClass: 'text-emerald-600 bg-emerald-50' }
    ];
  });

  // Department Dropdown Options
  protected readonly departmentFilterOptions = computed<FilterOption[]>(() => {
    const options: FilterOption[] = [{ label: 'All Departments', value: '' }];
    this.departments().forEach(d => {
      options.push({ label: d.name, value: d.name });
    });
    return options;
  });

  // Designation Filter Options
  protected readonly designationFilterOptions: FilterOption[] = [
    { label: 'All Designations', value: '' },
    { label: 'Professor', value: 'Professor' },
    { label: 'Associate Professor', value: 'Associate Professor' },
    { label: 'Assistant Professor', value: 'Assistant Professor' },
    { label: 'Lecturer', value: 'Lecturer' }
  ];

  // Filtered Faculty Dataset
  protected readonly filteredFaculty = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const dept = this.departmentFilter();
    const desig = this.designationFilter();

    return this.facultyService.facultyList().filter(f => {
      const matchesSearch =
        !query ||
        f.name.toLowerCase().includes(query) ||
        f.employeeId.toLowerCase().includes(query) ||
        f.email.toLowerCase().includes(query) ||
        f.qualification.toLowerCase().includes(query);

      const matchesDept = !dept || f.department === dept;
      const matchesDesig = !desig || f.designation === desig;

      return matchesSearch && matchesDept && matchesDesig;
    });
  });

  // Reactive Form Definition
  protected readonly facultyForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    gender: new FormControl<'Male' | 'Female' | 'Other'>('Male', { nonNullable: true, validators: [Validators.required] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{10}$/)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),

    employeeId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    status: new FormControl<FacultyStatus>('Active', { nonNullable: true, validators: [Validators.required] }),
    department: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    designation: new FormControl<DesignationType>('Assistant Professor', { nonNullable: true, validators: [Validators.required] }),
    qualification: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    experienceYears: new FormControl<number>(5, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    joiningDate: new FormControl(new Date().toISOString().split('T')[0], { nonNullable: true, validators: [Validators.required] })
  });

  protected openAddDrawer(): void {
    this.editingFacultyId.set(null);
    this.formErrorMessage.set(null);
    const defaultDept = this.departments()[0]?.name || 'Computer Applications';
    const autoEmpId = this.facultyService.generateEmployeeId();

    this.facultyForm.reset({
      name: '',
      gender: 'Male',
      phone: '',
      email: '',
      employeeId: autoEmpId,
      status: 'Active',
      department: defaultDept,
      designation: 'Assistant Professor',
      qualification: '',
      experienceYears: 5,
      joiningDate: new Date().toISOString().split('T')[0]
    });

    this.isFormDrawerOpen.set(true);
  }

  protected openEditDrawer(fac: Faculty): void {
    this.editingFacultyId.set(fac.id);
    this.formErrorMessage.set(null);

    this.facultyForm.reset({
      name: fac.name,
      gender: fac.gender,
      phone: fac.phone,
      email: fac.email,
      employeeId: fac.employeeId,
      status: fac.status,
      department: fac.department,
      designation: fac.designation,
      qualification: fac.qualification,
      experienceYears: fac.experienceYears,
      joiningDate: fac.joiningDate
    });

    this.isFormDrawerOpen.set(true);
  }

  protected openViewDrawer(fac: Faculty): void {
    this.viewingFaculty.set(fac);
  }

  protected closeFormDrawer(): void {
    this.isFormDrawerOpen.set(false);
    this.formErrorMessage.set(null);
  }

  protected submitForm(): void {
    this.facultyForm.markAllAsTouched();
    if (this.facultyForm.invalid) {
      this.formErrorMessage.set('Please fill in all required fields with valid input.');
      return;
    }

    const val = this.facultyForm.getRawValue();
    const selectedDeptObj = this.departments().find(d => d.name === val.department);
    const departmentId = selectedDeptObj ? selectedDeptObj.id : 'dept-mca';

    const res = this.facultyService.saveFaculty(
      {
        employeeId: val.employeeId,
        name: val.name,
        gender: val.gender,
        email: val.email,
        phone: val.phone,
        departmentId,
        department: val.department,
        designation: val.designation,
        qualification: val.qualification,
        experienceYears: val.experienceYears,
        joiningDate: val.joiningDate,
        status: val.status
      },
      this.editingFacultyId() || undefined
    );

    if (res.success) {
      this.closeFormDrawer();
    } else {
      this.formErrorMessage.set(res.error || 'Failed to save faculty record.');
    }
  }

  protected openDeleteDialog(fac: Faculty): void {
    this.facultyToDelete.set(fac);
    this.deleteErrorMessage.set(null);
    this.isDeleteDialogOpen.set(true);
  }

  protected closeDeleteDialog(): void {
    this.isDeleteDialogOpen.set(false);
    this.facultyToDelete.set(null);
    this.deleteErrorMessage.set(null);
  }

  protected readonly deleteDialogMessage = computed(() => {
    const f = this.facultyToDelete();
    if (this.deleteErrorMessage()) {
      return this.deleteErrorMessage()!;
    }
    return f ? `Are you sure you want to delete "${f.name}" (${f.employeeId})? This action cannot be undone.` : '';
  });

  protected confirmDelete(): void {
    const target = this.facultyToDelete();
    if (target) {
      const res = this.facultyService.deleteFaculty(target.id);
      if (res.success) {
        this.closeDeleteDialog();
      } else {
        // Display active subject allocation blocking error message
        this.deleteErrorMessage.set(res.error || 'Cannot delete faculty.');
      }
    }
  }
}
