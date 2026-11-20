import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { UserAccount, RoleDefinition, PermissionMatrix, UserStatus, SIDEBAR_MODULE_GROUPS } from '../models/user-role.model';
import { Student } from '../models/student.model';
import { StudentsService } from './students.service';
import { ActivityService } from './activity.service';
import { AuditService } from './audit.service';
import { FirestoreCollectionSync } from '../lib/firestore-collection-sync';

function buildDefaultMatrix(allFull = false, isFaculty = false, isStudent = false): PermissionMatrix {
  const matrix: PermissionMatrix = {};
  SIDEBAR_MODULE_GROUPS.forEach(group => {
    group.modules.forEach(mod => {
      if (allFull) {
        matrix[mod.key] = { view: true, create: true, edit: true, delete: true };
      } else if (isFaculty) {
        const isAcademic = group.groupName === 'ACADEMIC OPERATIONS' || group.groupName === 'ACADEMIC MANAGEMENT';
        matrix[mod.key] = { view: true, create: isAcademic, edit: isAcademic, delete: false };
      } else if (isStudent) {
        const isViewable =
          mod.key === 'overview' ||
          mod.key === 'assignments' ||
          mod.key === 'timetable' ||
          mod.key === 'results' ||
          mod.key === 'receipts';
        matrix[mod.key] = { view: isViewable, create: false, edit: false, delete: false };
      } else {
        matrix[mod.key] = { view: true, create: true, edit: true, delete: false };
      }
    });
  });
  return matrix;
}

const SEED_USERS: UserAccount[] = [
  {
    id: 'usr-1',
    name: 'System Administrator',
    initials: 'AD',
    email: 'admin@eduerp.edu',
    username: 'admin_eduerp',
    role: 'Super Admin',
    profileType: 'Staff',
    linkedProfileName: 'Staff: System Admin',
    lastLogin: '10 mins ago',
    status: 'Active',
    forcePasswordChange: false,
    isLocked: false,
    failedLoginAttempts: 0,
    activeSessionsCount: 1
  },
  {
    id: 'usr-2',
    name: 'Dr. S. N. Roy',
    initials: 'SR',
    email: 'sn.roy@eduerp.edu',
    username: 'sn_roy',
    role: 'Faculty',
    profileType: 'Faculty',
    linkedProfileId: 'fac-1',
    linkedProfileName: 'Faculty: Dr. S. N. Roy',
    lastLogin: '1 hour ago',
    status: 'Active',
    forcePasswordChange: false,
    isLocked: false,
    failedLoginAttempts: 0,
    activeSessionsCount: 1
  },
  {
    id: 'usr-3',
    name: 'Dr. Amit Joshi',
    initials: 'AJ',
    email: 'amit.joshi@eduerp.edu',
    username: 'amit_joshi',
    role: 'Faculty',
    profileType: 'Faculty',
    linkedProfileId: 'fac-2',
    linkedProfileName: 'Faculty: Dr. Amit Joshi',
    lastLogin: '3 hours ago',
    status: 'Active',
    forcePasswordChange: false,
    isLocked: false,
    failedLoginAttempts: 0,
    activeSessionsCount: 1
  },
  {
    id: 'usr-4',
    name: 'Rahul Verma',
    initials: 'RV',
    email: 'rahul.verma@eduerp.edu',
    username: 'rahul_v',
    role: 'Student',
    profileType: 'Student',
    linkedProfileId: 'stu-1',
    linkedProfileName: 'Student: Rahul Verma (MCA-2025-001)',
    lastLogin: '25 mins ago',
    status: 'Active',
    forcePasswordChange: false,
    isLocked: false,
    failedLoginAttempts: 0,
    activeSessionsCount: 2
  },
  {
    id: 'usr-5',
    name: 'Ananya Sharma',
    initials: 'AS',
    email: 'ananya.sharma@eduerp.edu',
    username: 'ananya_s',
    role: 'Student',
    profileType: 'Student',
    linkedProfileId: 'stu-2',
    linkedProfileName: 'Student: Ananya Sharma (MCA-2025-002)',
    lastLogin: '2 hours ago',
    status: 'Active',
    forcePasswordChange: false,
    isLocked: false,
    failedLoginAttempts: 0,
    activeSessionsCount: 1
  },
  {
    id: 'usr-6',
    name: 'Sanjay Verma',
    initials: 'SV',
    email: 'sanjay.verma@gmail.com',
    username: 'sanjay_v',
    role: 'Parent',
    profileType: 'Parent',
    linkedProfileId: 'par-1',
    linkedProfileName: 'Parent: Sanjay Verma',
    lastLogin: 'Yesterday',
    status: 'Active',
    forcePasswordChange: false,
    isLocked: false,
    failedLoginAttempts: 0,
    activeSessionsCount: 0
  },
  {
    id: 'usr-7',
    name: 'Suresh Patil',
    initials: 'SP',
    email: 'suresh.patil@eduerp.edu',
    username: 'suresh_p',
    role: 'Accounts Officer',
    profileType: 'Staff',
    linkedProfileName: 'Staff: Suresh Patil',
    lastLogin: '5 hours ago',
    status: 'Active',
    forcePasswordChange: false,
    isLocked: false,
    failedLoginAttempts: 0,
    activeSessionsCount: 1
  },
  {
    id: 'usr-8',
    name: 'Kavita Nair',
    initials: 'KN',
    email: 'kavita.nair@eduerp.edu',
    username: 'kavita_n',
    role: 'Admin',
    profileType: 'Staff',
    linkedProfileName: 'Staff: Kavita Nair',
    lastLogin: 'Yesterday',
    status: 'Active',
    forcePasswordChange: false,
    isLocked: false,
    failedLoginAttempts: 0,
    activeSessionsCount: 0
  },
  {
    id: 'usr-9',
    name: 'Priyanshu Das',
    initials: 'PD',
    email: 'priyanshu.das@eduerp.edu',
    username: 'priyanshu_d',
    role: 'Student',
    profileType: 'Student',
    linkedProfileId: 'stu-3',
    linkedProfileName: 'Student: Priyanshu Das (BCA-2025-014)',
    lastLogin: '5 days ago',
    status: 'Inactive',
    forcePasswordChange: true,
    isLocked: true,
    failedLoginAttempts: 4,
    activeSessionsCount: 0
  }
];

