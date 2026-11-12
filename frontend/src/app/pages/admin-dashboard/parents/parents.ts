import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { StudentsService } from '../../../services/students.service';
import { ParentsService } from '../../../services/parents.service';
import { Parent, ParentRelation } from '../../../models/faculty-parent.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-parents-page',
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
        title="Parents Directory"
        subtitle="Manage guardian records, emergency contacts, and linked student accounts."
        primaryActionLabel="Add Parent"
        primaryActionIcon="family_restroom"
        (primaryActionClicked)="openAddDrawer()"
      />

      <!-- 2. Stat Strip -->
      <app-stat-strip [items]="stats()" />

      <!-- 3. Data Toolbar -->
      <app-data-toolbar
        searchPlaceholder="Search by parent name, phone, email, or student name..."
        [searchValue]="searchQuery()"
        [filter1Options]="statusFilterOptions"
        [filter1Value]="statusFilter()"
        (searchChange)="searchQuery.set($event)"
        (filter1Change)="statusFilter.set($event)"
      />

      <!-- 4. Data Table Card -->
      <app-data-table
        [columns]="columns"
        [data]="filteredParents()"
        idKey="id"
        emptyIcon="family_restroom"
        emptyTitle="No parent records found"
        emptyMessage="Try adjusting your search criteria or status filter."
        emptyActionLabel="Register Parent Record"
        (emptyActionClicked)="openAddDrawer()"
        (viewClicked)="openViewDrawer($event)"
        (editClicked)="openEditDrawer($event)"
        (deleteClicked)="openDeleteDialog($event)"
      />

      <!-- 5. Add / Edit Form Drawer (560px Wide) -->
      <app-form-drawer
        [isOpen]="isFormDrawerOpen()"
        [title]="editingParentId() ? 'Edit Parent Record' : 'Register Parent Profile'"
        [subtitle]="editingParentId() ? 'Update contact details or linked student accounts.' : 'Enter guardian credentials and select linked student(s).'"
        [saveLabel]="editingParentId() ? 'Update Profile' : 'Save Parent Record'"
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

        <form [formGroup]="parentForm" class="space-y-4 text-xs sm:text-[13px]">
          
          <!-- SECTION 1: GUARDIAN PERSONAL DETAILS -->
          <div class="space-y-3">
            <div class="flex items-center gap-2 pb-1 border-b border-[#E2E8F0]">
              <span class="material-icons text-sm text-[#6D42E8]">person</span>
              <h3 class="font-bold text-slate-900 uppercase tracking-wider text-[11px]">1. Guardian Personal & Contact Details</h3>
            </div>

            <div>
              <label for="parent-name" class="block font-semibold text-slate-700 mb-1">
                Parent / Guardian Name <span class="text-red-500">*</span>
              </label>
              <input
                id="parent-name"
                type="text"
                formControlName="name"
                placeholder="e.g. Sanjay Verma"
                class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="parent-relation" class="block font-semibold text-slate-700 mb-1">
                  Relation to Student <span class="text-red-500">*</span>
                </label>
                <select
                  id="parent-relation"
                  formControlName="relation"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>

              <div>
                <label for="parent-phone" class="block font-semibold text-slate-700 mb-1">
                  Phone Number (10 Digits) <span class="text-red-500">*</span>
                </label>
                <input
                  id="parent-phone"
                  type="tel"
                  maxLength="10"
                  formControlName="phone"
                  placeholder="e.g. 9811223344"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="parent-email" class="block font-semibold text-slate-700 mb-1">
                  Email Address <span class="text-red-500">*</span>
                </label>
                <input
                  id="parent-email"
                  type="email"
                  formControlName="email"
                  placeholder="e.g. sanjay.verma@gmail.com"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                />
              </div>

              <div>
                <label for="parent-occupation" class="block font-semibold text-slate-700 mb-1">
                  Occupation / Profession
                </label>
                <input
                  id="parent-occupation"
                  type="text"
                  formControlName="occupation"
                  placeholder="e.g. Business / IT Consultant"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                />
              </div>
            </div>

            <div>
              <label for="parent-address" class="block font-semibold text-slate-700 mb-1">
                Residential Address <span class="text-red-500">*</span>
              </label>
              <textarea
                id="parent-address"
                rows="2"
                formControlName="address"
                placeholder="Full residential street address"
                class="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
              ></textarea>
            </div>
          </div>

          <!-- SECTION 2: LINKED STUDENTS SELECTION -->
          <div class="space-y-3 pt-2">
            <div class="flex items-center justify-between pb-1 border-b border-[#E2E8F0]">
              <div class="flex items-center gap-2">
                <span class="material-icons text-sm text-[#6D42E8]">school</span>
                <h3 class="font-bold text-slate-900 uppercase tracking-wider text-[11px]">2. Linked Student(s) Selection</h3>
              </div>
              <span class="text-[11px] font-semibold text-[#6D42E8]">
                {{ selectedStudentIds().length }} Selected
              </span>
            </div>

            <p class="text-xs text-[#64748B]">Select one or more students enrolled in the university to link with this parent profile:</p>

            <div class="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 border border-[#E2E8F0] rounded-xl">
              @for (st of allStudents(); track st.id) {
                <label
                  class="flex items-center justify-between p-2.5 bg-white rounded-lg border border-[#E2E8F0] hover:border-purple-300 transition-colors cursor-pointer text-xs"
                >
                  <div class="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      [checked]="isStudentSelected(st.id)"
                      (change)="toggleStudentSelection(st.id)"
                      class="w-4 h-4 rounded text-[#6D42E8] focus:ring-[#6D42E8] border-slate-300 cursor-pointer"
                    />
                    <div class="truncate">
                      <span class="font-bold text-slate-900 block truncate">{{ st.name }}</span>
                      <span class="text-[11px] text-slate-500 font-mono">{{ st.enrollmentNo }} • {{ st.course }}</span>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-50 text-[#6D42E8]">
                    {{ st.semester }}
                  </span>
                </label>
              }
            </div>
            @if (selectedStudentIds().length === 0) {
              <p class="text-[11px] text-red-500 font-medium">Please select at least one student to link.</p>
            }
          </div>

        </form>
      </app-form-drawer>

      <!-- 6. View Parent Profile Drawer -->
      @if (viewingParent(); as par) {
        <app-form-drawer
          [isOpen]="true"
          title="Parent & Guardian Profile"
          subtitle="Read-only view of registered parent and linked student accounts."
          widthClass="max-w-[560px]"
          [showSaveButton]="false"
          (closed)="viewingParent.set(null)"
        >
          <div class="space-y-4">
            
            <div class="p-4 bg-gradient-to-r from-[#1A1745] to-[#2E286E] text-white rounded-2xl shadow-sm flex items-center gap-4">
              <div class="w-14 h-14 rounded-full bg-gradient-to-tr from-[#6D42E8] to-[#D946EF] p-0.5 shrink-0 shadow-md">
                <div class="w-full h-full rounded-full bg-[#1A1745] flex items-center justify-center text-lg font-extrabold text-white uppercase">
                  {{ par.initials }}
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <h3 class="text-base font-bold truncate">{{ par.name }}</h3>
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/10 text-emerald-300 border border-white/20">
                    {{ par.relation }}
                  </span>
                </div>
                <p class="text-xs text-purple-200 mt-0.5">{{ par.phone }} • {{ par.email }}</p>
                <p class="text-xs text-slate-300 mt-1 truncate">{{ par.occupation || 'N/A' }}</p>
              </div>
            </div>

            <div class="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2.5 text-xs">
              <div class="font-bold text-slate-900 uppercase tracking-wider text-purple-800 pb-1 border-b border-slate-200">
                Linked Student Wards ({{ par.studentNames.length }})
              </div>
              <div class="space-y-2">
                @for (name of par.studentNames; track name) {
                  <div class="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="material-icons text-base text-[#6D42E8]">school</span>
                      <span class="font-bold text-slate-900 text-xs">{{ name }}</span>
                    </div>
                    <span class="text-[10px] font-bold uppercase px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                      Enrolled Ward
                    </span>
                  </div>
                }
              </div>
            </div>

            <div class="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2 text-xs">
              <div class="font-bold text-slate-900 uppercase tracking-wider text-purple-800 pb-1 border-b border-slate-200">
                Contact & Residential Address
              </div>
              <p class="text-slate-800 font-medium leading-relaxed">{{ par.address }}</p>
            </div>

          </div>
        </app-form-drawer>
      }

      <!-- 7. Confirm Delete Dialog -->
      <app-confirm-dialog
        [isOpen]="isDeleteDialogOpen()"
        title="Delete Parent Record"
        [message]="deleteDialogMessage()"
        confirmLabel="Delete Record"
        (closed)="isDeleteDialogOpen.set(false)"
        (confirmed)="confirmDelete()"
      />

    </div>
  `
})
export class ParentsPage {
  private readonly studentsService = inject(StudentsService);
  private readonly parentsService = inject(ParentsService);

  // Filters & State
  protected readonly searchQuery = signal<string>('');
  protected readonly statusFilter = signal<string>('');

  protected readonly isFormDrawerOpen = signal<boolean>(false);
  protected readonly editingParentId = signal<string | null>(null);
  protected readonly viewingParent = signal<Parent | null>(null);
  protected readonly selectedStudentIds = signal<string[]>([]);

  protected readonly isDeleteDialogOpen = signal<boolean>(false);
  protected readonly parentToDelete = signal<Parent | null>(null);
  protected readonly formErrorMessage = signal<string | null>(null);

  protected readonly allStudents = computed(() => this.studentsService.students());

  // Table Columns
  protected readonly columns: TableColumn[] = [
    { key: 'name', header: 'Parent Name', isAvatarCell: true, avatarInitialsKey: 'initials', subtextKey: 'email' },
    { key: 'relation', header: 'Relation', isBold: true },
    { key: 'phone', header: 'Phone' },
    { key: 'email', header: 'Email' },
    { key: 'studentNames', header: 'Linked Student(s)', isTagListCell: true, tagsArrayKey: 'studentNames' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  // Stat Strip
  protected readonly stats = computed<StatItem[]>(() => {
    const s = this.parentsService.parentStats();
    return [
      { label: 'Total Parents Registered', value: s.totalParents, helperText: 'Active guardian directory', icon: 'family_restroom', colorClass: 'text-[#6D42E8] bg-purple-50' },
      { label: 'Linked Student Wards', value: s.linkedStudents, helperText: 'Students with assigned parent info', icon: 'school', colorClass: 'text-emerald-600 bg-emerald-50' },
      { label: 'Unlinked Students', value: s.unlinkedStudents, helperText: 'Pending guardian link', icon: 'person_off', colorClass: 'text-amber-600 bg-amber-50' }
    ];
  });

  // Status Filter Options
  protected readonly statusFilterOptions: FilterOption[] = [
    { label: 'All Statuses', value: '' },
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' }
  ];

  // Filtered Parents Dataset
  protected readonly filteredParents = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();

    return this.parentsService.parentsList().filter(p => {
      const matchesSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.phone.includes(query) ||
        p.email.toLowerCase().includes(query) ||
        p.studentNames.some(st => st.toLowerCase().includes(query));

      const matchesStatus = !status || p.status === status;

      return matchesSearch && matchesStatus;
    });
  });

  // Reactive Form Definition
  protected readonly parentForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    relation: new FormControl<ParentRelation>('Father', { nonNullable: true, validators: [Validators.required] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{10}$/)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    occupation: new FormControl(''),
    address: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    status: new FormControl<'Active' | 'Inactive'>('Active', { nonNullable: true, validators: [Validators.required] })
  });

  protected isStudentSelected(id: string): boolean {
    return this.selectedStudentIds().includes(id);
  }

  protected toggleStudentSelection(id: string): void {
    const current = this.selectedStudentIds();
    if (current.includes(id)) {
      this.selectedStudentIds.set(current.filter(i => i !== id));
    } else {
      this.selectedStudentIds.set([...current, id]);
    }
  }

  protected openAddDrawer(): void {
    this.editingParentId.set(null);
    this.formErrorMessage.set(null);
    this.selectedStudentIds.set(this.allStudents()[0] ? [this.allStudents()[0].id] : []);

    this.parentForm.reset({
      name: '',
      relation: 'Father',
      phone: '',
      email: '',
      occupation: '',
      address: '',
      status: 'Active'
    });

    this.isFormDrawerOpen.set(true);
  }

  protected openEditDrawer(par: Parent): void {
    this.editingParentId.set(par.id);
    this.formErrorMessage.set(null);
    this.selectedStudentIds.set([...par.studentIds]);

    this.parentForm.reset({
      name: par.name,
      relation: par.relation,
      phone: par.phone,
      email: par.email,
      occupation: par.occupation,
      address: par.address,
      status: par.status
    });

    this.isFormDrawerOpen.set(true);
  }

  protected openViewDrawer(par: Parent): void {
    this.viewingParent.set(par);
  }

  protected closeFormDrawer(): void {
    this.isFormDrawerOpen.set(false);
    this.formErrorMessage.set(null);
  }

  protected submitForm(): void {
    this.parentForm.markAllAsTouched();
    if (this.parentForm.invalid) {
      this.formErrorMessage.set('Please fill in all required parent details correctly.');
      return;
    }
    if (this.selectedStudentIds().length === 0) {
      this.formErrorMessage.set('You must select at least one student to link with this parent profile.');
      return;
    }

    const val = this.parentForm.getRawValue();

    const res = this.parentsService.saveParent(
      {
        name: val.name,
        relation: val.relation,
        phone: val.phone,
        email: val.email,
        occupation: val.occupation || 'N/A',
        address: val.address,
        studentIds: this.selectedStudentIds(),
        status: val.status
      },
      this.editingParentId() || undefined
    );

    if (res.success) {
      this.closeFormDrawer();
    } else {
      this.formErrorMessage.set(res.error || 'Failed to save parent profile.');
    }
  }

  protected openDeleteDialog(par: Parent): void {
    this.parentToDelete.set(par);
    this.isDeleteDialogOpen.set(true);
  }

  protected readonly deleteDialogMessage = computed(() => {
    const p = this.parentToDelete();
    return p ? `Are you sure you want to delete parent record "${p.name}"? This action cannot be undone.` : '';
  });

  protected confirmDelete(): void {
    const target = this.parentToDelete();
    if (target) {
      this.parentsService.deleteParent(target.id);
    }
    this.isDeleteDialogOpen.set(false);
    this.parentToDelete.set(null);
  }
}
