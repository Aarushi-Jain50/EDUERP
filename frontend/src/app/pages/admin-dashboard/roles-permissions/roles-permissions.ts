import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageHeader } from '../../../components/shared/page-header';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { UserAccountsService } from '../../../services/user-accounts.service';
import {
  RoleDefinition,
  PermissionMatrix,
  ModulePermission,
  SIDEBAR_MODULE_GROUPS
} from '../../../models/user-role.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-roles-permissions-page',
  imports: [
    ReactiveFormsModule,
    PageHeader,
    FormDrawer,
    ConfirmDialog
  ],
  template: `
    <div class="flex flex-col gap-5 max-w-[1400px] mx-auto w-full font-sans relative">
      
      <!-- Toast Notification Banner -->
      @if (saveToastMessage()) {
        <div class="fixed top-20 right-6 z-50 p-3.5 bg-emerald-900 text-white rounded-2xl shadow-2xl border border-emerald-500 max-w-md w-full animate-in slide-in-from-top-5 duration-200 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="material-icons text-emerald-400 text-lg">check_circle</span>
            <span class="text-xs font-semibold">{{ saveToastMessage() }}</span>
          </div>
          <button (click)="saveToastMessage.set(null)" class="text-emerald-300 hover:text-white p-1">
            <span class="material-icons text-xs">close</span>
          </button>
        </div>
      }

      <!-- 1. Page Header -->
      <app-page-header
        title="Roles & Permissions"
        subtitle="Configure module-level access control matrix and system permissions."
        primaryActionLabel="Add Custom Role"
        primaryActionIcon="add_moderator"
        (primaryActionClicked)="openAddRoleDrawer()"
      />

      <!-- Mobile Role Selector Dropdown (Visible only on mobile 360px - lg) -->
      <div class="block lg:hidden bg-white rounded-xl border border-[#E2E8F0] p-3 shadow-xs">
        <label for="mobile-role-select" class="block text-xs font-bold text-slate-700 mb-1">Select Role to Edit Permissions:</label>
        <select
          id="mobile-role-select"
          [value]="selectedRoleId()"
          (change)="selectRole($any($event.target).value)"
          class="w-full h-10 px-3 text-xs font-bold bg-slate-50 border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8]"
        >
          @for (role of rolesWithCounts(); track role.id) {
            <option [value]="role.id">{{ role.name }} ({{ role.userCount }} users)</option>
          }
        </select>
      </div>

      <!-- Main Two-Column Layout (Desktop) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        <!-- LEFT COLUMN: Roles List Card (4 Cols on LG) -->
        <div class="hidden lg:block lg:col-span-4 bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div class="p-4 border-b border-[#E2E8F0] bg-slate-50/70 flex items-center justify-between">
            <div>
              <h2 class="text-xs font-bold uppercase tracking-wider text-[#64748B]">System Roles</h2>
              <p class="text-[11px] text-slate-500 mt-0.5">Select a role to configure permissions</p>
            </div>
            <button
              type="button"
              (click)="openAddRoleDrawer()"
              class="px-2.5 py-1 text-[11px] font-bold text-[#6D42E8] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer border border-purple-200"
            >
              + New Role
            </button>
          </div>

          <div class="p-2 space-y-1.5 max-h-[640px] overflow-y-auto">
            @for (role of rolesWithCounts(); track role.id) {
              <button
                type="button"
                (click)="selectRole(role.id)"
                class="w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer group flex items-start justify-between gap-2"
                [class]="selectedRoleId() === role.id ? 'bg-[#1A1745] text-white border-[#1A1745] shadow-md' : 'bg-white hover:bg-slate-50 border-[#E2E8F0] text-slate-800'"
              >
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-xs truncate" [class.text-white]="selectedRoleId() === role.id" [class.text-slate-900]="selectedRoleId() !== role.id">
                      {{ role.name }}
                    </span>
                    @if (role.isSystem) {
                      <span
                        title="System Role - Core role cannot be deleted"
                        class="material-icons text-xs"
                        [class.text-purple-300]="selectedRoleId() === role.id"
                        [class.text-slate-400]="selectedRoleId() !== role.id"
                      >
                        lock
                      </span>
                    }
                  </div>
                  <p class="text-[11px] mt-1 line-clamp-2 leading-relaxed" [class.text-purple-200]="selectedRoleId() === role.id" [class.text-slate-500]="selectedRoleId() !== role.id">
                    {{ role.description }}
                  </p>
                </div>

                <div class="flex flex-col items-end justify-between self-stretch shrink-0 gap-2">
                  <span
                    class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    [class]="selectedRoleId() === role.id ? 'bg-white/20 text-white' : 'bg-purple-50 text-[#6D42E8] border border-purple-100'"
                  >
                    {{ role.userCount }} {{ role.userCount === 1 ? 'user' : 'users' }}
                  </span>

                  @if (!role.isSystem) {
                    <button
                      type="button"
                      aria-label="Delete custom role"
                      (click)="openDeleteRoleDialog(role, $event)"
                      class="text-slate-400 hover:text-red-500 p-0.5 rounded transition-colors"
                      [class.text-purple-300]="selectedRoleId() === role.id"
                      [class.hover:text-red-300]="selectedRoleId() === role.id"
                    >
                      <span class="material-icons text-sm">delete</span>
                    </button>
                  }
                </div>
              </button>
            }
          </div>
        </div>

        <!-- RIGHT COLUMN: Permissions Matrix Card (8 Cols on LG) -->
        @if (activeRole(); as role) {
          <div class="lg:col-span-8 bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden flex flex-col">
            
            <!-- Matrix Header -->
            <div class="p-4 sm:p-5 border-b border-[#E2E8F0] bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-base font-bold text-slate-900 tracking-tight">{{ role.name }} Permissions Matrix</h2>
                  @if (role.isSystem) {
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-200 text-slate-700 flex items-center gap-1">
                      <span class="material-icons text-[10px]">lock</span> System Role
                    </span>
                  } @else {
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-50 text-[#6D42E8] border border-purple-200">
                      Custom Role
                    </span>
                  }
                </div>
                <p class="text-xs text-[#64748B] mt-0.5">{{ role.description }}</p>
              </div>

              @if (role.name === 'Super Admin') {
                <div class="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-900 flex items-center gap-1.5 shrink-0">
                  <span class="material-icons text-sm text-amber-600">verified_user</span>
                  <span>Super Admin has all permissions enabled by default.</span>
                </div>
              }
            </div>

            <!-- Matrix Body: Scrollable Table -->
            <div class="overflow-x-auto max-h-[580px] overflow-y-auto">
              <table class="w-full text-left border-collapse font-sans text-xs">
                
                <!-- Sticky Table Header (40px) -->
                <thead class="sticky top-0 bg-slate-100 border-b border-[#E2E8F0] z-20 shadow-2xs">
                  <tr class="h-10 text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                    <th scope="col" class="px-4 py-2 w-1/3">Module / Section</th>
                    <th scope="col" class="px-4 py-2 text-center w-20">View</th>
                    <th scope="col" class="px-4 py-2 text-center w-20">Create</th>
                    <th scope="col" class="px-4 py-2 text-center w-20">Edit</th>
                    <th scope="col" class="px-4 py-2 text-center w-20">Delete</th>
                    <th scope="col" class="px-4 py-2 text-center w-24">Row Select</th>
                  </tr>
                </thead>

                <tbody class="divide-y divide-slate-200">
                  @for (group of moduleGroups; track group.groupName) {
                    
                    <!-- Group Header Row -->
                    <tr class="bg-purple-50/60 font-bold text-[11px] uppercase tracking-wider text-purple-900 h-9">
                      <td class="px-4 py-2 flex items-center gap-1.5">
                        <span class="material-icons text-xs text-[#6D42E8]">folder</span>
                        <span>{{ group.groupName }}</span>
                      </td>
                      <td colspan="4" class="px-4 py-2 text-right text-[10px] text-purple-700">
                        Group Permissions
                      </td>
                      <td class="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          [disabled]="role.name === 'Super Admin'"
                          [checked]="isGroupFullyChecked(group.groupName)"
                          (change)="toggleGroupPermissions(group.groupName, $any($event.target).checked)"
                          title="Select / Deselect all permissions in this group"
                          class="w-4 h-4 rounded text-[#6D42E8] focus:ring-[#6D42E8] border-purple-300 cursor-pointer disabled:opacity-40"
                        />
                      </td>
                    </tr>

                    <!-- Modules in Group (40px compact rows) -->
                    @for (mod of group.modules; track mod.key) {
                      @let p = getPermission(mod.key);
                      <tr class="h-10 hover:bg-slate-50 transition-colors">
                        <td class="px-4 py-2 font-medium text-slate-800 pl-8">
                          {{ mod.label }}
                        </td>

                        <!-- View -->
                        <td class="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            [disabled]="role.name === 'Super Admin'"
                            [checked]="p.view"
                            (change)="togglePermission(mod.key, 'view', $any($event.target).checked)"
                            class="w-4 h-4 rounded text-[#6D42E8] focus:ring-[#6D42E8] border-slate-300 cursor-pointer disabled:opacity-40"
                          />
                        </td>

                        <!-- Create -->
                        <td class="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            [disabled]="role.name === 'Super Admin'"
                            [checked]="p.create"
                            (change)="togglePermission(mod.key, 'create', $any($event.target).checked)"
                            class="w-4 h-4 rounded text-[#6D42E8] focus:ring-[#6D42E8] border-slate-300 cursor-pointer disabled:opacity-40"
                          />
                        </td>

                        <!-- Edit -->
                        <td class="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            [disabled]="role.name === 'Super Admin'"
                            [checked]="p.edit"
                            (change)="togglePermission(mod.key, 'edit', $any($event.target).checked)"
                            class="w-4 h-4 rounded text-[#6D42E8] focus:ring-[#6D42E8] border-slate-300 cursor-pointer disabled:opacity-40"
                          />
                        </td>

                        <!-- Delete -->
                        <td class="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            [disabled]="role.name === 'Super Admin'"
                            [checked]="p.delete"
                            (change)="togglePermission(mod.key, 'delete', $any($event.target).checked)"
                            class="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300 cursor-pointer disabled:opacity-40"
                          />
                        </td>

                        <!-- Per-Row Select All -->
                        <td class="px-4 py-2 text-center">
                          <button
                            type="button"
                            [disabled]="role.name === 'Super Admin'"
                            (click)="toggleRowPermissions(mod.key)"
                            class="text-[10px] font-bold text-[#6D42E8] hover:underline disabled:opacity-40 cursor-pointer"
                          >
                            {{ isRowFullyChecked(mod.key) ? 'Clear' : 'All' }}
                          </button>
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>

            <!-- Footer Bar with Discard & Save Changes (Enabled only when changed) -->
            <div class="p-4 border-t border-[#E2E8F0] bg-slate-50 flex items-center justify-between shrink-0">
              <div class="text-xs text-[#64748B]">
                @if (isDirty()) {
                  <span class="text-amber-600 font-semibold flex items-center gap-1">
                    <span class="material-icons text-xs">edit</span> Unsaved permission changes pending
                  </span>
                } @else {
                  <span class="text-slate-500">All permissions saved for {{ role.name }}.</span>
                }
              </div>

              <div class="flex items-center gap-3">
                <button
                  type="button"
                  [disabled]="!isDirty()"
                  (click)="discardChanges()"
                  class="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl border border-slate-300 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Discard
                </button>
                <button
                  type="button"
                  [disabled]="!isDirty() || role.name === 'Super Admin'"
                  (click)="savePermissions()"
                  class="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#6D42E8] to-[#D946EF] hover:opacity-95 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <span class="material-icons text-sm">save</span>
                  <span>Save Changes</span>
                </button>
              </div>
            </div>

          </div>
        }

      </div>

      <!-- Add Role Drawer -->
      <app-form-drawer
        [isOpen]="isAddRoleDrawerOpen()"
        title="Add Custom Role"
        subtitle="Define a new administrative role with tailored module access."
        saveLabel="Create Role"
        widthClass="max-w-[420px]"
        (closed)="isAddRoleDrawerOpen.set(false)"
        (saved)="submitAddRole()"
      >
        @if (addRoleError()) {
          <div class="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 mb-3">
            <span class="material-icons text-base text-red-500">error</span>
            <span>{{ addRoleError() }}</span>
          </div>
        }

        <form [formGroup]="addRoleForm" class="space-y-4 text-xs sm:text-[13px]">
          <div>
            <label for="role-name-input" class="block font-semibold text-slate-700 mb-1">
              Role Name <span class="text-red-500">*</span>
            </label>
            <input
              id="role-name-input"
              type="text"
              formControlName="name"
              placeholder="e.g. Accounts Officer or Librarian"
              class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
            />
          </div>

          <div>
            <label for="role-desc-input" class="block font-semibold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              id="role-desc-input"
              rows="3"
              formControlName="description"
              placeholder="Brief description of responsibilities and module scope"
              class="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
            ></textarea>
          </div>
        </form>
      </app-form-drawer>

      <!-- Delete Custom Role Confirm Dialog -->
      <app-confirm-dialog
        [isOpen]="isDeleteRoleDialogOpen()"
        title="Delete Custom Role"
        [message]="deleteRoleDialogMessage()"
        confirmLabel="Delete Role"
        (closed)="isDeleteRoleDialogOpen.set(false)"
        (confirmed)="confirmDeleteRole()"
      />

    </div>
  `
})
export class RolesPermissionsPage {
  private readonly userAccountsService = inject(UserAccountsService);

