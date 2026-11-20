import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn, TableCustomAction } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { UserAccountsService } from '../../../services/user-accounts.service';
import { AuthSessionService } from '../../../services/auth-session.service';
import { StudentsService } from '../../../services/students.service';
import { FacultyService } from '../../../services/faculty.service';
import { ParentsService } from '../../../services/parents.service';
import { UserAccount, ProfileType } from '../../../models/user-role.model';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

export interface UserAccountRow extends UserAccount {
  securityDisplay: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-user-accounts-page',
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
    <div class="flex flex-col gap-5 max-w-[1400px] mx-auto w-full font-sans relative">

      @if (passwordResetToast(); as toast) {
        <div class="fixed top-20 right-6 z-50 p-4 bg-emerald-900 text-white rounded-2xl shadow-2xl border border-emerald-500 max-w-md w-full">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <span class="material-icons text-xl text-emerald-400">key</span>
              <div>
                <h4 class="font-extrabold text-sm text-white">Password Reset Successfully</h4>
                <p class="text-xs text-emerald-200 mt-0.5">Temporary password for <span class="font-mono font-bold text-white">&#64;{{ toast.username }}</span>:</p>
              </div>
            </div>
            <button type="button" (click)="passwordResetToast.set(null)" class="text-emerald-300 hover:text-white p-1 cursor-pointer">
              <span class="material-icons text-sm">close</span>
            </button>
          </div>
          <div class="mt-3 p-2.5 bg-black/40 rounded-xl flex items-center justify-between font-mono text-sm border border-white/10">
            <span class="font-bold text-amber-300 tracking-wider">{{ toast.tempPass }}</span>
            <span class="text-[10px] text-emerald-300 font-sans font-semibold uppercase px-2 py-0.5 bg-emerald-500/20 rounded-md">
              Must Change On Login
            </span>
          </div>
        </div>
      }

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
          title="User Accounts"
          subtitle="Manage system login credentials, role assignments, account lockouts, and password security policies."
          actionLabel="Create Account"
          actionIcon="manage_accounts"
          (actionClicked)="openCreateDrawer()"
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
        searchPlaceholder="Search by name, email, or username..."
        [searchValue]="searchQuery()"
        [filter1Options]="roleFilterOptions()"
        [filter1Value]="roleFilter()"
        [filter2Options]="statusFilterOptions"
        [filter2Value]="statusFilter()"
        [hasActiveFilters]="hasActiveFilters()"
        (searchChange)="searchQuery.set($event)"
        (filter1Change)="roleFilter.set($event)"
        (filter2Change)="statusFilter.set($event)"
        (resetClicked)="resetFilters()"
      />

      <app-data-table
        [columns]="columns"
        [data]="filteredUsers()"
        idKey="id"
        [hideEdit]="true"
        [customActions]="customRowActions"
        emptyIcon="manage_accounts"
        emptyTitle="No user accounts found"
        emptyMessage="Try adjusting your search query or role filter."
        emptyActionLabel="Create User Account"
        (emptyActionClicked)="openCreateDrawer()"
        (viewClicked)="openViewDrawer($event)"
        (deleteClicked)="openDeleteDialog($event)"
        (customActionClicked)="handleCustomAction($event)"
      />

      <!-- Create Account Drawer -->
      <app-form-drawer
        [isOpen]="isDrawerOpen()"
        title="Create New User Account"
        subtitle="Link a student, faculty, parent, or staff member to a new system login."
        saveLabel="Create User Account"
        widthClass="max-w-[560px]"
        (closed)="closeDrawer()"
        (saved)="submitForm()"
      >
        @if (formErrorMessage()) {
          <div class="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 mb-3">
            <span class="material-icons text-base text-red-500">error</span>
            <span>{{ formErrorMessage() }}</span>
          </div>
        }

