import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Faculty, FacultyStatus } from '../models/faculty-parent.model';
import { AcademicService } from './academic.service';
import { ActivityService } from './activity.service';
import { AuditService } from './audit.service';
import { FirestoreCollectionSync } from '../lib/firestore-collection-sync';

const SEED_FACULTY: Faculty[] = [
  {
    id: 'fac-1',
    employeeId: 'FAC-0001',
    name: 'Dr. S. N. Roy',
    initials: 'SR',
    gender: 'Male',
    email: 'sn.roy@eduerp.edu',
    phone: '9811001122',
    departmentId: 'dept-mca',
    department: 'Computer Applications',
    designation: 'Professor',
    qualification: 'Ph.D. in Computer Science (IIT Delhi)',
    specialization: 'Distributed Computing & Software Engineering',
    experienceYears: 18,
    experience: '18 Years',
    joiningDate: '2008-07-15',
    status: 'Active',
    isHod: true,
    maxWeeklyHours: 16,
    documentsVerified: true
  },
  {
    id: 'fac-2',
    employeeId: 'FAC-0002',
    name: 'Dr. Amit Joshi',
    initials: 'AJ',
    gender: 'Male',
    email: 'amit.joshi@eduerp.edu',
    phone: '9811002233',
    departmentId: 'dept-mca',
    department: 'Computer Applications',
    designation: 'Professor',
    qualification: 'Ph.D. in Algorithms & Data Structures',
    specialization: 'Competitive Algorithms & Graph Theory',
    experienceYears: 14,
    experience: '14 Years',
    joiningDate: '2012-08-01',
    status: 'Active',
    maxWeeklyHours: 18,
    documentsVerified: true
  },
  {
    id: 'fac-3',
    employeeId: 'FAC-0003',
    name: 'Prof. Ananya Sen',
    initials: 'AS',
    gender: 'Female',
    email: 'ananya.sen@eduerp.edu',
    phone: '9811003344',
    departmentId: 'dept-mca',
    department: 'Computer Applications',
    designation: 'Associate Professor',
    qualification: 'M.Tech Full Stack Web Architectures',
    specialization: 'Cloud Native Angular & Microservices',
    experienceYears: 10,
    experience: '10 Years',
    joiningDate: '2016-01-10',
    status: 'Active',
    maxWeeklyHours: 18,
    documentsVerified: true
  },
  {
    id: 'fac-4',
    employeeId: 'FAC-0004',
    name: 'Prof. Meena Sharma',
    initials: 'MS',
    gender: 'Female',
    email: 'meena.sharma@eduerp.edu',
    phone: '9811004455',
    departmentId: 'dept-mca',
    department: 'Computer Applications',
    designation: 'Assistant Professor',
    qualification: 'MCA, M.Tech Software Systems',
    specialization: 'Discrete Mathematics & Logic',
    experienceYears: 7,
    experience: '7 Years',
    joiningDate: '2019-07-20',
    status: 'Active',
    maxWeeklyHours: 18,
    documentsVerified: true
  },
  {
    id: 'fac-5',
    employeeId: 'FAC-0005',
    name: 'Prof. Sandeep Bansal',
    initials: 'SB',
    gender: 'Male',
    email: 'sandeep.bansal@eduerp.edu',
    phone: '9811005566',
    departmentId: 'dept-mca',
    department: 'Computer Applications',
    designation: 'Assistant Professor',
    qualification: 'M.Tech Cloud Computing & DevOps',
    specialization: 'Kubernetes & CI/CD Systems',
    experienceYears: 5,
    experience: '5 Years',
    joiningDate: '2021-02-15',
    status: 'Active',
    maxWeeklyHours: 20,
    documentsVerified: true
  },
  {
    id: 'fac-6',
    employeeId: 'FAC-0006',
    name: 'Dr. Shalini Gupta',
    initials: 'SG',
    gender: 'Female',
    email: 'shalini.gupta@eduerp.edu',
    phone: '9822001122',
    departmentId: 'dept-cse',
    department: 'Computer Science & Engineering',
    designation: 'Professor',
    qualification: 'Ph.D. Artificial Intelligence & ML (IITB)',
    specialization: 'Deep Learning & Computer Vision',
    experienceYears: 16,
    experience: '16 Years',
    joiningDate: '2010-06-10',
    status: 'Active',
    isHod: true,
    maxWeeklyHours: 16,
    documentsVerified: true
  },
  {
    id: 'fac-7',
    employeeId: 'FAC-0007',
    name: 'Dr. Rajesh Khanna',
    initials: 'RK',
    gender: 'Male',
    email: 'rajesh.khanna@eduerp.edu',
    phone: '9833001122',
    departmentId: 'dept-it',
    department: 'Information Technology',
    designation: 'Professor',
    qualification: 'Ph.D. Network Security & Distributed Systems',
    experienceYears: 15,
    experience: '15 Years',
    joiningDate: '2011-09-01',
    status: 'Active',
    isHod: true,
    maxWeeklyHours: 16,
    documentsVerified: true
  },
  {
    id: 'fac-8',
    employeeId: 'FAC-0008',
    name: 'Dr. Manish Aggarwal',
    initials: 'MA',
    gender: 'Male',
    email: 'manish.aggarwal@eduerp.edu',
    phone: '9844001122',
    departmentId: 'dept-mgmt',
    department: 'Management Studies',
    designation: 'Professor',
    qualification: 'Ph.D. Financial Management (IIM-A)',
    experienceYears: 12,
    experience: '12 Years',
    joiningDate: '2014-07-01',
    status: 'Active',
    isHod: true,
    maxWeeklyHours: 16,
    documentsVerified: true
  },
  {
    id: 'fac-9',
    employeeId: 'FAC-0009',
    name: 'Dr. P. V. Ramamurthy',
    initials: 'PR',
    gender: 'Male',
    email: 'pv.ramamurthy@eduerp.edu',
    phone: '9855001122',
    departmentId: 'dept-comm',
    department: 'Commerce & Finance',
    designation: 'Professor',
    qualification: 'Ph.D. Corporate Accounting & Taxation',
    experienceYears: 20,
    experience: '20 Years',
    joiningDate: '2006-08-15',
    status: 'Active',
    isHod: true,
    maxWeeklyHours: 16,
    documentsVerified: true
  },
  {
    id: 'fac-10',
    employeeId: 'FAC-0010',
    name: 'Dr. T. P. Raman',
    initials: 'TR',
    gender: 'Male',
    email: 'tp.raman@eduerp.edu',
    phone: '9866001122',
    departmentId: 'dept-ece',
    department: 'Electronics & Communication',
    designation: 'Professor',
    qualification: 'Ph.D. VLSI & Embedded Systems',
    experienceYears: 17,
    experience: '17 Years',
    joiningDate: '2009-07-10',
    status: 'Active',
    isHod: true,
    maxWeeklyHours: 16,
    documentsVerified: true
  },
  {
    id: 'fac-11',
    employeeId: 'FAC-0011',
    name: 'Prof. Vikram Chatterji',
    initials: 'VC',
    gender: 'Male',
    email: 'vikram.chatterji@eduerp.edu',
    phone: '9877001122',
    departmentId: 'dept-cse',
    department: 'Computer Science & Engineering',
    designation: 'Associate Professor',
    qualification: 'M.Tech Cyber Security & Forensics',
    experienceYears: 9,
    experience: '9 Years',
    joiningDate: '2017-08-20',
    status: 'On Leave',
    maxWeeklyHours: 18,
    documentsVerified: true
  },
  {
    id: 'fac-12',
    employeeId: 'FAC-0012',
    name: 'Prof. Deepa Varghese',
    initials: 'DV',
    gender: 'Female',
    email: 'deepa.varghese@eduerp.edu',
    phone: '9888001122',
    departmentId: 'dept-it',
    department: 'Information Technology',
    designation: 'Assistant Professor',
    qualification: 'M.Tech Software Engineering',
    experienceYears: 6,
    experience: '6 Years',
    joiningDate: '2020-01-15',
    status: 'Active',
    maxWeeklyHours: 18,
    documentsVerified: false
  }
];