  protected readonly moduleGroups = SIDEBAR_MODULE_GROUPS;
  protected readonly selectedRoleId = signal<string>('role-super-admin');
  protected readonly saveToastMessage = signal<string | null>(null);

  // Editable local state matrix to support Discard / Save Changes
  protected readonly editedMatrix = signal<PermissionMatrix>({});
  protected readonly savedMatrix = signal<PermissionMatrix>({});

  protected readonly isAddRoleDrawerOpen = signal<boolean>(false);
  protected readonly addRoleError = signal<string | null>(null);

  protected readonly isDeleteRoleDialogOpen = signal<boolean>(false);
  protected readonly roleToDelete = signal<RoleDefinition | null>(null);
  protected readonly deleteRoleErrorMessage = signal<string | null>(null);

  protected readonly rolesWithCounts = computed(() => this.userAccountsService.rolesWithCounts());

  protected readonly activeRole = computed<RoleDefinition | null>(() => {
    const id = this.selectedRoleId();
    return this.rolesWithCounts().find(r => r.id === id) || this.rolesWithCounts()[0] || null;
  });

  constructor() {
    this.initMatrixForRole(this.selectedRoleId());
  }

  protected selectRole(roleId: string): void {
    if (this.isDirty()) {
      if (!confirm('You have unsaved changes for the current role. Switch anyway?')) {
        return;
      }
    }
    this.selectedRoleId.set(roleId);
    this.initMatrixForRole(roleId);
  }

