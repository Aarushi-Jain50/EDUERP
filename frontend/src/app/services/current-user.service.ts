import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FacultyService } from './faculty.service';
import { StudentsService } from './students.service';
import { ParentsService } from './parents.service';

export type UserRole = 'faculty' | 'admin' | 'superadmin' | 'student' | 'parent';

const VALID_ROLES: readonly UserRole[] = ['faculty', 'admin', 'superadmin', 'student', 'parent'];

@Injectable({
  providedIn: 'root'
})
export class CurrentUserService {
  private readonly facultyService = inject(FacultyService);
  private readonly studentsService = inject(StudentsService);
  private readonly parentsService = inject(ParentsService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly role = signal<UserRole>(this.readStoredRole() ?? 'faculty');
  readonly isAuthenticated = signal<boolean>(this.readStoredRole() !== null);
  readonly facultyId = signal<string>('fac-4'); // Default: Prof. Meena Sharma
  readonly studentId = signal<string>('stu-1'); // Default: Rahul Verma (MCA Sec A)
  readonly parentId = signal<string>('par-1'); // Default: Sanjay Verma
  readonly selectedStudentId = signal<string>('stu-1'); // Default: first linked child
  readonly userId = signal<string>(this.resolveUserId(this.role(), 'fac-4'));
  readonly userEmail = signal<string>(this.readStoredEmail() ?? 'admin@eduerp.edu');

  private readonly customStudentProfile = signal<{ name: string; email: string; initials: string } | null>(null);
  private readonly customParentProfile = signal<{ name: string; email: string; initials: string } | null>(null);

  readonly currentFaculty = signal(
    this.facultyService.facultyList().find(f => f.id === 'fac-4') || this.facultyService.facultyList()[0]
  );

  readonly currentStudent = computed(() => {
    const sList = this.studentsService.students();
    const base = sList.find(s => s.id === this.studentId()) || sList[0];
    const override = this.customStudentProfile();
    return override && base ? { ...base, ...override } : base;
  });

  readonly currentParent = computed(() => {
    const pList = this.parentsService.parentsList();
    const base = pList.find(p => p.id === this.parentId()) || pList[0] || null;
    const override = this.customParentProfile();
    return override && base ? { ...base, ...override } : base;
  });

  readonly linkedStudents = computed(() => {
    const parent = this.currentParent();
    if (!parent) return [];
    const allowedIds = new Set(parent.studentIds);
    return this.studentsService.students().filter(s => allowedIds.has(s.id));
  });

  readonly selectedChild = computed(() => {
    const linked = this.linkedStudents();
    if (linked.length === 0) return null;
    return linked.find(s => s.id === this.selectedStudentId()) || linked[0];
  });

  private readStoredRole(): UserRole | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const raw = localStorage.getItem('eduerp_role');
    if (raw && (VALID_ROLES as readonly string[]).includes(raw)) {
      return raw as UserRole;
    }
    return null;
  }

  hasStoredSession(): boolean {
    const authenticated = this.readStoredRole() !== null;
    if (this.isAuthenticated() !== authenticated) {
      this.isAuthenticated.set(authenticated);
    }
    return authenticated;
  }

  private readStoredEmail(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem('eduerp_user');
  }

  private resolveUserId(role: UserRole, facId: string): string {
    if (role === 'faculty') return `user-${facId}`;
    if (role === 'student') return `user-${this.studentId()}`;
    if (role === 'parent') return `user-${this.parentId()}`;
    return `user-${role}`;
  }

  syncFromStorage(): UserRole {
    const stored = this.readStoredRole();
    this.isAuthenticated.set(stored !== null);
    if (stored && stored !== this.role()) {
      this.role.set(stored);
      this.userId.set(this.resolveUserId(stored, this.facultyId()));
    }
    const effectiveRole = stored ?? this.role();
    const storedEmail = this.readStoredEmail();
    const storedName = isPlatformBrowser(this.platformId) ? localStorage.getItem('eduerp_name') : null;
    if (storedEmail) {
      this.userEmail.set(storedEmail);
      if (effectiveRole === 'faculty') {
        this.applySignedInFacultyIdentity(storedEmail, storedName ?? undefined);
      } else if (effectiveRole === 'student') {
        this.applySignedInStudentIdentity(storedEmail, storedName ?? undefined);
      } else if (effectiveRole === 'parent') {
        this.applySignedInParentIdentity(storedEmail, storedName ?? undefined);
      }
    }
    if (effectiveRole === 'parent') {
      this.ensureValidSelectedChild();
    }
    return this.role();
  }

  private applySignedInFacultyIdentity(email: string, displayName?: string): void {
    const matched = this.facultyService.facultyList().find(
      f => f.email.toLowerCase() === email.toLowerCase()
    );
    if (matched) {
      this.switchFaculty(matched.id);
      return;
    }

    const base =
      this.facultyService.facultyList().find(f => f.id === 'fac-4') ||
      this.facultyService.facultyList()[0];
    if (!base) return;

    const resolvedName = (displayName && displayName.trim()) || this.formatNameFromEmail(email);
    const initials = this.computeInitials(resolvedName);
    this.facultyId.set(base.id);
    this.currentFaculty.set({
      ...base,
      name: resolvedName,
      email,
      initials
    });
    if (this.role() === 'faculty') {
      this.userId.set(`user-${base.id}`);
    }
  }