const SEED_ROLES: RoleDefinition[] = [
  {
    id: 'role-super-admin',
    name: 'Super Admin',
    description: 'Unrestricted full administrative access across all system modules and security settings.',
    isSystem: true,
    permissions: buildDefaultMatrix(true)
  },
  {
    id: 'role-admin',
    name: 'Admin',
    description: 'Administrative access to manage academics, students, admissions, and reports.',
    isSystem: true,
    permissions: buildDefaultMatrix(false)
  },
  {
    id: 'role-faculty',
    name: 'Faculty',
    description: 'Teaching staff portal access for attendance, marks entry, timetable, and assignments.',
    isSystem: true,
    permissions: buildDefaultMatrix(false, true, false)
  },
  {
    id: 'role-student',
    name: 'Student',
    description: 'Student self-service portal access for assignments, exam results, and fee receipts.',
    isSystem: true,
    permissions: buildDefaultMatrix(false, false, true)
  },
  {
    id: 'role-parent',
    name: 'Parent',
    description: 'Guardian portal access to monitor attendance, academic grades, and pending fees.',
    isSystem: true,
    permissions: buildDefaultMatrix(false, false, true)
  },
  {
    id: 'role-accounts',
    name: 'Accounts Officer',
    description: 'Finance department staff managing fee structure, challan collections, and payment ledgers.',
    isSystem: false,
    permissions: buildDefaultMatrix(false)
  }
];