  private initMatrixForRole(roleId: string): void {
    const role = this.userAccountsService.roles().find(r => r.id === roleId);
    if (role) {
      const cloned = JSON.parse(JSON.stringify(role.permissions));
      this.savedMatrix.set(cloned);
      this.editedMatrix.set(JSON.parse(JSON.stringify(cloned)));
    }
  }

  protected readonly isDirty = computed(() => {
    return JSON.stringify(this.editedMatrix()) !== JSON.stringify(this.savedMatrix());
  });

  protected getPermission(modKey: string): ModulePermission {
    const m = this.editedMatrix();
    return m[modKey] || { view: false, create: false, edit: false, delete: false };
  }

  protected togglePermission(modKey: string, field: 'view' | 'create' | 'edit' | 'delete', checked: boolean): void {
    const current = this.editedMatrix();
    const modPerm = current[modKey] ? { ...current[modKey] } : { view: false, create: false, edit: false, delete: false };
    modPerm[field] = checked;

    // If unchecking view, uncheck create/edit/delete automatically
    if (field === 'view' && !checked) {
      modPerm.create = false;
      modPerm.edit = false;
      modPerm.delete = false;
    }
    // If checking create/edit/delete, check view automatically
    if ((field === 'create' || field === 'edit' || field === 'delete') && checked) {
      modPerm.view = true;
    }

    this.editedMatrix.set({
      ...current,
      [modKey]: modPerm
    });
  }