@Injectable({
  providedIn: 'root'
})
export class FacultyService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly academicService = inject(AcademicService);
  private readonly activityService = inject(ActivityService);
  private readonly auditService = inject(AuditService);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _facultyList = signal<Faculty[]>([]);
  private readonly facultySync = new FirestoreCollectionSync<Faculty>(
    'facultyMembers',
    'eduerp_faculty_v2',
    this._facultyList,
    this.isBrowser
  );

  readonly facultyList = this._facultyList.asReadonly();

  constructor() {
    this._facultyList.set(this.facultySync.loadInitial(SEED_FACULTY));
    this.facultySync.startSync();
  }

  readonly facultyStats = computed(() => {
    const list = this._facultyList();
    const professors = list.filter(f => f.designation === 'Professor').length;
    const associate = list.filter(f => f.designation === 'Associate Professor').length;
    const assistant = list.filter(f => f.designation === 'Assistant Professor' || f.designation === 'Lecturer').length;
    const deptSet = new Set(list.map(f => f.department));

    return {
      total: list.length,
      breakdown: `${professors} Prof / ${associate} Assoc / ${assistant} Asst`,
      departmentsCovered: deptSet.size
    };
  });

  getAssignedHours(facultyName: string): number {
    return this.academicService.getFacultyWeeklyHours(facultyName);
  }

  private generateInitials(name: string): string {
    const parts = name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s+/, '').trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  generateEmployeeId(): string {
    const nextNum = this._facultyList().length + 1;
    return `FAC-${String(nextNum).padStart(4, '0')}`;
  }

  saveFaculty(
    data: Omit<Faculty, 'id' | 'initials' | 'experience'>,
    editId?: string
  ): { success: boolean; error?: string } {
    const cleanEmpId = data.employeeId.trim().toUpperCase();
    const cleanEmail = data.email.trim().toLowerCase();

    const existing = this._facultyList().find(
      f => f.employeeId.toUpperCase() === cleanEmpId && f.id !== editId
    );
    if (existing) {
      return { success: false, error: `Employee ID "${cleanEmpId}" is already assigned to ${existing.name}.` };
    }

    const initials = this.generateInitials(data.name);
    const experience = `${data.experienceYears} Year${data.experienceYears === 1 ? '' : 's'}`;

    const record: Faculty = editId
      ? { ...data, employeeId: cleanEmpId, email: cleanEmail, experience, initials, id: editId }
      : { ...data, employeeId: cleanEmpId, email: cleanEmail, experience, initials, id: `fac-${Date.now()}` };

    if (editId) {
      this._facultyList.update(list => list.map(f => (f.id === editId ? record : f)));
    } else {
      this._facultyList.update(list => [record, ...list]);
    }
    this.facultySync.syncUpsert(record);

    this.activityService.logActivity({
      user: 'Admin (Dean Office)',
      role: 'System Administrator',
      operationType: editId ? 'Update' : 'Create',
      action: editId ? 'updated faculty record for' : 'onboarded new faculty member',
      target: `${record.name} (${record.employeeId} · ${record.department})`,
      recordId: record.id,
      module: 'Faculty Directory',
      category: 'People',
      icon: 'badge'
    });

    return { success: true };
  }

  toggleFacultyStatus(id: string, nextStatus: FacultyStatus): void {
    const target = this._facultyList().find(f => f.id === id);
    if (!target) return;
    const updated: Faculty = { ...target, status: nextStatus };
    this._facultyList.update(list => list.map(f => (f.id === id ? updated : f)));
    this.facultySync.syncUpsert(updated);
    this.activityService.logActivity({
      user: 'Admin (Dean Office)',
      role: 'System Administrator',
      operationType: 'Update',
      action: 'updated faculty duty status',
      target: `${updated.name} (${updated.employeeId}) -> ${nextStatus}`,
      recordId: updated.id,
      module: 'Faculty Directory',
      category: 'People',
      icon: 'sync'
    });
  }

  toggleDocumentVerification(id: string): void {
    const target = this._facultyList().find(f => f.id === id);
    if (!target) return;
    const updated: Faculty = { ...target, documentsVerified: !target.documentsVerified };
    this._facultyList.update(list => list.map(f => (f.id === id ? updated : f)));
    this.facultySync.syncUpsert(updated);
  }

  deleteFaculty(id: string): { success: boolean; error?: string } {
    const target = this._facultyList().find(f => f.id === id);
    if (!target) {
      return { success: false, error: 'Faculty record not found.' };
    }

    const activeAllocations = this.academicService.subjectAllocations().filter(
      alloc => alloc.faculty.toLowerCase().trim() === target.name.toLowerCase().trim()
    );

    if (activeAllocations.length > 0) {
      const subjectsList = activeAllocations.map(a => `"${a.subject}" (${a.section})`).join(', ');
      return {
        success: false,
        error: `Cannot delete "${target.name}". They are currently allocated to ${activeAllocations.length} active subject(s): ${subjectsList}. Reassign or remove these subject allocations first.`
      };
    }

    this._facultyList.update(list => list.filter(f => f.id !== id));
    this.facultySync.syncDelete(id);

    this.activityService.logActivity({
      user: 'Admin (Dean Office)',
      role: 'System Administrator',
      operationType: 'Delete',
      action: 'removed faculty profile',
      target: `${target.name} (${target.employeeId})`,
      recordId: target.id,
      module: 'Faculty Directory',
      category: 'People',
      icon: 'delete'
    });
    this.auditService.log({
      userId: 'admin',
      userName: 'System Administrator',
      role: 'Super Admin',
      module: 'Faculty Directory',
      action: 'Delete',
      target: `${target.name} (${target.employeeId})`,
      status: 'Success'
    });

    return { success: true };
  }
}
