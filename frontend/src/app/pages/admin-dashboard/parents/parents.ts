import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn, TableCustomAction } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { StudentsService } from '../../../services/students.service';
import { ParentsService } from '../../../services/parents.service';
import { Parent, ParentRelation } from '../../../models/faculty-parent.model';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

export interface ParentRow extends Parent {
  verificationBadge: string;
}

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

      @if (bannerMessage(); as msg) {
        <div class="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="material-icons text-base text-emerald-600">check_circle</span>
            <span>{{ msg }}</span>
          </div>
          <button type="button" (click)="bannerMessage.set(null)" class="text-emerald-600 hover:text-emerald-900 cursor-pointer">
            <span class="material-icons text-sm">close</span>
          </button>
        </div>
      }

      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <app-page-header
          class="flex-1"
          title="Parents & Guardians Directory"
          subtitle="Manage guardian profiles, contact verification, active portal status, and linked student wards."
          actionLabel="Add Parent"
          actionIcon="family_restroom"
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
        searchPlaceholder="Search by parent name, phone, email, or student name..."
        [searchValue]="searchQuery()"
        [filter1Options]="statusFilterOptions"
        [filter1Value]="statusFilter()"
        [hasActiveFilters]="hasActiveFilters()"
        (searchChange)="searchQuery.set($event)"
        (filter1Change)="statusFilter.set($event)"
        (resetClicked)="resetFilters()"
      />

      <app-data-table
        [columns]="columns"
        [data]="filteredParents()"
        idKey="id"
        [customActions]="customRowActions"
        emptyIcon="family_restroom"
        emptyTitle="No parent records found"
        emptyMessage="Try adjusting your search criteria or status filter."
        emptyActionLabel="Register Parent Record"
        (emptyActionClicked)="openAddDrawer()"
        (viewClicked)="openViewDrawer($event)"
        (editClicked)="openEditDrawer($event)"
        (deleteClicked)="openDeleteDialog($event)"
        (customActionClicked)="handleCustomAction($event)"
      />

      <!-- Add / Edit Form Drawer -->
      <app-form-drawer
        [isOpen]="isFormDrawerOpen()"
        [title]="editingParentId() ? 'Edit Parent Record' : 'Register Parent Profile'"
        [subtitle]="editingParentId() ? 'Update contact details or linked student wards.' : 'Enter guardian credentials and link enrolled students.'"
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
          <div class="space-y-3">
            <div class="flex items-center gap-2 pb-1 border-b border-[#E2E8F0]">
              <span class="material-icons text-sm text-[#6D42E8]">person</span>
              <h3 class="font-bold text-slate-900 uppercase tracking-wider text-[11px]">1. Guardian Personal & Contact Details</h3>
            </div>

            <div>
              <label for="parent-name" class="block font-semibold text-slate-700 mb-1">Parent / Guardian Name <span class="text-red-500">*</span></label>
              <input id="parent-name" type="text" formControlName="name" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="parent-relation" class="block font-semibold text-slate-700 mb-1">Relation to Student <span class="text-red-500">*</span></label>
                <select id="parent-relation" formControlName="relation" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900">
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>
              <div>
                <label for="parent-phone" class="block font-semibold text-slate-700 mb-1">Phone Number (10 Digits) <span class="text-red-500">*</span></label>
                <input id="parent-phone" type="tel" maxLength="10" formControlName="phone" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="parent-email" class="block font-semibold text-slate-700 mb-1">Email Address <span class="text-red-500">*</span></label>
                <input id="parent-email" type="email" formControlName="email" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
              </div>
              <div>
                <label for="parent-occupation" class="block font-semibold text-slate-700 mb-1">Occupation / Profession</label>
                <input id="parent-occupation" type="text" formControlName="occupation" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
              </div>
            </div>

            <div>
              <label for="parent-address" class="block font-semibold text-slate-700 mb-1">Residential Address <span class="text-red-500">*</span></label>
              <textarea id="parent-address" rows="2" formControlName="address" class="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-xl text-slate-900"></textarea>
            </div>

            <label class="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <input type="checkbox" formControlName="verified" class="w-4 h-4 rounded text-[#6D42E8] border-slate-300" />
              <span class="text-xs font-semibold text-slate-800">Mark guardian contact & relationship verified</span>
            </label>
          </div>

          <div class="space-y-3 pt-2">
            <div class="flex items-center justify-between pb-1 border-b border-[#E2E8F0]">
              <div class="flex items-center gap-2">
                <span class="material-icons text-sm text-[#6D42E8]">school</span>
                <h3 class="font-bold text-slate-900 uppercase tracking-wider text-[11px]">2. Linked Student(s) Selection</h3>
              </div>
              <span class="text-[11px] font-semibold text-[#6D42E8]">{{ selectedStudentIds().length }} Selected</span>
            </div>

            <input
              type="text"
              [value]="wardSearchQuery()"
              (input)="wardSearchQuery.set($any($event.target).value)"
              placeholder="Search student name or enrollment no..."
              class="w-full h-9 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-slate-800"
            />

            <div class="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 border border-[#E2E8F0] rounded-xl">
              @for (st of filteredWardOptions(); track st.id) {
                <label class="flex items-center justify-between p-2.5 bg-white rounded-lg border border-[#E2E8F0] hover:border-purple-300 transition-colors cursor-pointer text-xs">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      [checked]="isStudentSelected(st.id)"
                      (change)="toggleStudentSelection(st.id)"
                      class="w-4 h-4 rounded text-[#6D42E8] border-slate-300 cursor-pointer"
                    />
                    <div class="truncate">
                      <span class="font-bold text-slate-900 block truncate">{{ st.name }}</span>
                      <span class="text-[11px] text-slate-500 font-mono">{{ st.enrollmentNo }} • {{ st.course }}</span>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-50 text-[#6D42E8] shrink-0">
                    {{ st.semester }}
                  </span>
                </label>
              } @empty {
                <p class="py-4 text-center text-xs text-slate-500">No students match "{{ wardSearchQuery() }}".</p>
              }
            </div>
            @if (selectedStudentIds().length === 0) {
              <p class="text-[11px] text-red-500 font-medium">Please select at least one student to link.</p>
            }
          </div>
        </form>
      </app-form-drawer>

      <!-- View Parent Profile Drawer -->
      @if (viewingParent(); as par) {
        <app-form-drawer
          [isOpen]="true"
          title="Parent & Guardian Profile"
          subtitle="Registered guardian details, verification status, and linked student wards."
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
                <p class="text-xs text-slate-300 mt-1 truncate">{{ par.occupation || 'N/A' }} · {{ par.verificationBadge }}</p>
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs">
              <button
                type="button"
                (click)="toggleVerify(par)"
                class="px-3 py-1.5 rounded-lg border font-semibold cursor-pointer inline-flex items-center gap-1.5"
                [class]="par.verified ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'"
              >
                <span class="material-icons text-sm">{{ par.verified ? 'verified' : 'pending' }}</span>
                <span>{{ par.verified ? 'Verified Guardian' : 'Verify Guardian' }}</span>
              </button>
              <button
                type="button"
                (click)="toggleStatus(par)"
                class="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 font-semibold cursor-pointer inline-flex items-center gap-1.5"
              >
                <span class="material-icons text-sm">sync</span>
                <span>{{ par.status === 'Active' ? 'Deactivate Portal' : 'Activate Portal' }}</span>
              </button>
            </div>

            <div class="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2.5 text-xs">
              <div class="font-bold uppercase tracking-wider text-purple-800 pb-1 border-b border-slate-200">
                Linked Student Wards ({{ viewingLinkedWards().length }})
              </div>
              <div class="space-y-2">
                @for (ward of viewingLinkedWards(); track ward.id) {
                  <div class="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    <div class="min-w-0">
                      <p class="font-bold text-slate-900 truncate">{{ ward.name }}</p>
                      <p class="text-[11px] text-slate-500 font-mono truncate">{{ ward.enrollmentNo }} · {{ ward.course }}</p>
                    </div>
                    <span class="text-[10px] font-bold uppercase px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 shrink-0">
                      {{ ward.semester }}
                    </span>
                  </div>
                }
              </div>
            </div>

            <div class="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2 text-xs">
              <div class="font-bold uppercase tracking-wider text-purple-800 pb-1 border-b border-slate-200">
                Contact & Residential Address
              </div>
              <p class="text-slate-800 font-medium leading-relaxed">{{ par.address }}</p>
            </div>
          </div>
        </app-form-drawer>
      }

      <app-confirm-dialog
        [isOpen]="isDeleteDialogOpen()"
        title="Delete Parent Record"
        [message]="deleteDialogMessage()"
        confirmLabel="Delete Record"
        (cancelled)="isDeleteDialogOpen.set(false)"
        (confirmed)="confirmDelete()"
      />

    </div>
  `
})
export class ParentsPage {
  private readonly studentsService = inject(StudentsService);
  private readonly parentsService = inject(ParentsService);

  protected readonly searchQuery = signal<string>('');
  protected readonly statusFilter = signal<string>('');
  protected readonly wardSearchQuery = signal<string>('');
  protected readonly bannerMessage = signal<string | null>(null);

  protected readonly isFormDrawerOpen = signal<boolean>(false);
  protected readonly editingParentId = signal<string | null>(null);
  protected readonly viewingParent = signal<ParentRow | null>(null);
  protected readonly selectedStudentIds = signal<string[]>([]);

  protected readonly isDeleteDialogOpen = signal<boolean>(false);
  protected readonly parentToDelete = signal<Parent | null>(null);
  protected readonly formErrorMessage = signal<string | null>(null);

  protected readonly allStudents = computed(() => this.studentsService.students());

  protected readonly filteredWardOptions = computed(() => {
    const q = this.wardSearchQuery().trim().toLowerCase();
    return this.allStudents().filter(st => {
      if (!q) return true;
      return `${st.name} ${st.enrollmentNo} ${st.course}`.toLowerCase().includes(q);
    });
  });

  protected readonly viewingLinkedWards = computed(() => {
    const par = this.viewingParent();
    if (!par) return [];
    const students = this.allStudents();
    return par.studentIds.map(id => {
      const found = students.find(s => s.id === id);
      return (
        found || {
          id,
          name: 'Enrolled Student',
          enrollmentNo: id,
          course: 'Assigned Program',
          semester: 'Active'
        }
      );
    });
  });

  protected readonly columns: TableColumn[] = [
    { key: 'name', header: 'Parent Name', isAvatarCell: true, avatarInitialsKey: 'initials', subtextKey: 'email' },
    { key: 'relation', header: 'Relation', isBold: true },
    { key: 'phone', header: 'Phone' },
    { key: 'studentNames', header: 'Linked Student(s)', isTagListCell: true, tagsArrayKey: 'studentNames' },
    { key: 'verificationBadge', header: 'Verification', align: 'center' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  protected readonly customRowActions: TableCustomAction<ParentRow>[] = [
    {
      id: 'toggle_verify',
      label: 'Verify / Unverify Guardian',
      icon: 'verified'
    },
    {
      id: 'toggle_status',
      label: 'Toggle Active Status',
      icon: 'sync'
    }
  ];

  protected readonly stats = computed<StatItem[]>(() => {
    const s = this.parentsService.parentStats();
    return [
      {
        label: 'Total Parents Registered',
        value: s.totalParents,
        subtext: 'Active guardian directory',
        icon: 'family_restroom',
        iconBgClass: 'bg-purple-50 border-purple-100',
        iconColorClass: 'text-[#6D42E8]'
      },
      {
        label: 'Linked Student Wards',
        value: s.linkedStudents,
        subtext: 'Students with assigned guardian',
        icon: 'school',
        iconBgClass: 'bg-emerald-50 border-emerald-100',
        iconColorClass: 'text-emerald-600'
      },
      {
        label: 'Unlinked Students',
        value: s.unlinkedStudents,
        subtext: 'Pending guardian link',
        icon: 'person_off',
        iconBgClass: 'bg-amber-50 border-amber-100',
        iconColorClass: 'text-amber-600'
      }
    ];
  });

  protected readonly statusFilterOptions: FilterOption[] = [
    { label: 'All Statuses', value: '' },
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' }
  ];

  protected readonly hasActiveFilters = computed(() => {
    return this.searchQuery().trim() !== '' || this.statusFilter() !== '';
  });

  protected readonly filteredParents = computed<ParentRow[]>(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();

    return this.parentsService.parentsList()
      .filter(p => {
        const matchesSearch =
          !query ||
          p.name.toLowerCase().includes(query) ||
          p.phone.includes(query) ||
          p.email.toLowerCase().includes(query) ||
          p.studentNames.some(st => st.toLowerCase().includes(query));

        const matchesStatus = !status || p.status === status;
        return matchesSearch && matchesStatus;
      })
      .map(p => ({
        ...p,
        verificationBadge: p.verified ? 'Verified' : 'Pending'
      }));
  });

  protected readonly parentForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    relation: new FormControl<ParentRelation>('Father', { nonNullable: true, validators: [Validators.required] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{10}$/)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    occupation: new FormControl(''),
    address: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    status: new FormControl<'Active' | 'Inactive'>('Active', { nonNullable: true, validators: [Validators.required] }),
    verified: new FormControl<boolean>(true, { nonNullable: true })
  });

  protected resetFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('');
  }

  protected isStudentSelected(id: string): boolean {
    return this.selectedStudentIds().includes(id);
  }

  protected toggleStudentSelection(id: string): void {
    const current = this.selectedStudentIds();
    this.selectedStudentIds.set(current.includes(id) ? current.filter(i => i !== id) : [...current, id]);
  }

  protected openAddDrawer(): void {
    this.editingParentId.set(null);
    this.formErrorMessage.set(null);
    this.wardSearchQuery.set('');
    this.selectedStudentIds.set(this.allStudents()[0] ? [this.allStudents()[0].id] : []);

    this.parentForm.reset({
      name: '',
      relation: 'Father',
      phone: '',
      email: '',
      occupation: '',
      address: '',
      status: 'Active',
      verified: true
    });

    this.isFormDrawerOpen.set(true);
  }

  protected openEditDrawer(par: ParentRow): void {
    this.editingParentId.set(par.id);
    this.formErrorMessage.set(null);
    this.wardSearchQuery.set('');
    this.selectedStudentIds.set([...par.studentIds]);

    this.parentForm.reset({
      name: par.name,
      relation: par.relation,
      phone: par.phone,
      email: par.email,
      occupation: par.occupation,
      address: par.address,
      status: par.status,
      verified: par.verified ?? false
    });

    this.isFormDrawerOpen.set(true);
  }

  protected openViewDrawer(par: ParentRow): void {
    this.viewingParent.set(par);
  }

  protected closeFormDrawer(): void {
    this.isFormDrawerOpen.set(false);
    this.formErrorMessage.set(null);
  }

  protected handleCustomAction(event: { actionId: string; row: ParentRow }): void {
    if (event.actionId === 'toggle_verify') this.toggleVerify(event.row);
    else if (event.actionId === 'toggle_status') this.toggleStatus(event.row);
  }

  protected toggleVerify(par: ParentRow): void {
    this.parentsService.toggleParentVerification(par.id);
    this.bannerMessage.set(`Updated verification status for ${par.name}.`);
    const updated = this.filteredParents().find(p => p.id === par.id);
    if (this.viewingParent()?.id === par.id && updated) this.viewingParent.set(updated);
  }

  protected toggleStatus(par: ParentRow): void {
    this.parentsService.toggleParentStatus(par.id);
    this.bannerMessage.set(`Toggled portal status for ${par.name}.`);
    const updated = this.filteredParents().find(p => p.id === par.id);
    if (this.viewingParent()?.id === par.id && updated) this.viewingParent.set(updated);
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
        status: val.status,
        verified: val.verified
      },
      this.editingParentId() || undefined
    );

    if (res.success) {
      this.bannerMessage.set(`Guardian profile "${val.name}" saved.`);
      this.closeFormDrawer();
    } else {
      this.formErrorMessage.set(res.error || 'Failed to save parent profile.');
    }
  }

  protected openDeleteDialog(par: ParentRow): void {
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
      this.bannerMessage.set(`Deleted parent record for ${target.name}.`);
    }
    this.isDeleteDialogOpen.set(false);
    this.parentToDelete.set(null);
  }

  protected exportExcel(): void {
    exportToExcel(
      this.filteredParents().map(p => ({
        Name: p.name,
        Relation: p.relation,
        Phone: p.phone,
        Email: p.email,
        Occupation: p.occupation,
        'Linked Students': p.studentNames.join(', '),
        Verification: p.verificationBadge,
        Status: p.status
      })),
      'EduERP_Parents_Directory'
    );
  }

  protected exportPdf(): void {
    exportToPdf(
      'Parents & Guardians Directory',
      ['Parent Name', 'Relation', 'Phone', 'Email', 'Linked Students', 'Verification', 'Status'],
      this.filteredParents().map(p => [
        p.name,
        p.relation,
        p.phone,
        p.email,
        p.studentNames.join(', '),
        p.verificationBadge,
        p.status
      ]),
      'EduERP_Parents_Directory'
    );
  }
}