  protected isRowFullyChecked(modKey: string): boolean {
    const p = this.getPermission(modKey);
    return p.view && p.create && p.edit && p.delete;
  }

  protected toggleRowPermissions(modKey: string): void {
    const targetState = !this.isRowFullyChecked(modKey);
    const current = this.editedMatrix();
    this.editedMatrix.set({
      ...current,
      [modKey]: { view: targetState, create: targetState, edit: targetState, delete: targetState }
    });
  }

  protected isGroupFullyChecked(groupName: string): boolean {
    const groupObj = this.moduleGroups.find(g => g.groupName === groupName);
    if (!groupObj) return false;
    return groupObj.modules.every(m => this.isRowFullyChecked(m.key));
  }

  protected toggleGroupPermissions(groupName: string, checked: boolean): void {
    const groupObj = this.moduleGroups.find(g => g.groupName === groupName);
    if (!groupObj) return;

    const current = { ...this.editedMatrix() };
    groupObj.modules.forEach(m => {
      current[m.key] = { view: checked, create: checked, edit: checked, delete: checked };
    });

    this.editedMatrix.set(current);
  }

  protected discardChanges(): void {
    this.editedMatrix.set(JSON.parse(JSON.stringify(this.savedMatrix())));
  }

  protected savePermissions(): void {
    const role = this.activeRole();
    if (!role || role.name === 'Super Admin') return;

    this.userAccountsService.updateRolePermissions(role.id, this.editedMatrix());
    this.savedMatrix.set(JSON.parse(JSON.stringify(this.editedMatrix())));
    this.saveToastMessage.set(`Permissions matrix for "${role.name}" saved successfully!`);
    setTimeout(() => this.saveToastMessage.set(null), 4000);
  }

