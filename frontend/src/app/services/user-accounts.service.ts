import { Injectable, signal, computed, inject } from '@angular/core';
import { UserAccount, RoleDefinition, PermissionMatrix, UserStatus, SIDEBAR_MODULE_GROUPS } from '../models/user-role.model';
import { StudentsService } from './students.service';

@Injectable({
  providedIn: 'root'
})
export class UserAccountsService {
  private readonly studentsService = inject(StudentsService);

  // 1. User Accounts Signal
  private readonly _users = signal<UserAccount[]>([
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
      forcePasswordChange: false
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
      forcePasswordChange: false
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
      forcePasswordChange: false
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
      forcePasswordChange: false
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
      forcePasswordChange: false
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
      forcePasswordChange: false
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
      forcePasswordChange: false
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
      forcePasswordChange: false
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
      forcePasswordChange: true
    }
  ]);

  // Initial Permission Matrix Generator Helper
  private createDefaultMatrix(allFull = false, isFaculty = false, isStudent = false): PermissionMatrix {
    const matrix: PermissionMatrix = {};
    SIDEBAR_MODULE_GROUPS.forEach(group => {
      group.modules.forEach(mod => {
        if (allFull) {
          matrix[mod.key] = { view: true, create: true, edit: true, delete: true };
        } else if (isFaculty) {
          const isAcademic = group.groupName === 'ACADEMIC OPERATIONS' || group.groupName === 'ACADEMIC MANAGEMENT';
          matrix[mod.key] = { view: true, create: isAcademic, edit: isAcademic, delete: false };
        } else if (isStudent) {
          const isViewable = mod.key === 'overview' || mod.key === 'assignments' || mod.key === 'timetable' || mod.key === 'results' || mod.key === 'receipts';
          matrix[mod.key] = { view: isViewable, create: false, edit: false, delete: false };
        } else {
          // Default Admin / Officer: view & create & edit everywhere
          matrix[mod.key] = { view: true, create: true, edit: true, delete: false };
        }
      });
    });
    return matrix;
  }

  // 2. Roles Signal
  private readonly _roles = signal<RoleDefinition[]>([
    {
      id: 'role-super-admin',
      name: 'Super Admin',
      description: 'Unrestricted full administrative access across all system modules and security settings.',
      isSystem: true,
      permissions: this.createDefaultMatrix(true)
    },
    {
      id: 'role-admin',
      name: 'Admin',
      description: 'Administrative access to manage academics, students, admissions, and reports.',
      isSystem: true,
      permissions: this.createDefaultMatrix(false)
    },
    {
      id: 'role-faculty',
      name: 'Faculty',
      description: 'Teaching staff portal access for attendance, marks entry, timetable, and assignments.',
      isSystem: true,
      permissions: this.createDefaultMatrix(false, true, false)
    },
    {
      id: 'role-student',
      name: 'Student',
      description: 'Student self-service portal access for assignments, exam results, and fee receipts.',
      isSystem: true,
      permissions: this.createDefaultMatrix(false, false, true)
    },
    {
      id: 'role-parent',
      name: 'Parent',
      description: 'Guardian portal access to monitor attendance, academic grades, and pending fees.',
      isSystem: true,
      permissions: this.createDefaultMatrix(false, false, true)
    },
    {
      id: 'role-accounts',
      name: 'Accounts Officer',
      description: 'Finance department staff managing fee structure, challan collections, and payment ledgers.',
      isSystem: false,
      permissions: this.createDefaultMatrix(false)
    }
  ]);

  // Readonly exposures
  readonly users = this._users.asReadonly();
  readonly roles = this._roles.asReadonly();

  // Computed User Stats
  readonly userStats = computed(() => {
    const list = this._users();
    const active = list.filter(u => u.status === 'Active').length;
    const inactive = list.filter(u => u.status === 'Inactive').length;
    return {
      total: list.length,
      active,
      inactive
    };
  });

  // Computed Roles with User Counts
  readonly rolesWithCounts = computed(() => {
    const userList = this._users();
    return this._roles().map(r => {
      const count = userList.filter(u => u.role === r.name).length;
      return {
        ...r,
        userCount: count
      };
    });
  });

  private generateInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // USER ACCOUNTS CRUD & ACTIONS

  saveUserAccount(data: Omit<UserAccount, 'id' | 'initials' | 'lastLogin'>, editId?: string): { success: boolean; error?: string } {
    const cleanUsername = data.username.trim().toLowerCase();
    const cleanEmail = data.email.trim().toLowerCase();

    // Check unique username
    const existingUsername = this._users().find(
      u => u.username.toLowerCase() === cleanUsername && u.id !== editId
    );
    if (existingUsername) {
      return { success: false, error: `Username "${cleanUsername}" is already taken.` };
    }

    const initials = this.generateInitials(data.name);

    if (editId) {
      this._users.update(list =>
        list.map(u => (u.id === editId ? { ...u, ...data, username: cleanUsername, email: cleanEmail, initials } : u))
      );
    } else {
      const newUser: UserAccount = {
        ...data,
        username: cleanUsername,
        email: cleanEmail,
        initials,
        lastLogin: 'Never logged in',
        id: `usr-${Date.now()}`
      };
      this._users.update(list => [newUser, ...list]);
    }

    return { success: true };
  }

  toggleUserStatus(userId: string): { success: boolean; error?: string } {
    const target = this._users().find(u => u.id === userId);
    if (!target) return { success: false, error: 'User account not found.' };

    // PREVENT DEACTIVATING LAST ACTIVE SUPER ADMIN
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
    this._users.update(list =>
      list.map(u => (u.id === userId ? { ...u, status: newStatus } : u))
    );

    return { success: true };
  }

  deleteUserAccount(userId: string): { success: boolean; error?: string } {
    const target = this._users().find(u => u.id === userId);
    if (!target) return { success: false, error: 'User account not found.' };

    // PREVENT DELETING LAST ACTIVE SUPER ADMIN
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
    return { success: true };
  }

  resetPassword(userId: string): { success: boolean; username: string; tempPass: string } {
    const user = this._users().find(u => u.id === userId);
    const username = user ? user.username : 'user';
    const tempPass = `Edu#${Math.floor(100000 + Math.random() * 900000)}`;

    this._users.update(list =>
      list.map(u => (u.id === userId ? { ...u, forcePasswordChange: true } : u))
    );

    return { success: true, username, tempPass };
  }

  // ROLES & PERMISSIONS CRUD

  updateRolePermissions(roleId: string, newMatrix: PermissionMatrix): { success: boolean } {
    this._roles.update(list =>
      list.map(r => (r.id === roleId ? { ...r, permissions: { ...newMatrix } } : r))
    );
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
      permissions: this.createDefaultMatrix(false)
    };

    this._roles.update(list => [...list, newRole]);
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
    return { success: true };
  }
}