  private applySignedInStudentIdentity(email: string, displayName?: string): void {
    const matched = this.studentsService.students().find(
      s => s.email.toLowerCase() === email.toLowerCase()
    );
    if (matched) {
      this.customStudentProfile.set(null);
      this.switchStudent(matched.id);
      return;
    }

    const base =
      this.studentsService.students().find(s => s.id === 'stu-1') ||
      this.studentsService.students()[0];
    if (!base) return;

    const resolvedName = (displayName && displayName.trim()) || this.formatNameFromEmail(email);
    const initials = this.computeInitials(resolvedName);
    this.studentId.set(base.id);
    this.customStudentProfile.set({ name: resolvedName, email, initials });
    if (this.role() === 'student') {
      this.userId.set(`user-${base.id}`);
    }
  }

  private applySignedInParentIdentity(email: string, displayName?: string): void {
    const matched = this.parentsService.parentsList().find(
      p => p.email.toLowerCase() === email.toLowerCase()
    );
    if (matched) {
      this.customParentProfile.set(null);
      if (matched.id !== this.parentId()) {
        this.switchParent(matched.id);
      }
      return;
    }

    const base =
      this.parentsService.parentsList().find(p => p.id === 'par-1') ||
      this.parentsService.parentsList()[0];
    if (!base) return;

    const resolvedName = (displayName && displayName.trim()) || this.formatNameFromEmail(email);
    const initials = this.computeInitials(resolvedName);
    this.parentId.set(base.id);
    this.customParentProfile.set({ name: resolvedName, email, initials });
    this.ensureValidSelectedChild();
    if (this.role() === 'parent') {
      this.userId.set(`user-${base.id}`);
    }
  }

  private formatNameFromEmail(email: string): string {
    const localPart = email.split('@')[0] || 'Faculty Member';
    return localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  private computeInitials(name: string): string {
    const parts = name
      .replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+/i, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return 'FM';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }

  private ensureValidSelectedChild(): void {
    const linked = this.linkedStudents();
    if (linked.length === 0) {
      this.selectedStudentId.set('');
      return;
    }
    if (!linked.some(s => s.id === this.selectedStudentId())) {
      this.selectedStudentId.set(linked[0].id);
    }
  }

  switchFaculty(id: string): void {
    this.facultyId.set(id);
    const found = this.facultyService.facultyList().find(f => f.id === id);
    if (found) {
      this.currentFaculty.set(found);
    }
    if (this.role() === 'faculty') {
      this.userId.set(`user-${id}`);
    }
  }

  switchStudent(id: string): void {
    this.customStudentProfile.set(null);
    this.studentId.set(id);
    const found = this.studentsService.students().find(s => s.id === id);
    if (found) {
      this.userEmail.set(found.email);
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('eduerp_user', found.email);
      }
    }
    if (this.role() === 'student') {
      this.userId.set(`user-${id}`);
    }
  }

  switchParent(id: string): void {
    const found = this.parentsService.parentsList().find(p => p.id === id);
    if (!found) return;

    this.customParentProfile.set(null);
    this.parentId.set(found.id);
    const firstLinked = this.studentsService.students().find(s => found.studentIds.includes(s.id));
    this.selectedStudentId.set(firstLinked ? firstLinked.id : '');
    this.userEmail.set(found.email);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('eduerp_user', found.email);
    }
    if (this.role() === 'parent') {
      this.userId.set(`user-${found.id}`);
    }
  }

  selectChild(studentId: string): boolean {
    const isLinked = this.linkedStudents().some(s => s.id === studentId);
    if (!isLinked) {
      return false;
    }
    this.selectedStudentId.set(studentId);
    return true;
  }

  setRole(newRole: UserRole): void {
    this.role.set(newRole);
    this.isAuthenticated.set(true);
    this.userId.set(this.resolveUserId(newRole, this.facultyId()));
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('eduerp_role', newRole);
    }
  }

  loginAs(role: UserRole, email?: string, displayName?: string): void {
    this.setRole(role);
    if (isPlatformBrowser(this.platformId)) {
      if (displayName && displayName.trim()) {
        localStorage.setItem('eduerp_name', displayName.trim());
      } else {
        localStorage.removeItem('eduerp_name');
      }
    }
    if (email) {
      this.userEmail.set(email);
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('eduerp_user', email);
      }
      if (role === 'faculty') {
        this.applySignedInFacultyIdentity(email, displayName);
      } else if (role === 'student') {
        this.applySignedInStudentIdentity(email, displayName);
      } else if (role === 'parent') {
        this.applySignedInParentIdentity(email, displayName);
      }
    }
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('eduerp_role');
      localStorage.removeItem('eduerp_user');
      localStorage.removeItem('eduerp_name');
      localStorage.removeItem('eduerp_admin_token');
      sessionStorage.removeItem('eduerp_admin_token');
    }
    this.isAuthenticated.set(false);
    this.role.set('faculty');
    this.facultyId.set('fac-4');
    const defaultFac =
      this.facultyService.facultyList().find(f => f.id === 'fac-4') ||
      this.facultyService.facultyList()[0];
    if (defaultFac) {
      this.currentFaculty.set(defaultFac);
    }
    this.customStudentProfile.set(null);
    this.customParentProfile.set(null);
    this.studentId.set('stu-1');
    this.parentId.set('par-1');
    this.selectedStudentId.set('stu-1');
    this.userEmail.set('admin@eduerp.edu');
    this.userId.set('user-fac-4');
  }

  getHomeRoute(role: UserRole = this.role()): string {
    switch (role) {
      case 'admin':
      case 'superadmin':
        return '/admin/overview';
      case 'faculty':
        return '/faculty/dashboard';
      case 'student':
        return '/student/dashboard';
      case 'parent':
        return '/parent/dashboard';
      default:
        return '/login';
    }
  }
}