  // ADD CUSTOM ROLE FORM

  protected readonly addRoleForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('')
  });

  protected openAddRoleDrawer(): void {
    this.addRoleError.set(null);
    this.addRoleForm.reset({ name: '', description: '' });
    this.isAddRoleDrawerOpen.set(true);
  }

  protected submitAddRole(): void {
    this.addRoleForm.markAllAsTouched();
    if (this.addRoleForm.invalid) {
      this.addRoleError.set('Role Name is required.');
      return;
    }

    const val = this.addRoleForm.getRawValue();
    const res = this.userAccountsService.addCustomRole(val.name, val.description || '');

    if (res.success) {
      this.isAddRoleDrawerOpen.set(false);
      this.saveToastMessage.set(`Custom role "${val.name}" created successfully!`);
      setTimeout(() => this.saveToastMessage.set(null), 4000);
    } else {
      this.addRoleError.set(res.error || 'Failed to create role.');
    }
  }

  // DELETE CUSTOM ROLE

  protected openDeleteRoleDialog(role: RoleDefinition, event: Event): void {
    event.stopPropagation();
    this.roleToDelete.set(role);
    this.deleteRoleErrorMessage.set(null);
    this.isDeleteRoleDialogOpen.set(true);
  }

  protected readonly deleteRoleDialogMessage = computed(() => {
    const r = this.roleToDelete();
    if (this.deleteRoleErrorMessage()) return this.deleteRoleErrorMessage()!;
    return r ? `Are you sure you want to delete custom role "${r.name}"? This action cannot be undone.` : '';
  });

  protected confirmDeleteRole(): void {
    const target = this.roleToDelete();
    if (target) {
      const res = this.userAccountsService.deleteCustomRole(target.id);
      if (res.success) {
        this.isDeleteRoleDialogOpen.set(false);
        this.roleToDelete.set(null);
      } else {
        this.deleteRoleErrorMessage.set(res.error || 'Cannot delete role.');
      }
    }
  }
}