        <form [formGroup]="userForm" class="space-y-4 text-xs sm:text-[13px]">
          <div class="space-y-3">
            <div class="flex items-center gap-2 pb-1 border-b border-[#E2E8F0]">
              <span class="material-icons text-sm text-[#6D42E8]">badge</span>
              <h3 class="font-bold text-slate-900 uppercase tracking-wider text-[11px]">1. Profile Type & Person Linkage</h3>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="usr-profile-type" class="block font-semibold text-slate-700 mb-1">Profile Type <span class="text-red-500">*</span></label>
                <select id="usr-profile-type" formControlName="profileType" (change)="onProfileTypeChange($event)" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900">
                  <option value="Student">Student</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Parent">Parent</option>
                  <option value="Staff">Staff / Admin</option>
                </select>
              </div>
              <div>
                <label for="usr-role" class="block font-semibold text-slate-700 mb-1">System Role Assignment <span class="text-red-500">*</span></label>
                <select id="usr-role" formControlName="role" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900">
                  @for (r of roles(); track r.id) {
                    <option [value]="r.name">{{ r.name }}</option>
                  }
                </select>
              </div>
            </div>

            @if (userForm.controls.profileType.value !== 'Staff') {
              <div>
                <label for="usr-person-select" class="block font-semibold text-slate-700 mb-1">Select Person to Link <span class="text-red-500">*</span></label>
                <select id="usr-person-select" (change)="onPersonSelected($event)" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900">
                  <option value="">-- Choose Unlinked Person --</option>
                  @for (p of availablePeopleToLink(); track p.id) {
                    <option [value]="p.id">{{ p.name }} ({{ p.email }})</option>
                  }
                </select>
                <p class="text-[11px] text-[#64748B] mt-1">Listing individuals without an active login account.</p>
              </div>
            }

            <div>
              <label for="usr-full-name" class="block font-semibold text-slate-700 mb-1">Account Holder Name <span class="text-red-500">*</span></label>
              <input id="usr-full-name" type="text" formControlName="name" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
            </div>
          </div>

          <div class="space-y-3 pt-2">
            <div class="flex items-center gap-2 pb-1 border-b border-[#E2E8F0]">
              <span class="material-icons text-sm text-[#6D42E8]">key</span>
              <h3 class="font-bold text-slate-900 uppercase tracking-wider text-[11px]">2. Credentials & Password Security</h3>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="usr-email" class="block font-semibold text-slate-700 mb-1">Email Address <span class="text-red-500">*</span></label>
                <input id="usr-email" type="email" formControlName="email" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
              </div>
              <div>
                <label for="usr-username" class="block font-semibold text-slate-700 mb-1">Username <span class="text-red-500">*</span></label>
                <input id="usr-username" type="text" formControlName="username" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 font-mono" />
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label for="usr-password" class="block font-semibold text-slate-700">Temporary Password <span class="text-red-500">*</span></label>
                <span
                  class="text-[11px] font-bold px-2 py-0.5 rounded-full uppercase"
                  [class]="passwordStrength() === 'Weak' ? 'bg-red-100 text-red-700' : passwordStrength() === 'Strong' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'"
                >
                  {{ passwordStrength() }} Password
                </span>
              </div>
              <input
                id="usr-password"
                type="text"
                formControlName="tempPassword"
                (input)="assessPasswordStrength($event)"
                class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-slate-900 font-mono"
              />
            </div>

            <label class="flex items-center gap-2.5 p-3 bg-purple-50/60 rounded-xl border border-purple-100 cursor-pointer">
              <input type="checkbox" formControlName="forcePasswordChange" class="w-4 h-4 rounded text-[#6D42E8] border-purple-300" />
              <div class="text-xs">
                <span class="font-bold text-slate-900 block">Require password change on first sign-in</span>
                <span class="text-[11px] text-slate-500">User will be prompted to choose a new password upon logging in.</span>
              </div>
            </label>
          </div>
        </form>
      </app-form-drawer>

