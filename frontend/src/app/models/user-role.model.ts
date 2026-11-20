export enum RbacRole {
  ADMIN = 'ADMIN',
  FACULTY = 'FACULTY',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT'
}

export type ProfileType = 'Student' | 'Faculty' | 'Parent' | 'Staff';
export type UserStatus = 'Active' | 'Inactive';

export interface UserAccount {
  id: string;
  name: string;
  initials: string;
  email: string;
  username: string;
  role: string;
  profileType: ProfileType;
  linkedProfileId?: string;
  linkedProfileName: string;
  lastLogin: string;
  status: UserStatus;
  forcePasswordChange: boolean;
  isLocked?: boolean;
  failedLoginAttempts?: number;
  activeSessionsCount?: number;
}

export interface ModulePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export type PermissionMatrix = Record<string, ModulePermission>;

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: PermissionMatrix;
}

export interface ModuleDefinition {
  key: string;
  label: string;
  group: string;
}

export const SIDEBAR_MODULE_GROUPS: { groupName: string; modules: ModuleDefinition[] }[] = [
  {
    groupName: 'OVERVIEW',
    modules: [
      { key: 'overview', label: 'Central Dashboard', group: 'OVERVIEW' },
      { key: 'recent_activity', label: 'Recent Activity', group: 'OVERVIEW' }
    ]
  },
  {
    groupName: 'ACADEMIC MANAGEMENT',
    modules: [
      { key: 'academic_years', label: 'Academic Years', group: 'ACADEMIC MANAGEMENT' },
      { key: 'departments', label: 'Departments', group: 'ACADEMIC MANAGEMENT' },
      { key: 'courses', label: 'Courses & Programs', group: 'ACADEMIC MANAGEMENT' },
      { key: 'semesters', label: 'Semesters', group: 'ACADEMIC MANAGEMENT' },
      { key: 'batches', label: 'Sections & Batches', group: 'ACADEMIC MANAGEMENT' },
      { key: 'subjects', label: 'Subjects Catalog', group: 'ACADEMIC MANAGEMENT' },
      { key: 'subject_allocation', label: 'Subject Allocation', group: 'ACADEMIC MANAGEMENT' }
    ]
  },
  {
    groupName: 'PEOPLE MANAGEMENT',
    modules: [
      { key: 'students', label: 'Students Directory', group: 'PEOPLE MANAGEMENT' },
      { key: 'student_admissions', label: 'Student Admissions', group: 'PEOPLE MANAGEMENT' },
      { key: 'faculty', label: 'Faculty Directory', group: 'PEOPLE MANAGEMENT' },
      { key: 'parents', label: 'Parents Directory', group: 'PEOPLE MANAGEMENT' },
      { key: 'user_accounts', label: 'User Accounts', group: 'PEOPLE MANAGEMENT' },
      { key: 'roles_permissions', label: 'Roles & Permissions', group: 'PEOPLE MANAGEMENT' }
    ]
  },
  {
    groupName: 'ACADEMIC OPERATIONS',
    modules: [
      { key: 'attendance', label: 'Attendance', group: 'ACADEMIC OPERATIONS' },
      { key: 'examinations', label: 'Examinations', group: 'ACADEMIC OPERATIONS' },
      { key: 'results', label: 'Results & Grades', group: 'ACADEMIC OPERATIONS' },
      { key: 'assignments', label: 'Assignments', group: 'ACADEMIC OPERATIONS' },
      { key: 'timetable', label: 'Timetable', group: 'ACADEMIC OPERATIONS' }
    ]
  },
  {
    groupName: 'FEES & FINANCE',
    modules: [
      { key: 'fee_structure', label: 'Fee Structure', group: 'FEES & FINANCE' },
      { key: 'fee_collection', label: 'Fee Collection', group: 'FEES & FINANCE' },
      { key: 'pending_fees', label: 'Pending Fees', group: 'FEES & FINANCE' },
      { key: 'payment_history', label: 'Payment History', group: 'FEES & FINANCE' },
      { key: 'receipts', label: 'Receipts', group: 'FEES & FINANCE' }
    ]
  },
  {
    groupName: 'COMMUNICATION',
    modules: [
      { key: 'notices', label: 'Notices & Announcements', group: 'COMMUNICATION' },
      { key: 'notifications', label: 'Notifications', group: 'COMMUNICATION' },
      { key: 'messages', label: 'Message Center', group: 'COMMUNICATION' }
    ]
  },
  {
    groupName: 'ANALYTICS & REPORTS',
    modules: [
      { key: 'analytics_overview', label: 'Analytics Overview', group: 'ANALYTICS & REPORTS' },
      { key: 'student_performance', label: 'Student Performance', group: 'ANALYTICS & REPORTS' },
      { key: 'attendance_analytics', label: 'Attendance Analytics', group: 'ANALYTICS & REPORTS' },
      { key: 'exam_reports', label: 'Examination Reports', group: 'ANALYTICS & REPORTS' },
      { key: 'fee-reports', label: 'Fee Reports', group: 'ANALYTICS & REPORTS' },
      { key: 'faculty_reports', label: 'Faculty Reports', group: 'ANALYTICS & REPORTS' }
    ]
  },
  {
    groupName: 'SYSTEM & SECURITY',
    modules: [
      { key: 'settings', label: 'System Settings', group: 'SYSTEM & SECURITY' },
      { key: 'security', label: 'Security Overview', group: 'SYSTEM & SECURITY' },
      { key: 'audit_logs', label: 'Audit Logs', group: 'SYSTEM & SECURITY' },
      { key: 'activity_history', label: 'Activity History', group: 'SYSTEM & SECURITY' }
    ]
  }
];