@Injectable({
  providedIn: 'root'
})
export class UserAccountsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly studentsService = inject(StudentsService);
  private readonly activityService = inject(ActivityService);
  private readonly auditService = inject(AuditService);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _users = signal<UserAccount[]>([]);
  private readonly _roles = signal<RoleDefinition[]>([]);

  private readonly usersSync = new FirestoreCollectionSync<UserAccount>(
    'userAccounts',
    'eduerp_user_accounts_v2',
    this._users,
    this.isBrowser
  );
  private readonly rolesSync = new FirestoreCollectionSync<RoleDefinition>(
    'roles',
    'eduerp_roles_v2',
    this._roles,
    this.isBrowser
  );

  readonly users = this._users.asReadonly();
  readonly roles = this._roles.asReadonly();

  constructor() {
    this._users.set(this.usersSync.loadInitial(SEED_USERS));
    this._roles.set(this.rolesSync.loadInitial(SEED_ROLES));
    this.usersSync.startSync();
    this.rolesSync.startSync();
  }

  readonly userStats = computed(() => {
    const list = this._users();
    const active = list.filter(u => u.status === 'Active' && !u.isLocked).length;
    const lockedOrInactive = list.filter(u => u.status === 'Inactive' || u.isLocked).length;
    return {
      total: list.length,
      active,
      inactive: lockedOrInactive
    };
  });

  readonly rolesWithCounts = computed(() => {
    const userList = this._users();
    return this._roles().map(r => ({
      ...r,
      userCount: userList.filter(u => u.role === r.name).length
    }));
  });

  private generateInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  saveUserAccount(
    data: Omit<UserAccount, 'id' | 'initials' | 'lastLogin'>,
    editId?: string
  ): { success: boolean; error?: string } {
    const cleanUsername = data.username.trim().toLowerCase();
    const cleanEmail = data.email.trim().toLowerCase();

    const existingUsername = this._users().find(
      u => u.username.toLowerCase() === cleanUsername && u.id !== editId
    );
    if (existingUsername) {
      return { success: false, error: `Username "${cleanUsername}" is already taken.` };
    }

    const initials = this.generateInitials(data.name);

    const record: UserAccount = editId
      ? {
          ...(this._users().find(u => u.id === editId)!),
          ...data,
          username: cleanUsername,
          email: cleanEmail,
          initials,
          id: editId
        }
      : {
          ...data,
          username: cleanUsername,
          email: cleanEmail,
          initials,
          lastLogin: 'Never logged in',
          isLocked: false,
          failedLoginAttempts: 0,
          activeSessionsCount: 0,
          id: `usr-${Date.now()}`
        };

    if (editId) {
      this._users.update(list => list.map(u => (u.id === editId ? record : u)));
    } else {
      this._users.update(list => [record, ...list]);
    }
    this.usersSync.syncUpsert(record);

    this.activityService.logActivity({
      user: 'Admin (Security Office)',
      role: 'System Administrator',
      operationType: editId ? 'Update' : 'Create',
      action: editId ? 'updated user account' : 'provisioned ERP login account',
      target: `@${record.username} (${record.role})`,
      recordId: record.id,
      module: 'User Accounts',
      category: 'Security',
      icon: 'manage_accounts'
    });
    this.auditService.log({
      userId: 'admin',
      userName: 'System Administrator',
      role: 'Super Admin',
      module: 'User Accounts',
      action: editId ? 'Update' : 'Create',
      target: `@${record.username}`,
      newValue: `${record.role} (${record.status})`,
      status: 'Success'
    });

    return { success: true };
  }

  createLinkedAccountForStudent(student: Student): { username: string; tempPass: string } | null {
    const existing = this._users().find(
      u => u.linkedProfileId === student.id || u.email.toLowerCase() === student.email.toLowerCase()
    );
    if (existing) return null;

    const baseUsername = student.enrollmentNo.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const tempPass = `Edu#${Math.floor(100000 + Math.random() * 900000)}`;
    const res = this.saveUserAccount({
      name: student.name,
      email: student.email,
      username: baseUsername,
      role: 'Student',
      profileType: 'Student',
      linkedProfileId: student.id,
      linkedProfileName: `Student: ${student.name} (${student.enrollmentNo})`,
      status: 'Active',
      forcePasswordChange: true
    });
    return res.success ? { username: baseUsername, tempPass } : null;
  }

  toggleUserStatus(userId: string): { success: boolean; error?: string } {
    const target = this._users().find(u => u.id === userId);
    if (!target) return { success: false, error: 'User account not found.' };

    if (target.role === 'Super Admin' && target.status === 'Active') {
      const activeSuperAdmins = this._users().filter(u => u.role === 'Super Admin' && u.status === 'Active');
      if (activeSuperAdmins.length <= 1) {
        return {
          success: false,
          error: 'Security Policy Violation: Cannot deactivate the last active Super Admin account.'
        };
      }
    }

    const newStatus: UserStatus = target.status === 'Active' ? 'Inactive' : 'Active';
    const updated: UserAccount = {
      ...target,
      status: newStatus,
      activeSessionsCount: newStatus === 'Inactive' ? 0 : target.activeSessionsCount ?? 0
    };
    this._users.update(list => list.map(u => (u.id === userId ? updated : u)));
    this.usersSync.syncUpsert(updated);

    this.activityService.logActivity({
      user: 'Admin (Security Office)',
      role: 'System Administrator',
      operationType: 'Security',
      action: newStatus === 'Active' ? 'activated user account' : 'suspended user account',
      target: `@${target.username} (${target.name})`,
      recordId: target.id,
      module: 'User Accounts',
      category: 'Security',
      icon: newStatus === 'Active' ? 'check_circle' : 'block'
    });
    this.auditService.log({
      userId: 'admin',
      userName: 'System Administrator',
      role: 'Super Admin',
      module: 'User Accounts',
      action: 'Update',
      target: `@${target.username}`,
      oldValue: target.status,
      newValue: newStatus,
      status: 'Success'
    });

    return { success: true };
  }

  toggleLockUser(userId: string): { success: boolean; error?: string; locked?: boolean } {
    const target = this._users().find(u => u.id === userId);
    if (!target) return { success: false, error: 'User account not found.' };

    if (target.role === 'Super Admin' && !target.isLocked) {
      return { success: false, error: 'Super Admin accounts cannot be locked from this console.' };
    }

    const nextLocked = !target.isLocked;
    const updated: UserAccount = {
      ...target,
      isLocked: nextLocked,
      failedLoginAttempts: nextLocked ? Math.max(target.failedLoginAttempts ?? 0, 5) : 0,
      activeSessionsCount: nextLocked ? 0 : target.activeSessionsCount ?? 0
    };
    this._users.update(list => list.map(u => (u.id === userId ? updated : u)));
    this.usersSync.syncUpsert(updated);

    this.activityService.logActivity({
      user: 'Admin (Security Office)',
      role: 'System Administrator',
      operationType: 'Security',
      action: nextLocked ? 'locked user account' : 'unlocked user account',
      target: `@${target.username} (${target.name})`,
      recordId: target.id,
      module: 'User Accounts',
      category: 'Security',
      icon: nextLocked ? 'lock' : 'lock_open'
    });

    return { success: true, locked: nextLocked };
  }

  deleteUserAccount(userId: string): { success: boolean; error?: string } {
    const target = this._users().find(u => u.id === userId);
    if (!target) return { success: false, error: 'User account not found.' };

    if (target.role === 'Super Admin' && target.status === 'Active') {
      const activeSuperAdmins = this._users().filter(u => u.role === 'Super Admin' && u.status === 'Active');
      if (activeSuperAdmins.length <= 1) {
        return {
          success: false,
          error: 'Security Policy Violation: Cannot delete the last active Super Admin account.'
        };
      }
    }

    this._users.update(list => list.filter(u => u.id !== userId));
    this.usersSync.syncDelete(userId);
    this.auditService.log({
      userId: 'admin',
      userName: 'System Administrator',
      role: 'Super Admin',
      module: 'User Accounts',
      action: 'Delete',
      target: `@${target.username}`,
      status: 'Success'
    });
    return { success: true };
  }

  resetPassword(userId: string): { success: boolean; username: string; tempPass: string } {
    const user = this._users().find(u => u.id === userId);
    const username = user ? user.username : 'user';
    const tempPass = `Edu#${Math.floor(100000 + Math.random() * 900000)}`;

    if (user) {
      const updated: UserAccount = {
        ...user,
        forcePasswordChange: true,
        isLocked: false,
        failedLoginAttempts: 0
      };
      this._users.update(list => list.map(u => (u.id === userId ? updated : u)));
      this.usersSync.syncUpsert(updated);
      this.activityService.logActivity({
        user: 'Admin (Security Office)',
        role: 'System Administrator',
        operationType: 'Security',
        action: 'issued forced password reset for',
        target: `@${username} (${user.name})`,
        recordId: user.id,
        module: 'User Accounts',
        category: 'Security',
        icon: 'key'
      });
      this.auditService.log({
        userId: 'admin',
        userName: 'System Administrator',
        role: 'Super Admin',
        module: 'User Accounts',
        action: 'Update',
        target: `@${username}`,
        newValue: 'Temporary password issued & unlock applied',
        status: 'Success'
      });
    }

    return { success: true, username, tempPass };
  }

  updateRolePermissions(roleId: string, newMatrix: PermissionMatrix): { success: boolean } {
    const target = this._roles().find(r => r.id === roleId);
    if (!target) return { success: false };

    const updated: RoleDefinition = { ...target, permissions: { ...newMatrix } };
    this._roles.update(list => list.map(r => (r.id === roleId ? updated : r)));
    this.rolesSync.syncUpsert(updated);

    this.activityService.logActivity({
      user: 'Admin (Security Office)',
      role: 'System Administrator',
      operationType: 'Security',
      action: 'updated RBAC permission matrix for role',
      target: target.name,
      recordId: target.id,
      module: 'Roles & Permissions',
      category: 'Security',
      icon: 'admin_panel_settings'
    });
    this.auditService.log({
      userId: 'admin',
      userName: 'System Administrator',
      role: 'Super Admin',
      module: 'Roles & Permissions',
      action: 'Permission Change',
      target: `Role: ${target.name}`,
      newValue: 'Module permission matrix updated',
      status: 'Success'
    });
    return { success: true };
  }

  addCustomRole(roleName: string, description: string): { success: boolean; error?: string } {
    const cleanName = roleName.trim();
    if (!cleanName) return { success: false, error: 'Role name is required.' };

    const existing = this._roles().find(r => r.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) return { success: false, error: `Role "${cleanName}" already exists.` };

    const newRole: RoleDefinition = {
      id: `role-${Date.now()}`,
      name: cleanName,
      description: description.trim() || 'Custom administrative role.',
      isSystem: false,
      permissions: buildDefaultMatrix(false)
    };

    this._roles.update(list => [...list, newRole]);
    this.rolesSync.syncUpsert(newRole);

    this.auditService.log({
      userId: 'admin',
      userName: 'System Administrator',
      role: 'Super Admin',
      module: 'Roles & Permissions',
      action: 'Create',
      target: `Role: ${newRole.name}`,
      status: 'Success'
    });
    return { success: true };
  }

  deleteCustomRole(roleId: string): { success: boolean; error?: string } {
    const target = this._roles().find(r => r.id === roleId);
    if (!target) return { success: false, error: 'Role not found.' };
    if (target.isSystem) return { success: false, error: 'System roles cannot be deleted.' };

    const assignedUsers = this._users().filter(u => u.role === target.name);
    if (assignedUsers.length > 0) {
      return {
        success: false,
        error: `Cannot delete role "${target.name}". It is currently assigned to ${assignedUsers.length} user account(s). Reassign these users first.`
      };
    }

    this._roles.update(list => list.filter(r => r.id !== roleId));
    this.rolesSync.syncDelete(roleId);
    return { success: true };
  }
}