      <!-- View User Details Drawer -->
      @if (viewingUser(); as usr) {
        <app-form-drawer
          [isOpen]="true"
          title="User Account Details"
          subtitle="Account security state, lock status, active sessions, and linked profile."
          widthClass="max-w-[560px]"
          [showSaveButton]="false"
          (closed)="viewingUser.set(null)"
        >
          <div class="space-y-4">
            <div class="p-4 bg-gradient-to-r from-[#1A1745] to-[#2E286E] text-white rounded-2xl shadow-sm flex items-center gap-4">
              <div class="w-14 h-14 rounded-full bg-gradient-to-tr from-[#6D42E8] to-[#D946EF] p-0.5 shrink-0 shadow-md">
                <div class="w-full h-full rounded-full bg-[#1A1745] flex items-center justify-center text-lg font-extrabold text-white uppercase">
                  {{ usr.initials }}
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <h3 class="text-base font-bold truncate">{{ usr.name }}</h3>
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/10 text-emerald-300 border border-white/20">
                    {{ usr.isLocked ? 'Locked' : usr.status }}
                  </span>
                </div>
                <p class="text-xs text-purple-200 font-mono mt-0.5">&#64;{{ usr.username }} • {{ usr.role }}</p>
                <p class="text-xs text-slate-300 mt-1 truncate">{{ usr.email }}</p>
              </div>
            </div>

            <div class="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2.5 text-xs">
              <div class="font-bold uppercase tracking-wider text-purple-800 pb-1 border-b border-slate-200">
                Account & Security Information
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div><span class="text-slate-500 block text-[11px]">Username</span><span class="font-semibold font-mono text-slate-800">&#64;{{ usr.username }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Assigned Role</span><span class="font-semibold text-slate-800">{{ usr.role }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Profile Category</span><span class="font-semibold text-slate-800">{{ usr.profileType }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Last Activity</span><span class="font-semibold text-slate-800">{{ usr.lastLogin }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Security Lock State</span><span class="font-semibold" [class]="usr.isLocked ? 'text-red-600' : 'text-emerald-700'">{{ usr.isLocked ? 'Locked' : 'Unlocked' }} ({{ usr.failedLoginAttempts ?? 0 }} failed)</span></div>
                <div><span class="text-slate-500 block text-[11px]">Active Sessions</span><span class="font-semibold text-slate-800">{{ usr.activeSessionsCount ?? 0 }} active</span></div>
                <div class="col-span-2"><span class="text-slate-500 block text-[11px]">Linked ERP Profile</span><span class="font-semibold text-slate-800">{{ usr.linkedProfileName }}</span></div>
              </div>
            </div>
          </div>
        </app-form-drawer>
      }

      <app-confirm-dialog
        [isOpen]="isDeleteDialogOpen()"
        title="Delete User Account"
        [message]="deleteDialogMessage()"
        confirmLabel="Delete Account"
        (cancelled)="closeDeleteDialog()"
        (confirmed)="confirmDelete()"
      />

