import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn, TableCustomAction } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { AcademicService } from '../../../services/academic.service';
import { FacultyService } from '../../../services/faculty.service';
import { Faculty, DesignationType, FacultyStatus } from '../../../models/faculty-parent.model';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

export interface FacultyRow extends Faculty {
  workloadDisplay: string;
  verifiedDisplay: string;
}

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

      @if (bannerMessage(); as banner) {
        <div class="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="material-icons text-base text-emerald-600">check_circle</span>
            <span>{{ banner }}</span>
          </div>
          <button type="button" (click)="bannerMessage.set(null)" class="text-emerald-600 hover:text-emerald-900 cursor-pointer">
            <span class="material-icons text-sm">close</span>
          </button>
        </div>
      }

      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <app-page-header
          class="flex-1"
          title="Faculty Directory"
          subtitle="Manage academic teaching staff, specializations, weekly workload allocation, document verification, and duty status."
          actionLabel="Add Faculty"
          actionIcon="badge"
          (actionClicked)="openAddDrawer()"
        />
        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            (click)="exportExcel()"
            class="h-10 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-[#E2E8F0] rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <span class="material-icons text-sm text-emerald-600">table_view</span>
            <span>Excel</span>
          </button>
          <button
            type="button"
            (click)="exportPdf()"
            class="h-10 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-[#E2E8F0] rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <span class="material-icons text-sm text-rose-600">picture_as_pdf</span>
            <span>PDF</span>
          </button>
        </div>
      </div>

      <app-stat-strip [items]="stats()" />

      <app-data-toolbar
        searchPlaceholder="Search by faculty name, employee ID, specialization, or email..."
        [searchValue]="searchQuery()"
        [filter1Options]="departmentFilterOptions()"
        [filter1Value]="departmentFilter()"
        [filter2Options]="designationFilterOptions"
        [filter2Value]="designationFilter()"
        [hasActiveFilters]="hasActiveFilters()"
        (searchChange)="searchQuery.set($event)"
        (filter1Change)="departmentFilter.set($event)"
        (filter2Change)="designationFilter.set($event)"
        (resetClicked)="resetFilters()"
      />

      <app-data-table
        [columns]="columns"
        [data]="filteredFaculty()"
        idKey="id"
        [customActions]="customRowActions"
        emptyIcon="badge"
        emptyTitle="No faculty members found"
        emptyMessage="Try adjusting search or department filters."
        emptyActionLabel="Add Faculty Member"
        (emptyActionClicked)="openAddDrawer()"
        (viewClicked)="openViewDrawer($event)"
        (editClicked)="openEditDrawer($event)"
        (deleteClicked)="openDeleteDialog($event)"
        (customActionClicked)="handleCustomAction($event)"
      />

      <!-- Add / Edit Form Drawer -->
      <app-form-drawer
        [isOpen]="isFormDrawerOpen()"
        [title]="editingFacultyId() ? 'Edit Faculty Record' : 'Register New Faculty Member'"
        [subtitle]="editingFacultyId() ? 'Update personal, specialization, workload cap, and department details.' : 'Enter faculty credentials, specialization, and weekly workload cap.'"
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
          <div class="space-y-3">
            <div class="flex items-center gap-2 pb-1 border-b border-[#E2E8F0]">
              <span class="material-icons text-sm text-[#6D42E8]">person</span>
              <h3 class="font-bold text-slate-900 uppercase tracking-wider text-[11px]">1. Personal Information</h3>
            </div>

            <div>
              <label for="faculty-name" class="block font-semibold text-slate-700 mb-1">Full Name (with Title) <span class="text-red-500">*</span></label>
              <input id="faculty-name" type="text" formControlName="name" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="faculty-gender" class="block font-semibold text-slate-700 mb-1">Gender <span class="text-red-500">*</span></label>
                <select id="faculty-gender" formControlName="gender" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label for="faculty-phone" class="block font-semibold text-slate-700 mb-1">Contact Phone (10 Digits) <span class="text-red-500">*</span></label>
                <input id="faculty-phone" type="tel" maxLength="10" formControlName="phone" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
              </div>
            </div>

            <div>
              <label for="faculty-email" class="block font-semibold text-slate-700 mb-1">Official Institutional Email <span class="text-red-500">*</span></label>
              <input id="faculty-email" type="email" formControlName="email" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
            </div>
          </div>

          <div class="space-y-3 pt-2">
            <div class="flex items-center gap-2 pb-1 border-b border-[#E2E8F0]">
              <span class="material-icons text-sm text-[#6D42E8]">work</span>
              <h3 class="font-bold text-slate-900 uppercase tracking-wider text-[11px]">2. Professional, Specialization & Workload</h3>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="faculty-empid" class="block font-semibold text-slate-700 mb-1">Employee ID <span class="text-red-500">*</span></label>
                <input id="faculty-empid" type="text" formControlName="employeeId" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-slate-900 font-mono font-semibold" />
              </div>
              <div>
                <label for="faculty-status" class="block font-semibold text-slate-700 mb-1">Employment Status <span class="text-red-500">*</span></label>
                <select id="faculty-status" formControlName="status" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900">
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="faculty-dept" class="block font-semibold text-slate-700 mb-1">Department <span class="text-red-500">*</span></label>
                <select id="faculty-dept" formControlName="department" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900">
                  <option value="">-- Select Department --</option>
                  @for (d of departments(); track d.id) {
                    <option [value]="d.name">{{ d.name }} ({{ d.code }})</option>
                  }
                </select>
              </div>
              <div>
                <label for="faculty-designation" class="block font-semibold text-slate-700 mb-1">Designation <span class="text-red-500">*</span></label>
                <select id="faculty-designation" formControlName="designation" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900">
                  <option value="Professor">Professor</option>
                  <option value="Associate Professor">Associate Professor</option>
                  <option value="Assistant Professor">Assistant Professor</option>
                  <option value="Lecturer">Lecturer</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="faculty-qualification" class="block font-semibold text-slate-700 mb-1">Highest Qualification <span class="text-red-500">*</span></label>
                <input id="faculty-qualification" type="text" formControlName="qualification" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
              </div>
              <div>
                <label for="faculty-specialization" class="block font-semibold text-slate-700 mb-1">Subject Specialization</label>
                <input id="faculty-specialization" type="text" formControlName="specialization" placeholder="e.g. Cloud & AI Systems" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label for="faculty-exp" class="block font-semibold text-slate-700 mb-1">Experience (Years) <span class="text-red-500">*</span></label>
                <input id="faculty-exp" type="number" min="0" max="50" formControlName="experienceYears" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
              </div>
              <div>
                <label for="faculty-maxhrs" class="block font-semibold text-slate-700 mb-1">Max Hrs / Wk</label>
                <input id="faculty-maxhrs" type="number" min="4" max="24" formControlName="maxWeeklyHours" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
              </div>
              <div>
                <label for="faculty-joining" class="block font-semibold text-slate-700 mb-1">Date of Joining <span class="text-red-500">*</span></label>
                <input id="faculty-joining" type="date" formControlName="joiningDate" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
              </div>
            </div>

            <label class="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <input type="checkbox" formControlName="documentsVerified" class="w-4 h-4 rounded text-[#6D42E8] border-slate-300" />
              <span class="text-xs font-semibold text-slate-800">Academic & KYC documents verified by HR / Registrar</span>
            </label>
          </div>
        </form>
      </app-form-drawer>

      <!-- View Faculty Profile Drawer -->
      @if (viewingFaculty(); as fac) {
        <app-form-drawer
          [isOpen]="true"
          title="Faculty Profile & Workload"
          subtitle="Teaching assignments, weekly workload balance, and credential verification."
          widthClass="max-w-[580px]"
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

            <!-- Quick Status & Verification Bar -->
            <div class="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs">
              <button
                type="button"
                (click)="toggleVerification(fac)"
                class="px-3 py-1.5 rounded-lg border font-semibold cursor-pointer inline-flex items-center gap-1.5"
                [class]="fac.documentsVerified ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'"
              >
                <span class="material-icons text-sm">{{ fac.documentsVerified ? 'verified' : 'pending' }}</span>
                <span>{{ fac.documentsVerified ? 'Documents Verified' : 'Verify Documents' }}</span>
              </button>

              <button
                type="button"
                (click)="toggleStatus(fac)"
                class="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 font-semibold cursor-pointer inline-flex items-center gap-1.5"
              >
                <span class="material-icons text-sm">sync</span>
                <span>{{ fac.status === 'Active' ? 'Mark On Leave' : 'Mark Active' }}</span>
              </button>
            </div>

            <div class="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2.5 text-xs">
              <div class="font-bold uppercase tracking-wider text-purple-800 pb-1 border-b border-slate-200">
                Academic & Employment Record
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div><span class="text-slate-500 block text-[11px]">Qualification</span><span class="font-semibold text-slate-800">{{ fac.qualification }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Specialization</span><span class="font-semibold text-slate-800">{{ fac.specialization || 'General Core' }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Teaching Experience</span><span class="font-semibold text-slate-800">{{ fac.experience }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Assigned Weekly Load</span><span class="font-semibold text-indigo-700">{{ fac.workloadDisplay }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Date of Joining</span><span class="font-semibold text-slate-800">{{ fac.joiningDate }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Official Email</span><span class="font-semibold text-slate-800 truncate block">{{ fac.email }}</span></div>
              </div>
            </div>

            <!-- Live Assigned Subjects List -->
            <div class="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2.5 text-xs">
              <div class="font-bold uppercase tracking-wider text-purple-800 pb-1 border-b border-slate-200 flex items-center justify-between">
                <span>Assigned Subjects ({{ viewingAssignedSubjects().length }})</span>
                <span class="text-[11px] font-mono text-indigo-700">{{ fac.workloadDisplay }}</span>
              </div>
              <div class="space-y-1.5">
                @for (alloc of viewingAssignedSubjects(); track alloc.id) {
                  <div class="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                    <div class="min-w-0">
                      <p class="font-bold text-slate-900 truncate">{{ alloc.subject }}</p>
                      <p class="text-[11px] text-slate-500 truncate">{{ alloc.course }} · {{ alloc.semester }} ({{ alloc.section }})</p>
                    </div>
                    <span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-bold shrink-0">
                      {{ alloc.weeklyHours }} hrs/wk
                    </span>
                  </div>
                } @empty {
                  <p class="text-slate-500 py-2">No subjects allocated to this faculty member yet.</p>
                }
              </div>
            </div>
          </div>
        </app-form-drawer>
      }

      <app-confirm-dialog
        [isOpen]="isDeleteDialogOpen()"
        title="Delete Faculty Member"
        [message]="deleteDialogMessage()"
        confirmLabel="Delete Faculty"
        (cancelled)="closeDeleteDialog()"
        (confirmed)="confirmDelete()"
      />

    </div>
  `
})
export class FacultyPage {
  private readonly academicService = inject(AcademicService);
  private readonly facultyService = inject(FacultyService);

  protected readonly searchQuery = signal<string>('');
  protected readonly departmentFilter = signal<string>('');
  protected readonly designationFilter = signal<string>('');
  protected readonly bannerMessage = signal<string | null>(null);

  protected readonly isFormDrawerOpen = signal<boolean>(false);
  protected readonly editingFacultyId = signal<string | null>(null);
  protected readonly viewingFaculty = signal<FacultyRow | null>(null);

  protected readonly isDeleteDialogOpen = signal<boolean>(false);
  protected readonly facultyToDelete = signal<Faculty | null>(null);
  protected readonly deleteErrorMessage = signal<string | null>(null);
  protected readonly formErrorMessage = signal<string | null>(null);

  protected readonly departments = computed(() => this.academicService.departments());
  protected readonly workloadMap = computed(() => this.academicService.facultyWorkloadMap());

  protected readonly columns: TableColumn[] = [
    { key: 'name', header: 'Faculty', isAvatarCell: true, avatarInitialsKey: 'initials', subtextKey: 'email' },
    { key: 'employeeId', header: 'Employee ID', isMono: true, isBold: true },
    { key: 'department', header: 'Department' },
    { key: 'designation', header: 'Designation' },
    { key: 'workloadDisplay', header: 'Workload', align: 'center' },
    { key: 'verifiedDisplay', header: 'Docs', align: 'center' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  protected readonly customRowActions: TableCustomAction<FacultyRow>[] = [
    {
      id: 'toggle_status',
      label: 'Toggle Active / On Leave',
      icon: 'sync'
    },
    {
      id: 'toggle_verify',
      label: 'Toggle Doc Verification',
      icon: 'verified'
    }
  ];

  protected readonly stats = computed<StatItem[]>(() => {
    const s = this.facultyService.facultyStats();
    return [
      {
        label: 'Total Faculty Members',
        value: s.total,
        subtext: 'Teaching staff directory',
        icon: 'badge',
        iconBgClass: 'bg-purple-50 border-purple-100',
        iconColorClass: 'text-[#6D42E8]'
      },
      {
        label: 'Academic Hierarchy',
        value: s.total > 0 ? `${s.total} Staff` : '0 Staff',
        subtext: s.breakdown,
        icon: 'military_tech',
        iconBgClass: 'bg-indigo-50 border-indigo-100',
        iconColorClass: 'text-indigo-600'
      },
      {
        label: 'Departments Covered',
        value: s.departmentsCovered,
        subtext: 'With active faculty allocations',
        icon: 'account_balance',
        iconBgClass: 'bg-emerald-50 border-emerald-100',
        iconColorClass: 'text-emerald-600'
      }
    ];
  });

  protected readonly departmentFilterOptions = computed<FilterOption[]>(() => {
    const options: FilterOption[] = [{ label: 'All Departments', value: '' }];
    this.departments().forEach(d => options.push({ label: d.name, value: d.name }));
    return options;
  });

  protected readonly designationFilterOptions: FilterOption[] = [
    { label: 'All Designations', value: '' },
    { label: 'Professor', value: 'Professor' },
    { label: 'Associate Professor', value: 'Associate Professor' },
    { label: 'Assistant Professor', value: 'Assistant Professor' },
    { label: 'Lecturer', value: 'Lecturer' }
  ];

  protected readonly hasActiveFilters = computed(() => {
    return this.searchQuery().trim() !== '' || this.departmentFilter() !== '' || this.designationFilter() !== '';
  });

  protected readonly filteredFaculty = computed<FacultyRow[]>(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const dept = this.departmentFilter();
    const desig = this.designationFilter();
    const map = this.workloadMap();

    return this.facultyService.facultyList()
      .filter(f => {
        const matchesSearch =
          !query ||
          f.name.toLowerCase().includes(query) ||
          f.employeeId.toLowerCase().includes(query) ||
          f.email.toLowerCase().includes(query) ||
          (f.specialization || '').toLowerCase().includes(query) ||
          f.qualification.toLowerCase().includes(query);

        const matchesDept = !dept || f.department === dept;
        const matchesDesig = !desig || f.designation === desig;

        return matchesSearch && matchesDept && matchesDesig;
      })
      .map(f => {
        const assigned = map.get(f.name.trim().toLowerCase()) ?? 0;
        const cap = f.maxWeeklyHours ?? 18;
        return {
          ...f,
          workloadDisplay: `${assigned} / ${cap} hrs`,
          verifiedDisplay: f.documentsVerified ? 'Verified' : 'Pending'
        };
      });
  });

  protected readonly viewingAssignedSubjects = computed(() => {
    const fac = this.viewingFaculty();
    if (!fac) return [];
    const targetName = fac.name.trim().toLowerCase();
    return this.academicService.subjectAllocations().filter(a => a.faculty.trim().toLowerCase() === targetName);
  });

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
    specialization: new FormControl('', { nonNullable: true }),
    experienceYears: new FormControl<number>(5, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    maxWeeklyHours: new FormControl<number>(18, { nonNullable: true }),
    joiningDate: new FormControl(new Date().toISOString().split('T')[0], { nonNullable: true, validators: [Validators.required] }),
    documentsVerified: new FormControl<boolean>(true, { nonNullable: true })
  });

  protected resetFilters(): void {
    this.searchQuery.set('');
    this.departmentFilter.set('');
    this.designationFilter.set('');
  }

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
      specialization: '',
      experienceYears: 5,
      maxWeeklyHours: 18,
      joiningDate: new Date().toISOString().split('T')[0],
      documentsVerified: true
    });

    this.isFormDrawerOpen.set(true);
  }

  protected openEditDrawer(fac: FacultyRow): void {
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
      specialization: fac.specialization || '',
      experienceYears: fac.experienceYears,
      maxWeeklyHours: fac.maxWeeklyHours ?? 18,
      joiningDate: fac.joiningDate,
      documentsVerified: fac.documentsVerified ?? false
    });

    this.isFormDrawerOpen.set(true);
  }

  protected openViewDrawer(fac: FacultyRow): void {
    this.viewingFaculty.set(fac);
  }

  protected closeFormDrawer(): void {
    this.isFormDrawerOpen.set(false);
    this.formErrorMessage.set(null);
  }

  protected handleCustomAction(event: { actionId: string; row: FacultyRow }): void {
    if (event.actionId === 'toggle_status') {
      this.toggleStatus(event.row);
    } else if (event.actionId === 'toggle_verify') {
      this.toggleVerification(event.row);
    }
  }

  protected toggleStatus(fac: FacultyRow): void {
    const nextStatus: FacultyStatus = fac.status === 'Active' ? 'On Leave' : 'Active';
    this.facultyService.toggleFacultyStatus(fac.id, nextStatus);
    this.bannerMessage.set(`${fac.name} status updated to ${nextStatus}.`);
    const refreshed = this.filteredFaculty().find(f => f.id === fac.id);
    if (this.viewingFaculty()?.id === fac.id && refreshed) {
      this.viewingFaculty.set(refreshed);
    }
  }

  protected toggleVerification(fac: FacultyRow): void {
    this.facultyService.toggleDocumentVerification(fac.id);
    const refreshed = this.filteredFaculty().find(f => f.id === fac.id);
    if (this.viewingFaculty()?.id === fac.id && refreshed) {
      this.viewingFaculty.set(refreshed);
    }
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
        specialization: val.specialization.trim() || undefined,
        experienceYears: val.experienceYears,
        maxWeeklyHours: Number(val.maxWeeklyHours) || 18,
        joiningDate: val.joiningDate,
        status: val.status,
        documentsVerified: val.documentsVerified
      },
      this.editingFacultyId() || undefined
    );

    if (res.success) {
      this.bannerMessage.set(`${val.name} profile saved.`);
      this.closeFormDrawer();
    } else {
      this.formErrorMessage.set(res.error || 'Failed to save faculty record.');
    }
  }

  protected openDeleteDialog(fac: FacultyRow): void {
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
    if (this.deleteErrorMessage()) return this.deleteErrorMessage()!;
    return f ? `Are you sure you want to delete "${f.name}" (${f.employeeId})? This action cannot be undone.` : '';
  });

  protected confirmDelete(): void {
    const target = this.facultyToDelete();
    if (target) {
      const res = this.facultyService.deleteFaculty(target.id);
      if (res.success) {
        this.bannerMessage.set(`${target.name} removed from directory.`);
        this.closeDeleteDialog();
      } else {
        this.deleteErrorMessage.set(res.error || 'Cannot delete faculty.');
      }
    }
  }

  protected exportExcel(): void {
    exportToExcel(
      this.filteredFaculty().map(f => ({
        'Employee ID': f.employeeId,
        Name: f.name,
        Department: f.department,
        Designation: f.designation,
        Specialization: f.specialization || 'General',
        Qualification: f.qualification,
        Workload: f.workloadDisplay,
        'Docs Verified': f.verifiedDisplay,
        Status: f.status
      })),
      'EduERP_Faculty_Directory'
    );
  }

  protected exportPdf(): void {
    exportToPdf(
      'Faculty Directory & Teaching Workload',
      ['Emp ID', 'Faculty Name', 'Department', 'Designation', 'Workload', 'Docs', 'Status'],
      this.filteredFaculty().map(f => [
        f.employeeId,
        f.name,
        f.department,
        f.designation,
        f.workloadDisplay,
        f.verifiedDisplay,
        f.status
      ]),
      'EduERP_Faculty_Directory'
    );
  }
}