    </div>
  `
})
export class UserAccountsPage {
  private readonly userAccountsService = inject(UserAccountsService);
  private readonly authSession = inject(AuthSessionService);
  private readonly studentsService = inject(StudentsService);
  private readonly facultyService = inject(FacultyService);
  private readonly parentsService = inject(ParentsService);

  protected readonly searchQuery = signal<string>('');
  protected readonly roleFilter = signal<string>('');
  protected readonly statusFilter = signal<string>('');
  protected readonly bannerMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  protected readonly isDrawerOpen = signal<boolean>(false);
  protected readonly viewingUser = signal<UserAccountRow | null>(null);

  protected readonly isDeleteDialogOpen = signal<boolean>(false);
  protected readonly userToDelete = signal<UserAccount | null>(null);
  protected readonly deleteErrorMessage = signal<string | null>(null);
  protected readonly formErrorMessage = signal<string | null>(null);

  protected readonly passwordResetToast = signal<{ username: string; tempPass: string } | null>(null);
  protected readonly passwordStrength = signal<'Weak' | 'Medium' | 'Strong'>('Medium');

  protected readonly roles = computed(() => this.userAccountsService.roles());

  protected readonly columns: TableColumn[] = [
    { key: 'name', header: 'User', isAvatarCell: true, avatarInitialsKey: 'initials', subtextKey: 'email' },
    { key: 'username', header: 'Username', isMono: true, isBold: true },
    { key: 'role', header: 'Role', isBadge: true },
    { key: 'linkedProfileName', header: 'Linked Profile' },
    { key: 'securityDisplay', header: 'Lock / Sessions' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  protected readonly customRowActions: TableCustomAction<UserAccountRow>[] = [
    { id: 'reset_pass', label: 'Reset Password', icon: 'key' },
    { id: 'toggle_lock', label: 'Lock / Unlock Account', icon: 'lock' },
    { id: 'toggle_status', label: 'Toggle Active Status', icon: 'sync' }
  ];

  protected readonly stats = computed<StatItem[]>(() => {
    const s = this.userAccountsService.userStats();
    return [
      {
        label: 'Total User Accounts',
        value: s.total,
        subtext: 'Active ERP login profiles',
        icon: 'manage_accounts',
        iconBgClass: 'bg-purple-50 border-purple-100',
        iconColorClass: 'text-[#6D42E8]'
      },
      {
        label: 'Active & Unlocked',
        value: s.active,
        subtext: 'Permitted to sign in',
        icon: 'check_circle',
        iconBgClass: 'bg-emerald-50 border-emerald-100',
        iconColorClass: 'text-emerald-600'
      },
      {
        label: 'Locked / Suspended',
        value: s.inactive,
        subtext: 'Access restricted',
        icon: 'block',
        iconBgClass: 'bg-amber-50 border-amber-100',
        iconColorClass: 'text-amber-600'
      }
    ];
  });

  protected readonly roleFilterOptions = computed<FilterOption[]>(() => {
    const options: FilterOption[] = [{ label: 'All Roles', value: '' }];
    this.roles().forEach(r => options.push({ label: r.name, value: r.name }));
    return options;
  });

  protected readonly statusFilterOptions: FilterOption[] = [
    { label: 'All Statuses', value: '' },
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' }
  ];

  protected readonly hasActiveFilters = computed(() => {
    return this.searchQuery().trim() !== '' || this.roleFilter() !== '' || this.statusFilter() !== '';
  });

  protected readonly filteredUsers = computed<UserAccountRow[]>(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const role = this.roleFilter();
    const status = this.statusFilter();

    return this.userAccountsService.users()
      .filter(u => {
        const matchesSearch =
          !query ||
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.username.toLowerCase().includes(query);

        const matchesRole = !role || u.role === role;
        const matchesStatus = !status || u.status === status;
        return matchesSearch && matchesRole && matchesStatus;
      })
      .map(u => ({
        ...u,
        securityDisplay: u.isLocked
          ? `Locked (${u.failedLoginAttempts ?? 0} fails)`
          : `Unlocked · ${u.activeSessionsCount ?? 0} sess`
      }));
  });

  protected readonly availablePeopleToLink = computed(() => {
    const type = this.userForm.controls.profileType.value;
    const existingUsers = this.userAccountsService.users();
    const existingLinkedIds = new Set(existingUsers.map(u => u.linkedProfileId).filter(Boolean));

    if (type === 'Student') {
      return this.studentsService.students()
        .filter(s => !existingLinkedIds.has(s.id))
        .map(s => ({ id: s.id, name: s.name, email: s.email }));
    }
    if (type === 'Faculty') {
      return this.facultyService.facultyList()
        .filter(f => !existingLinkedIds.has(f.id))
        .map(f => ({ id: f.id, name: f.name, email: f.email }));
    }
    if (type === 'Parent') {
      return this.parentsService.parentsList()
        .filter(p => !existingLinkedIds.has(p.id))
        .map(p => ({ id: p.id, name: p.name, email: p.email }));
    }
    return [];
  });

  protected readonly userForm = new FormGroup({
    profileType: new FormControl<ProfileType>('Student', { nonNullable: true, validators: [Validators.required] }),
    role: new FormControl('Student', { nonNullable: true, validators: [Validators.required] }),
    linkedProfileId: new FormControl(''),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    tempPassword: new FormControl('EduERP#2026', { nonNullable: true, validators: [Validators.required] }),
    forcePasswordChange: new FormControl(true, { nonNullable: true })
  });

  protected resetFilters(): void {
    this.searchQuery.set('');
    this.roleFilter.set('');
    this.statusFilter.set('');
  }

  protected assessPasswordStrength(event: Event): void {
    const pass = (event.target as HTMLInputElement).value;
    if (pass.length < 6) this.passwordStrength.set('Weak');
    else if (pass.length >= 10 && /[A-Z]/.test(pass) && /[0-9]/.test(pass)) this.passwordStrength.set('Strong');
    else this.passwordStrength.set('Medium');
  }

  protected onProfileTypeChange(event: Event): void {
    const type = (event.target as HTMLSelectElement).value as ProfileType;
    if (type === 'Student') this.userForm.patchValue({ role: 'Student' });
    else if (type === 'Faculty') this.userForm.patchValue({ role: 'Faculty' });
    else if (type === 'Parent') this.userForm.patchValue({ role: 'Parent' });
    else this.userForm.patchValue({ role: 'Admin' });
  }

  protected onPersonSelected(event: Event): void {
    const personId = (event.target as HTMLSelectElement).value;
    const type = this.userForm.controls.profileType.value;

    if (type === 'Student') {
      const match = this.studentsService.students().find(s => s.id === personId);
      if (match) {
        this.userForm.patchValue({
          linkedProfileId: match.id,
          name: match.name,
          email: match.email,
          username: match.name.toLowerCase().replace(/\s+/g, '_')
        });
      }
    } else if (type === 'Faculty') {
      const match = this.facultyService.facultyList().find(f => f.id === personId);
      if (match) {
        this.userForm.patchValue({
          linkedProfileId: match.id,
          name: match.name,
          email: match.email,
          username: match.name.toLowerCase().replace(/^(dr\.|prof\.)\s+/, '').replace(/\s+/g, '_')
        });
      }
    } else if (type === 'Parent') {
      const match = this.parentsService.parentsList().find(p => p.id === personId);
      if (match) {
        this.userForm.patchValue({
          linkedProfileId: match.id,
          name: match.name,
          email: match.email,
          username: match.name.toLowerCase().replace(/\s+/g, '_')
        });
      }
    }
  }

  protected openCreateDrawer(): void {
    this.formErrorMessage.set(null);
    const firstUnlinkedStudent = this.availablePeopleToLink()[0];

    this.userForm.reset({
      profileType: 'Student',
      role: 'Student',
      linkedProfileId: firstUnlinkedStudent ? firstUnlinkedStudent.id : '',
      name: firstUnlinkedStudent ? firstUnlinkedStudent.name : '',
      email: firstUnlinkedStudent ? firstUnlinkedStudent.email : '',
      username: firstUnlinkedStudent ? firstUnlinkedStudent.name.toLowerCase().replace(/\s+/g, '_') : 'new_user',
      tempPassword: `Edu#${Math.floor(100000 + Math.random() * 900000)}`,
      forcePasswordChange: true
    });

    this.isDrawerOpen.set(true);
  }

  protected openViewDrawer(usr: UserAccountRow): void {
    this.viewingUser.set(usr);
  }

  protected closeDrawer(): void {
    this.isDrawerOpen.set(false);
    this.formErrorMessage.set(null);
  }

  protected handleCustomAction(event: { actionId: string; row: UserAccountRow }): void {
    const { actionId, row } = event;
    if (actionId === 'reset_pass') {
      const res = this.userAccountsService.resetPassword(row.id);
      this.passwordResetToast.set({ username: res.username, tempPass: res.tempPass });
    } else if (actionId === 'toggle_status') {
      const res = this.userAccountsService.toggleUserStatus(row.id);
      if (!res.success && res.error) {
        this.bannerMessage.set({ type: 'error', text: res.error });
      } else {
        this.bannerMessage.set({ type: 'success', text: `Updated active status for @${row.username}.` });
      }
    } else if (actionId === 'toggle_lock') {
      const res = this.userAccountsService.toggleLockUser(row.id);
      if (!res.success && res.error) {
        this.bannerMessage.set({ type: 'error', text: res.error });
      } else {
        this.bannerMessage.set({
          type: 'success',
          text: res.locked ? `Locked account @${row.username}.` : `Unlocked account @${row.username}.`
        });
      }
    }
  }

  protected submitForm(): void {
    this.userForm.markAllAsTouched();
    if (this.userForm.invalid) {
      this.formErrorMessage.set('Please fill in all required user details correctly.');
      return;
    }

    const val = this.userForm.getRawValue();
    let linkedProfileName = `Staff: ${val.name}`;
    if (val.profileType === 'Student') linkedProfileName = `Student: ${val.name}`;
    else if (val.profileType === 'Faculty') linkedProfileName = `Faculty: ${val.name}`;
    else if (val.profileType === 'Parent') linkedProfileName = `Parent: ${val.name}`;

    if (val.role === 'Admin' || val.role === 'Super Admin') {
      this.authSession
        .createAdminAccount({
          name: val.name,
          email: val.email,
          username: val.username,
          password: val.tempPassword,
          isSuperAdmin: val.role === 'Super Admin'
        })
        .subscribe({
          next: () => {
            const res = this.userAccountsService.saveUserAccount({
              name: val.name,
              email: val.email,
              username: val.username,
              role: val.role,
              profileType: val.profileType,
              linkedProfileId: val.linkedProfileId || undefined,
              linkedProfileName,
              status: 'Active',
              forcePasswordChange: val.forcePasswordChange
            });
            if (res.success) {
              this.bannerMessage.set({ type: 'success', text: `Account @${val.username} provisioned.` });
              this.closeDrawer();
            } else {
              this.formErrorMessage.set(res.error || 'Failed to create user account.');
            }
          },
          error: (err: { error?: { message?: string } }) => {
            this.formErrorMessage.set(
              err?.error?.message || 'Backend rejected admin creation. Ensure password meets complexity rules.'
            );
          }
        });
      return;
    }

    const res = this.userAccountsService.saveUserAccount({
      name: val.name,
      email: val.email,
      username: val.username,
      role: val.role,
      profileType: val.profileType,
      linkedProfileId: val.linkedProfileId || undefined,
      linkedProfileName,
      status: 'Active',
      forcePasswordChange: val.forcePasswordChange
    });

    if (res.success) {
      this.bannerMessage.set({ type: 'success', text: `Account @${val.username} created.` });
      this.closeDrawer();
    } else {
      this.formErrorMessage.set(res.error || 'Failed to create user account.');
    }
  }

  protected openDeleteDialog(usr: UserAccountRow): void {
    this.userToDelete.set(usr);
    this.deleteErrorMessage.set(null);
    this.isDeleteDialogOpen.set(true);
  }

  protected closeDeleteDialog(): void {
    this.isDeleteDialogOpen.set(false);
    this.userToDelete.set(null);
    this.deleteErrorMessage.set(null);
  }

  protected readonly deleteDialogMessage = computed(() => {
    const u = this.userToDelete();
    if (this.deleteErrorMessage()) return this.deleteErrorMessage()!;
    return u ? `Are you sure you want to delete user account "${u.username}" (${u.name})? This action cannot be undone.` : '';
  });

  protected confirmDelete(): void {
    const target = this.userToDelete();
    if (target) {
      const res = this.userAccountsService.deleteUserAccount(target.id);
      if (res.success) {
        this.bannerMessage.set({ type: 'success', text: `Deleted user account @${target.username}.` });
        this.closeDeleteDialog();
      } else {
        this.deleteErrorMessage.set(res.error || 'Cannot delete user account.');
      }
    }
  }

  protected exportExcel(): void {
    exportToExcel(
      this.filteredUsers().map(u => ({
        Name: u.name,
        Username: u.username,
        Email: u.email,
        Role: u.role,
        'Linked Profile': u.linkedProfileName,
        'Security State': u.securityDisplay,
        'Last Login': u.lastLogin,
        Status: u.status
      })),
      'EduERP_User_Accounts'
    );
  }

  protected exportPdf(): void {
    exportToPdf(
      'ERP User Accounts & Security Ledger',
      ['Name', 'Username', 'Role', 'Linked Profile', 'Lock / Sessions', 'Status'],
      this.filteredUsers().map(u => [
        u.name,
        `@${u.username}`,
        u.role,
        u.linkedProfileName,
        u.securityDisplay,
        u.status
      ]),
      'EduERP_User_Accounts'
    );
  }
}
