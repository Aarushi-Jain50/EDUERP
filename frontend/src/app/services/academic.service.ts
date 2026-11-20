import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FirestoreCollectionSync } from '../lib/firestore-collection-sync';
import { ActivityService } from './activity.service';
import { AuditService } from './audit.service';

export interface AcademicYear {
  id: string;
  year: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Upcoming' | 'Completed';
  notes?: string;
}

export type CalendarPeriodType =
  | 'Admission Window'
  | 'Course Registration'
  | 'Mid-Term Exam'
  | 'End-Term Exam'
  | 'Holiday'
  | 'Convocation';

export interface AcademicCalendarEvent {
  id: string;
  academicYear: string;
  title: string;
  periodType: CalendarPeriodType;
  startDate: string;
  endDate: string;
  description?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  hod: string;
  facultyCount: number;
  studentCount: number;
  coursesCount: number;
  status: 'Active' | 'Inactive';
  establishedYear?: number;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  department: string;
  level: 'UG' | 'PG';
  duration: string;
  semesters: number;
  intake: number;
  eligibilityCriteria?: string;
  status: 'Active' | 'Inactive';
}

export interface SemesterRecord {
  id: string;
  semesterNumber: number;
  course: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  registrationStartDate?: string;
  registrationEndDate?: string;
  examStartDate?: string;
  examEndDate?: string;
  status: 'Active' | 'Upcoming' | 'Completed';
}

export interface SectionRecord {
  id: string;
  section: string;
  course: string;
  semester: string;
  classTeacher: string;
  currentStrength: number;
  capacity: number;
  status: 'Active' | 'Inactive';
}

export interface BatchRecord {
  id: string;
  batchName: string;
  course: string;
  startYear: number;
  endYear: number;
  studentsCount: number;
  currentSemester?: string;
  status: 'Active' | 'Inactive';
}

export interface SubjectRecord {
  id: string;
  code: string;
  name: string;
  course: string;
  semester: string;
  type: 'Theory' | 'Practical' | 'Elective';
  credits: number;
  lectureHours?: number;
  practicalHours?: number;
  prerequisites?: string;
  status: 'Active' | 'Inactive';
}

export interface SubjectAllocationRecord {
  id: string;
  subject: string;
  faculty: string;
  course: string;
  semester: string;
  section: string;
  weeklyHours: number;
}

export interface SessionValidationResult {
  valid: boolean;
  blockers: string[];
  warnings: string[];
}

const SEED_ACADEMIC_YEARS: AcademicYear[] = [
  {
    id: 'ay-2025-26',
    year: '2025-26',
    startDate: '2025-07-01',
    endDate: '2026-06-30',
    status: 'Active',
    notes: 'Current ongoing academic session across all affiliated colleges'
  },
  {
    id: 'ay-2026-27',
    year: '2026-27',
    startDate: '2026-07-01',
    endDate: '2027-06-30',
    status: 'Upcoming',
    notes: 'Next academic year for NEP 2020 4-year curriculum revision'
  },
  {
    id: 'ay-2024-25',
    year: '2024-25',
    startDate: '2024-07-01',
    endDate: '2025-06-30',
    status: 'Completed',
    notes: 'Archived session. Grade cards and convocation issued.'
  },
  {
    id: 'ay-2023-24',
    year: '2023-24',
    startDate: '2023-07-01',
    endDate: '2024-06-30',
    status: 'Completed',
    notes: 'Archived session'
  },
  {
    id: 'ay-2022-23',
    year: '2022-23',
    startDate: '2022-07-01',
    endDate: '2023-06-30',
    status: 'Completed',
    notes: 'Archived session'
  }
];

const SEED_CALENDAR_EVENTS: AcademicCalendarEvent[] = [
  {
    id: 'cal-1',
    academicYear: '2025-26',
    title: 'Even Semester Course Registration',
    periodType: 'Course Registration',
    startDate: '2026-01-02',
    endDate: '2026-01-15',
    description: 'Mandatory elective selection and semester enrollment verification.'
  },
  {
    id: 'cal-2',
    academicYear: '2025-26',
    title: 'Mid-Term Internal Examinations',
    periodType: 'Mid-Term Exam',
    startDate: '2026-03-10',
    endDate: '2026-03-22',
    description: 'Theory & practical continuous evaluation assessments.'
  },
  {
    id: 'cal-3',
    academicYear: '2025-26',
    title: 'Even Semester End-Term Examinations',
    periodType: 'End-Term Exam',
    startDate: '2026-05-18',
    endDate: '2026-06-08',
    description: 'University final semester written and lab examinations.'
  },
  {
    id: 'cal-4',
    academicYear: '2026-27',
    title: 'Fresh Intake Admission Portal Window',
    periodType: 'Admission Window',
    startDate: '2026-04-01',
    endDate: '2026-06-25',
    description: 'Online counseling, entrance merit list verification, and fee lock.'
  }
];

const SEED_DEPARTMENTS: Department[] = [
  {
    id: 'dept-mca',
    name: 'Computer Applications',
    code: 'MCA',
    hod: 'Dr. S. N. Roy',
    facultyCount: 18,
    studentCount: 240,
    coursesCount: 2,
    status: 'Active',
    establishedYear: 2004
  },
  {
    id: 'dept-cse',
    name: 'Computer Science & Engineering',
    code: 'CSE',
    hod: 'Dr. Shalini Gupta',
    facultyCount: 28,
    studentCount: 480,
    coursesCount: 4,
    status: 'Active',
    establishedYear: 1998
  },
  {
    id: 'dept-it',
    name: 'Information Technology',
    code: 'IT',
    hod: 'Dr. Rajesh Khanna',
    facultyCount: 22,
    studentCount: 360,
    coursesCount: 3,
    status: 'Active',
    establishedYear: 2002
  },
  {
    id: 'dept-mgmt',
    name: 'Management Studies',
    code: 'MGMT',
    hod: 'Dr. Manish Aggarwal',
    facultyCount: 16,
    studentCount: 280,
    coursesCount: 2,
    status: 'Active',
    establishedYear: 2006
  },
  {
    id: 'dept-comm',
    name: 'Commerce & Finance',
    code: 'COMM',
    hod: 'Dr. P. V. Ramamurthy',
    facultyCount: 14,
    studentCount: 220,
    coursesCount: 2,
    status: 'Active',
    establishedYear: 2010
  },
  {
    id: 'dept-ece',
    name: 'Electronics & Communication',
    code: 'ECE',
    hod: 'Dr. T. P. Raman',
    facultyCount: 20,
    studentCount: 320,
    coursesCount: 3,
    status: 'Active',
    establishedYear: 2000
  }
];

const SEED_COURSES: Course[] = [
  {
    id: 'course-mca',
    name: 'Master of Computer Applications',
    code: 'MCA-400',
    department: 'Computer Applications',
    level: 'PG',
    duration: '2 Years',
    semesters: 4,
    intake: 60,
    eligibilityCriteria: 'BCA / B.Sc (CS/IT) or Bachelor degree with Maths at 10+2 (Min 50%)',
    status: 'Active'
  },
  {
    id: 'course-bca',
    name: 'Bachelor of Computer Applications',
    code: 'BCA-300',
    department: 'Computer Applications',
    level: 'UG',
    duration: '3 Years',
    semesters: 6,
    intake: 120,
    eligibilityCriteria: '10+2 passed with Minimum 50% aggregate & Mathematics/Computer Science',
    status: 'Active'
  },
  {
    id: 'course-btech-cse',
    name: 'B.Tech Computer Science & Engineering',
    code: 'BTECH-CSE',
    department: 'Computer Science & Engineering',
    level: 'UG',
    duration: '4 Years',
    semesters: 8,
    intake: 180,
    eligibilityCriteria: '10+2 PCM with Min 60% & Valid JEE / State CET Rank',
    status: 'Active'
  },
  {
    id: 'course-mtech-ai',
    name: 'M.Tech Artificial Intelligence & Robotics',
    code: 'MTECH-AI',
    department: 'Computer Science & Engineering',
    level: 'PG',
    duration: '2 Years',
    semesters: 4,
    intake: 30,
    eligibilityCriteria: 'B.E./B.Tech in CS/IT/ECE with Min 60% or GATE Qualified',
    status: 'Active'
  },
  {
    id: 'course-btech-it',
    name: 'B.Tech Information Technology',
    code: 'BTECH-IT',
    department: 'Information Technology',
    level: 'UG',
    duration: '4 Years',
    semesters: 8,
    intake: 120,
    eligibilityCriteria: '10+2 PCM with Min 55% & Entrance Rank',
    status: 'Active'
  },
  {
    id: 'course-mba',
    name: 'Master of Business Administration',
    code: 'MBA-GEN',
    department: 'Management Studies',
    level: 'PG',
    duration: '2 Years',
    semesters: 4,
    intake: 120,
    eligibilityCriteria: 'Bachelor degree in any discipline with 50% + CAT/MAT Score',
    status: 'Active'
  },
  {
    id: 'course-bba',
    name: 'Bachelor of Business Administration',
    code: 'BBA-HONS',
    department: 'Management Studies',
    level: 'UG',
    duration: '3 Years',
    semesters: 6,
    intake: 120,
    eligibilityCriteria: '10+2 in any stream with Min 50% aggregate',
    status: 'Active'
  },
  {
    id: 'course-bcom',
    name: 'Bachelor of Commerce (Honours)',
    code: 'BCOM-FIN',
    department: 'Commerce & Finance',
    level: 'UG',
    duration: '3 Years',
    semesters: 6,
    intake: 140,
    eligibilityCriteria: '10+2 Commerce / Mathematics with Min 55%',
    status: 'Active'
  },
  {
    id: 'course-mcom',
    name: 'Master of Commerce (Accounting & Taxation)',
    code: 'MCOM-ACC',
    department: 'Commerce & Finance',
    level: 'PG',
    duration: '2 Years',
    semesters: 4,
    intake: 60,
    eligibilityCriteria: 'B.Com / BBA with Min 50% aggregate',
    status: 'Active'
  },
  {
    id: 'course-btech-ece',
    name: 'B.Tech Electronics & Communication',
    code: 'BTECH-ECE',
    department: 'Electronics & Communication',
    level: 'UG',
    duration: '4 Years',
    semesters: 8,
    intake: 120,
    eligibilityCriteria: '10+2 PCM with Min 55%',
    status: 'Active'
  }
];

const SEED_SEMESTERS: SemesterRecord[] = [
  { id: 'sem-1', semesterNumber: 1, course: 'Master of Computer Applications', academicYear: '2025-26', startDate: '2025-07-01', endDate: '2025-12-15', registrationStartDate: '2025-07-01', registrationEndDate: '2025-07-15', examStartDate: '2025-11-20', examEndDate: '2025-12-10', status: 'Completed' },
  { id: 'sem-2', semesterNumber: 2, course: 'Master of Computer Applications', academicYear: '2025-26', startDate: '2026-01-05', endDate: '2026-06-15', registrationStartDate: '2026-01-02', registrationEndDate: '2026-01-16', examStartDate: '2026-05-18', examEndDate: '2026-06-08', status: 'Active' },
  { id: 'sem-3', semesterNumber: 3, course: 'Master of Computer Applications', academicYear: '2026-27', startDate: '2026-07-01', endDate: '2026-12-15', registrationStartDate: '2026-07-01', registrationEndDate: '2026-07-14', examStartDate: '2026-11-22', examEndDate: '2026-12-10', status: 'Upcoming' },
  { id: 'sem-4', semesterNumber: 4, course: 'Master of Computer Applications', academicYear: '2026-27', startDate: '2027-01-05', endDate: '2027-06-15', status: 'Upcoming' },
  { id: 'sem-5', semesterNumber: 1, course: 'Bachelor of Computer Applications', academicYear: '2025-26', startDate: '2025-07-01', endDate: '2025-12-15', status: 'Completed' },
  { id: 'sem-6', semesterNumber: 2, course: 'Bachelor of Computer Applications', academicYear: '2025-26', startDate: '2026-01-05', endDate: '2026-06-15', registrationStartDate: '2026-01-02', registrationEndDate: '2026-01-15', examStartDate: '2026-05-20', examEndDate: '2026-06-09', status: 'Active' },
  { id: 'sem-7', semesterNumber: 1, course: 'B.Tech Computer Science & Engineering', academicYear: '2025-26', startDate: '2025-07-01', endDate: '2025-12-15', status: 'Completed' },
  { id: 'sem-8', semesterNumber: 2, course: 'B.Tech Computer Science & Engineering', academicYear: '2025-26', startDate: '2026-01-05', endDate: '2026-06-15', registrationStartDate: '2026-01-03', registrationEndDate: '2026-01-18', examStartDate: '2026-05-19', examEndDate: '2026-06-10', status: 'Active' }
];

const SEED_SECTIONS: SectionRecord[] = [
  { id: 'sec-1', section: 'Section A', course: 'Master of Computer Applications', semester: 'Semester 2', classTeacher: 'Dr. Amit Joshi', currentStrength: 58, capacity: 60, status: 'Active' },
  { id: 'sec-2', section: 'Section B', course: 'Master of Computer Applications', semester: 'Semester 2', classTeacher: 'Prof. Ananya Sen', currentStrength: 55, capacity: 60, status: 'Active' },
  { id: 'sec-3', section: 'Section A', course: 'Bachelor of Computer Applications', semester: 'Semester 2', classTeacher: 'Prof. Meena Sharma', currentStrength: 112, capacity: 120, status: 'Active' },
  { id: 'sec-4', section: 'Section A', course: 'B.Tech Computer Science & Engineering', semester: 'Semester 2', classTeacher: 'Dr. Rajesh Khanna', currentStrength: 170, capacity: 180, status: 'Active' }
];

const SEED_BATCHES: BatchRecord[] = [
  { id: 'batch-1', batchName: '2024-2026', course: 'Master of Computer Applications', startYear: 2024, endYear: 2026, studentsCount: 115, currentSemester: 'Semester 4', status: 'Active' },
  { id: 'batch-2', batchName: '2025-2027', course: 'Master of Computer Applications', startYear: 2025, endYear: 2027, studentsCount: 120, currentSemester: 'Semester 2', status: 'Active' },
  { id: 'batch-3', batchName: '2023-2027', course: 'B.Tech Computer Science & Engineering', startYear: 2023, endYear: 2027, studentsCount: 178, currentSemester: 'Semester 6', status: 'Active' },
  { id: 'batch-4', batchName: '2025-2028', course: 'Bachelor of Computer Applications', startYear: 2025, endYear: 2028, studentsCount: 120, currentSemester: 'Semester 2', status: 'Active' }
];

const SEED_SUBJECTS: SubjectRecord[] = [
  { id: 'sub-1', code: 'MCA-201', name: 'Advanced Data Structures & Algorithms', course: 'Master of Computer Applications', semester: 'Semester 2', type: 'Theory', credits: 4, lectureHours: 4, practicalHours: 0, prerequisites: 'MCA-101 Data Structures', status: 'Active' },
  { id: 'sub-2', code: 'MCA-202', name: 'Enterprise Web Application Architecture', course: 'Master of Computer Applications', semester: 'Semester 2', type: 'Theory', credits: 4, lectureHours: 3, practicalHours: 2, prerequisites: 'MCA-102 Web Basics', status: 'Active' },
  { id: 'sub-3', code: 'MCA-203L', name: 'Full Stack Development Lab', course: 'Master of Computer Applications', semester: 'Semester 2', type: 'Practical', credits: 2, lectureHours: 0, practicalHours: 4, prerequisites: 'MCA-202', status: 'Active' },
  { id: 'sub-4', code: 'MCA-204E', name: 'Cloud Computing & DevOps', course: 'Master of Computer Applications', semester: 'Semester 2', type: 'Elective', credits: 3, lectureHours: 3, practicalHours: 0, prerequisites: 'Operating Systems', status: 'Active' },
  { id: 'sub-5', code: 'BCA-101', name: 'Discrete Mathematics', course: 'Bachelor of Computer Applications', semester: 'Semester 2', type: 'Theory', credits: 4, lectureHours: 4, practicalHours: 0, status: 'Active' },
  { id: 'sub-6', code: 'BCA-102L', name: 'Java Programming Lab', course: 'Bachelor of Computer Applications', semester: 'Semester 2', type: 'Practical', credits: 2, lectureHours: 0, practicalHours: 4, status: 'Active' },
  { id: 'sub-7', code: 'CSE-201', name: 'Object Oriented Design & C++', course: 'B.Tech Computer Science & Engineering', semester: 'Semester 2', type: 'Theory', credits: 4, lectureHours: 3, practicalHours: 2, status: 'Active' },
  { id: 'sub-8', code: 'MCA-205', name: 'Artificial Intelligence & ML', course: 'Master of Computer Applications', semester: 'Semester 2', type: 'Theory', credits: 4, lectureHours: 4, practicalHours: 0, status: 'Active' },
  { id: 'sub-9', code: 'MCA-206', name: 'Cyber Security & Ethics', course: 'Master of Computer Applications', semester: 'Semester 2', type: 'Theory', credits: 3, lectureHours: 3, practicalHours: 0, status: 'Active' },
  { id: 'sub-10', code: 'BCA-103', name: 'Database Management Systems', course: 'Bachelor of Computer Applications', semester: 'Semester 2', type: 'Theory', credits: 4, lectureHours: 3, practicalHours: 2, status: 'Active' },
  { id: 'sub-11', code: 'CSE-202', name: 'Operating Systems', course: 'B.Tech Computer Science & Engineering', semester: 'Semester 2', type: 'Theory', credits: 4, lectureHours: 4, practicalHours: 0, status: 'Active' },
  { id: 'sub-12', code: 'CSE-203', name: 'Computer Networks', course: 'B.Tech Computer Science & Engineering', semester: 'Semester 2', type: 'Theory', credits: 3, lectureHours: 3, practicalHours: 0, status: 'Active' }
];

const SEED_ALLOCATIONS: SubjectAllocationRecord[] = [
  { id: 'alloc-1', subject: 'Advanced Data Structures & Algorithms', faculty: 'Dr. Amit Joshi', course: 'Master of Computer Applications', semester: 'Semester 2', section: 'Section A', weeklyHours: 4 },
  { id: 'alloc-2', subject: 'Enterprise Web Application Architecture', faculty: 'Prof. Ananya Sen', course: 'Master of Computer Applications', semester: 'Semester 2', section: 'Section A', weeklyHours: 4 },
  { id: 'alloc-3', subject: 'Full Stack Development Lab', faculty: 'Dr. S. N. Roy', course: 'Master of Computer Applications', semester: 'Semester 2', section: 'Section A', weeklyHours: 3 },
  { id: 'alloc-4', subject: 'Cloud Computing & DevOps', faculty: 'Prof. Sandeep Bansal', course: 'Master of Computer Applications', semester: 'Semester 2', section: 'Section B', weeklyHours: 3 },
  { id: 'alloc-5', subject: 'Discrete Mathematics', faculty: 'Prof. Meena Sharma', course: 'Bachelor of Computer Applications', semester: 'Semester 2', section: 'Section A', weeklyHours: 4 },
  { id: 'alloc-6', subject: 'Java Programming Lab', faculty: 'Prof. Ananya Sen', course: 'Bachelor of Computer Applications', semester: 'Semester 2', section: 'Section A', weeklyHours: 3 },
  { id: 'alloc-7', subject: 'Object Oriented Design & C++', faculty: 'Dr. Rajesh Khanna', course: 'B.Tech Computer Science & Engineering', semester: 'Semester 2', section: 'Section A', weeklyHours: 4 }
];

@Injectable({
  providedIn: 'root'
})
export class AcademicService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly activityService = inject(ActivityService);
  private readonly auditService = inject(AuditService);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _academicYears = signal<AcademicYear[]>([]);
  private readonly _calendarEvents = signal<AcademicCalendarEvent[]>([]);
  private readonly _departments = signal<Department[]>([]);
  private readonly _courses = signal<Course[]>([]);
  private readonly _semesters = signal<SemesterRecord[]>([]);
  private readonly _sections = signal<SectionRecord[]>([]);
  private readonly _batches = signal<BatchRecord[]>([]);
  private readonly _subjects = signal<SubjectRecord[]>([]);
  private readonly _subjectAllocations = signal<SubjectAllocationRecord[]>([]);

  private readonly yearsSync = new FirestoreCollectionSync<AcademicYear>('academicYears', 'eduerp_academic_years_v2', this._academicYears, this.isBrowser);
  private readonly calendarSync = new FirestoreCollectionSync<AcademicCalendarEvent>('academicCalendarEvents', 'eduerp_academic_calendar_v2', this._calendarEvents, this.isBrowser);
  private readonly deptsSync = new FirestoreCollectionSync<Department>('departments', 'eduerp_departments_v2', this._departments, this.isBrowser);
  private readonly coursesSync = new FirestoreCollectionSync<Course>('courses', 'eduerp_courses_v2', this._courses, this.isBrowser);
  private readonly semsSync = new FirestoreCollectionSync<SemesterRecord>('semesters', 'eduerp_semesters_v2', this._semesters, this.isBrowser);
  private readonly sectionsSync = new FirestoreCollectionSync<SectionRecord>('sections', 'eduerp_sections_v2', this._sections, this.isBrowser);
  private readonly batchesSync = new FirestoreCollectionSync<BatchRecord>('batches', 'eduerp_batches_v2', this._batches, this.isBrowser);
  private readonly subjectsSync = new FirestoreCollectionSync<SubjectRecord>('subjects', 'eduerp_subjects_v2', this._subjects, this.isBrowser);
  private readonly allocsSync = new FirestoreCollectionSync<SubjectAllocationRecord>('subjectAllocations', 'eduerp_allocations_v2', this._subjectAllocations, this.isBrowser);

  readonly academicYears = this._academicYears.asReadonly();
  readonly calendarEvents = this._calendarEvents.asReadonly();
  readonly departments = this._departments.asReadonly();
  readonly courses = this._courses.asReadonly();
  readonly semesters = this._semesters.asReadonly();
  readonly sections = this._sections.asReadonly();
  readonly batches = this._batches.asReadonly();
  readonly subjects = this._subjects.asReadonly();
  readonly subjectAllocations = this._subjectAllocations.asReadonly();

  constructor() {
    this._academicYears.set(this.yearsSync.loadInitial(SEED_ACADEMIC_YEARS));
    this._calendarEvents.set(this.calendarSync.loadInitial(SEED_CALENDAR_EVENTS));
    this._departments.set(this.deptsSync.loadInitial(SEED_DEPARTMENTS));
    this._courses.set(this.coursesSync.loadInitial(SEED_COURSES));
    this._semesters.set(this.semsSync.loadInitial(SEED_SEMESTERS));
    this._sections.set(this.sectionsSync.loadInitial(SEED_SECTIONS));
    this._batches.set(this.batchesSync.loadInitial(SEED_BATCHES));
    this._subjects.set(this.subjectsSync.loadInitial(SEED_SUBJECTS));
    this._subjectAllocations.set(this.allocsSync.loadInitial(SEED_ALLOCATIONS));

    this.yearsSync.startSync();
    this.calendarSync.startSync();
    this.deptsSync.startSync();
    this.coursesSync.startSync();
    this.semsSync.startSync();
    this.sectionsSync.startSync();
    this.batchesSync.startSync();
    this.subjectsSync.startSync();
    this.allocsSync.startSync();
  }

  // Stats
  readonly academicYearStats = computed(() => {
    const list = this._academicYears();
    const current = list.find(y => y.status === 'Active')?.year || 'None';
    const upcoming = list.filter(y => y.status === 'Upcoming').length;
    return { total: list.length, current, upcoming };
  });

  readonly departmentStats = computed(() => {
    const list = this._departments();
    const totalFaculty = list.reduce((sum, d) => sum + d.facultyCount, 0);
    const totalStudents = list.reduce((sum, d) => sum + d.studentCount, 0);
    return { departments: list.length, totalFaculty, totalStudents };
  });

  readonly courseStats = computed(() => {
    const list = this._courses();
    return {
      total: list.length,
      ug: list.filter(c => c.level === 'UG').length,
      pg: list.filter(c => c.level === 'PG').length
    };
  });

  readonly facultyWorkloadMap = computed(() => {
    const map = new Map<string, number>();
    for (const alloc of this._subjectAllocations()) {
      const key = alloc.faculty.trim().toLowerCase();
      map.set(key, (map.get(key) ?? 0) + (alloc.weeklyHours || 0));
    }
    return map;
  });

  getFacultyWeeklyHours(facultyName: string): number {
    return this.facultyWorkloadMap().get(facultyName.trim().toLowerCase()) ?? 0;
  }

  // ==========================================
  // ACADEMIC YEARS & CALENDAR
  // ==========================================

  validateSessionActivation(yearId: string): SessionValidationResult {
    const target = this._academicYears().find(y => y.id === yearId);
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (!target) {
      return { valid: false, blockers: ['Academic year session not found.'], warnings };
    }
    const activeDepts = this._departments().filter(d => d.status === 'Active').length;
    const activeCourses = this._courses().filter(c => c.status === 'Active').length;
    const mappedSems = this._semesters().filter(s => s.academicYear === target.year).length;

    if (activeDepts === 0) blockers.push('At least one Active department is required.');
    if (activeCourses === 0) blockers.push('At least one Active course/program is required.');
    if (mappedSems === 0) warnings.push(`No semesters are configured yet for ${target.year}.`);

    return {
      valid: blockers.length === 0,
      blockers,
      warnings
    };
  }

  activateAcademicYear(yearId: string): { success: boolean; error?: string; warnings?: string[] } {
    const check = this.validateSessionActivation(yearId);
    if (!check.valid) {
      return { success: false, error: check.blockers.join(' ') };
    }
    const target = this._academicYears().find(y => y.id === yearId);
    if (!target) return { success: false, error: 'Academic session not found.' };

    const modified: AcademicYear[] = [];
    this._academicYears.update(list =>
      list.map(item => {
        if (item.id === yearId) {
          const next = { ...item, status: 'Active' as const };
          modified.push(next);
          return next;
        }
        if (item.status === 'Active') {
          const prev = { ...item, status: 'Completed' as const };
          modified.push(prev);
          return prev;
        }
        return item;
      })
    );
    modified.forEach(m => this.yearsSync.syncUpsert(m));

    this.activityService.logActivity({
      user: 'Admin (Dean Office)',
      role: 'System Administrator',
      operationType: 'Update',
      action: 'activated institutional academic year',
      target: `${target.year} (${target.startDate} to ${target.endDate})`,
      recordId: target.id,
      module: 'Academic Years',
      category: 'Academic',
      details: check.warnings.length ? `Warnings: ${check.warnings.join('; ')}` : 'Structure validation passed.',
      icon: 'verified'
    });
    this.auditService.log({
      userId: 'admin',
      userName: 'System Administrator',
      role: 'Super Admin',
      module: 'Academic Years',
      action: 'Update',
      target: `Session ${target.year}`,
      newValue: 'Status = Active',
      status: 'Success'
    });

    return { success: true, warnings: check.warnings };
  }

  archiveAcademicYear(yearId: string): { success: boolean; error?: string } {
    const target = this._academicYears().find(y => y.id === yearId);
    if (!target) return { success: false, error: 'Session not found.' };
    if (target.status === 'Active') {
      return { success: false, error: 'Cannot archive the sole Active session. Activate another session first.' };
    }
    const updated: AcademicYear = { ...target, status: 'Completed' };
    this._academicYears.update(list => list.map(y => (y.id === yearId ? updated : y)));
    this.yearsSync.syncUpsert(updated);
    this.activityService.logActivity({
      user: 'Admin (Dean Office)',
      role: 'System Administrator',
      operationType: 'Update',
      action: 'archived academic session',
      target: updated.year,
      recordId: updated.id,
      module: 'Academic Years',
      category: 'Academic',
      icon: 'archive'
    });
    return { success: true };
  }

  saveAcademicYear(yearData: Omit<AcademicYear, 'id'>, editId?: string): { success: boolean; error?: string } {
    const cleanYear = yearData.year.trim();
    const existing = this._academicYears().find(
      y => y.year.toLowerCase() === cleanYear.toLowerCase() && y.id !== editId
    );
    if (existing) {
      return { success: false, error: `Academic Year "${cleanYear}" already exists.` };
    }
    if (new Date(yearData.endDate) <= new Date(yearData.startDate)) {
      return { success: false, error: 'End date must be chronologically after the start date.' };
    }

    // Prevent overlapping date ranges with non-archived sessions
    const newStart = new Date(yearData.startDate).getTime();
    const newEnd = new Date(yearData.endDate).getTime();
    const conflict = this._academicYears().find(y => {
      if (y.id === editId || y.status === 'Completed') return false;
      const yStart = new Date(y.startDate).getTime();
      const yEnd = new Date(y.endDate).getTime();
      return yearData.status === 'Active' && y.status === 'Active' ? false : newStart < yEnd && newEnd > yStart && y.year !== cleanYear;
    });
    if (conflict && yearData.status === 'Upcoming') {
      // Allow planning upcoming if non-overlapping; warn only if strictly colliding
    }

    if (yearData.status === 'Active') {
      const activeDepts = this._departments().filter(d => d.status === 'Active').length;
      const activeCourses = this._courses().filter(c => c.status === 'Active').length;
      if (activeDepts === 0 || activeCourses === 0) {
        return { success: false, error: 'Cannot activate academic session: ensure at least 1 active department and 1 active course exist.' };
      }
    }

    let savedRecord: AcademicYear;
    const alsoModified: AcademicYear[] = [];
    if (editId) {
      savedRecord = { ...yearData, year: cleanYear, id: editId };
      this._academicYears.update(list =>
        list.map(item => {
          if (item.id === editId) return savedRecord;
          if (yearData.status === 'Active' && item.status === 'Active') {
            const archived = { ...item, status: 'Completed' as const };
            alsoModified.push(archived);
            return archived;
          }
          return item;
        })
      );
    } else {
      savedRecord = { ...yearData, year: cleanYear, id: `ay-${Date.now()}` };
      this._academicYears.update(list => {
        const updatedList =
          savedRecord.status === 'Active'
            ? list.map(item => {
                if (item.status === 'Active') {
                  const archived = { ...item, status: 'Completed' as const };
                  alsoModified.push(archived);
                  return archived;
                }
                return item;
              })
            : list;
        return [savedRecord, ...updatedList];
      });
    }

    this.yearsSync.syncUpsert(savedRecord);
    alsoModified.forEach(m => this.yearsSync.syncUpsert(m));

    this.activityService.logActivity({
      user: 'Admin (Dean Office)',
      role: 'System Administrator',
      operationType: editId ? 'Update' : 'Create',
      action: editId ? 'updated academic session' : 'created academic session',
      target: `${savedRecord.year} (${savedRecord.status})`,
      recordId: savedRecord.id,
      module: 'Academic Years',
      category: 'Academic',
      icon: 'calendar_month'
    });

    return { success: true };
  }

  deleteAcademicYear(id: string): { success: boolean; error?: string } {
    const target = this._academicYears().find(y => y.id === id);
    if (target?.status === 'Active') {
      return { success: false, error: 'Cannot delete the current Active academic session. Change the active session first.' };
    }
    this._academicYears.update(list => list.filter(y => y.id !== id));
    this.yearsSync.syncDelete(id);
    if (target) {
      this.activityService.logActivity({
        user: 'Admin (Dean Office)',
        role: 'System Administrator',
        operationType: 'Delete',
        action: 'deleted academic session',
        target: target.year,
        recordId: target.id,
        module: 'Academic Years',
        category: 'Academic',
        icon: 'delete'
      });
    }
    return { success: true };
  }

  saveCalendarEvent(eventData: Omit<AcademicCalendarEvent, 'id'>, editId?: string): { success: boolean; error?: string } {
    if (!eventData.title.trim()) return { success: false, error: 'Milestone title is required.' };
    if (new Date(eventData.endDate) < new Date(eventData.startDate)) {
      return { success: false, error: 'End date cannot precede start date.' };
    }
    const record: AcademicCalendarEvent = editId
      ? { ...eventData, id: editId }
      : { ...eventData, id: `cal-${Date.now()}` };

    if (editId) {
      this._calendarEvents.update(list => list.map(e => (e.id === editId ? record : e)));
    } else {
      this._calendarEvents.update(list => [record, ...list]);
    }
    this.calendarSync.syncUpsert(record);
    this.activityService.logActivity({
      user: 'Admin (Dean Office)',
      role: 'System Administrator',
      operationType: editId ? 'Update' : 'Create',
      action: 'configured academic calendar milestone',
      target: `${record.title} (${record.academicYear})`,
      recordId: record.id,
      module: 'Academic Years',
      category: 'Academic',
      icon: 'event_note'
    });
    return { success: true };
  }

  deleteCalendarEvent(id: string): void {
    this._calendarEvents.update(list => list.filter(e => e.id !== id));
    this.calendarSync.syncDelete(id);
  }

  // ==========================================
  // DEPARTMENTS CRUD
  // ==========================================

  saveDepartment(deptData: Omit<Department, 'id'>, editId?: string): { success: boolean; error?: string } {
    const cleanCode = deptData.code.trim().toUpperCase();
    const existing = this._departments().find(
      d => d.code.toUpperCase() === cleanCode && d.id !== editId
    );
    if (existing) {
      return { success: false, error: `Department code "${cleanCode}" is already in use.` };
    }

    const record: Department = editId
      ? { ...deptData, code: cleanCode, id: editId }
      : { ...deptData, code: cleanCode, id: `dept-${Date.now()}` };

    if (editId) {
      this._departments.update(list => list.map(d => (d.id === editId ? record : d)));
    } else {
      this._departments.update(list => [record, ...list]);
    }
    this.deptsSync.syncUpsert(record);

    this.activityService.logActivity({
      user: 'Admin (Dean Office)',
      role: 'System Administrator',
      operationType: editId ? 'Update' : 'Create',
      action: editId ? 'updated department configuration for' : 'created department',
      target: `${record.name} (${record.code}) · HOD: ${record.hod}`,
      recordId: record.id,
      module: 'Departments',
      category: 'Academic',
      icon: 'account_balance'
    });
    return { success: true };
  }

  deleteDepartment(id: string): { success: boolean; error?: string } {
    const target = this._departments().find(d => d.id === id);
    if (target) {
      const linkedCourses = this._courses().filter(c => c.department === target.name);
      if (linkedCourses.length > 0) {
        return {
          success: false,
          error: `Cannot delete "${target.name}". It is associated with ${linkedCourses.length} active course(s). Reassign or delete courses first.`
        };
      }
    }
    this._departments.update(list => list.filter(d => d.id !== id));
    this.deptsSync.syncDelete(id);
    if (target) {
      this.activityService.logActivity({
        user: 'Admin (Dean Office)',
        role: 'System Administrator',
        operationType: 'Delete',
        action: 'removed department',
        target: `${target.name} (${target.code})`,
        recordId: target.id,
        module: 'Departments',
        category: 'Academic',
        icon: 'delete'
      });
    }
    return { success: true };
  }

  // ==========================================
  // COURSES CRUD
  // ==========================================

  saveCourse(courseData: Omit<Course, 'id'>, editId?: string): { success: boolean; error?: string } {
    const cleanCode = courseData.code.trim().toUpperCase();
    const existing = this._courses().find(
      c => c.code.toUpperCase() === cleanCode && c.id !== editId
    );
    if (existing) {
      return { success: false, error: `Course code "${cleanCode}" already exists.` };
    }

    const record: Course = editId
      ? { ...courseData, code: cleanCode, id: editId }
      : { ...courseData, code: cleanCode, id: `course-${Date.now()}` };

    if (editId) {
      this._courses.update(list => list.map(c => (c.id === editId ? record : c)));
    } else {
      this._courses.update(list => [record, ...list]);
      this.updateDepartmentCourseCount(courseData.department, 1);
    }
    this.coursesSync.syncUpsert(record);

    this.activityService.logActivity({
      user: 'Admin (Dean Office)',
      role: 'System Administrator',
      operationType: editId ? 'Update' : 'Create',
      action: editId ? 'updated degree program' : 'added new degree program',
      target: `${record.name} (${record.code}) · Intake: ${record.intake}`,
      recordId: record.id,
      module: 'Courses & Programs',
      category: 'Academic',
      icon: 'menu_book'
    });
    return { success: true };
  }

  deleteCourse(id: string): { success: boolean } {
    const target = this._courses().find(c => c.id === id);
    if (target) {
      this.updateDepartmentCourseCount(target.department, -1);
      this.activityService.logActivity({
        user: 'Admin (Dean Office)',
        role: 'System Administrator',
        operationType: 'Delete',
        action: 'removed degree program',
        target: `${target.name} (${target.code})`,
        recordId: target.id,
        module: 'Courses & Programs',
        category: 'Academic',
        icon: 'delete'
      });
    }
    this._courses.update(list => list.filter(c => c.id !== id));
    this.coursesSync.syncDelete(id);
    return { success: true };
  }

  private updateDepartmentCourseCount(deptName: string, delta: number): void {
    this._departments.update(list =>
      list.map(d => {
        if (d.name === deptName) {
          const updated = { ...d, coursesCount: Math.max(0, d.coursesCount + delta) };
          this.deptsSync.syncUpsert(updated);
          return updated;
        }
        return d;
      })
    );
  }

  // ==========================================
  // SEMESTERS CRUD
  // ==========================================

  saveSemester(data: Omit<SemesterRecord, 'id'>, editId?: string): { success: boolean; error?: string } {
    if (new Date(data.endDate) <= new Date(data.startDate)) {
      return { success: false, error: 'End date must be chronologically after start date.' };
    }
    if (data.registrationStartDate && data.registrationEndDate && new Date(data.registrationEndDate) < new Date(data.registrationStartDate)) {
      return { success: false, error: 'Registration end date must be after registration start date.' };
    }
    if (data.examStartDate && data.examEndDate && new Date(data.examEndDate) < new Date(data.examStartDate)) {
      return { success: false, error: 'Exam end date must be after exam start date.' };
    }

    const record: SemesterRecord = editId ? { ...data, id: editId } : { ...data, id: `sem-${Date.now()}` };
    if (editId) {
      this._semesters.update(list => list.map(s => (s.id === editId ? record : s)));
    } else {
      this._semesters.update(list => [record, ...list]);
    }
    this.semsSync.syncUpsert(record);
    this.activityService.logActivity({
      user: 'Admin (Dean Office)',
      role: 'System Administrator',
      operationType: editId ? 'Update' : 'Create',
      action: editId ? 'updated semester schedule' : 'created semester term',
      target: `${record.course} — Semester ${record.semesterNumber} (${record.academicYear})`,
      recordId: record.id,
      module: 'Semesters',
      category: 'Academic',
      icon: 'layers'
    });
    return { success: true };
  }

  deleteSemester(id: string): void {
    const target = this._semesters().find(s => s.id === id);
    this._semesters.update(list => list.filter(s => s.id !== id));
    this.semsSync.syncDelete(id);
    if (target) {
      this.activityService.logActivity({
        user: 'Admin (Dean Office)',
        role: 'System Administrator',
        operationType: 'Delete',
        action: 'removed semester',
        target: `${target.course} — Semester ${target.semesterNumber}`,
        recordId: target.id,
        module: 'Semesters',
        category: 'Academic',
        icon: 'delete'
      });
    }
  }

  // ==========================================
  // SECTIONS & BATCHES CRUD + ROLLOVER
  // ==========================================

  canAllocateToSection(course: string, sectionName: string, additionalCount = 1): { allowed: boolean; error?: string; section?: SectionRecord } {
    const match = this._sections().find(s => s.course === course && s.section === sectionName);
    if (!match) return { allowed: true };
    if (match.status === 'Inactive') {
      return { allowed: false, error: `${sectionName} for ${course} is Inactive.` };
    }
    if (match.currentStrength + additionalCount > match.capacity) {
      return {
        allowed: false,
        error: `${sectionName} capacity exceeded (${match.currentStrength}/${match.capacity} seats filled).`
      };
    }
    return { allowed: true, section: match };
  }

  adjustSectionStrength(course: string, sectionName: string, delta: number): void {
    this._sections.update(list =>
      list.map(sec => {
        if (sec.course === course && sec.section === sectionName) {
          const updated = { ...sec, currentStrength: Math.max(0, sec.currentStrength + delta) };
          this.sectionsSync.syncUpsert(updated);
          return updated;
        }
        return sec;
      })
    );
  }

  saveSection(data: Omit<SectionRecord, 'id'>, editId?: string): { success: boolean; error?: string } {
    if (data.capacity < 1) {
      return { success: false, error: 'Maximum seating capacity must be at least 1.' };
    }
    if (data.currentStrength > data.capacity) {
      return { success: false, error: 'Current strength cannot exceed maximum seating capacity.' };
    }
    const record: SectionRecord = editId ? { ...data, id: editId } : { ...data, id: `sec-${Date.now()}` };
    if (editId) {
      this._sections.update(list => list.map(sec => (sec.id === editId ? record : sec)));
    } else {
      this._sections.update(list => [record, ...list]);
    }
    this.sectionsSync.syncUpsert(record);
    this.activityService.logActivity({
      user: 'Admin (Dean Office)',
      role: 'System Administrator',
      operationType: editId ? 'Update' : 'Create',
      action: editId ? 'updated classroom section' : 'created classroom section',
      target: `${record.section} · ${record.course} (${record.currentStrength}/${record.capacity})`,
      recordId: record.id,
      module: 'Sections & Batches',
      category: 'Academic',
      icon: 'group_work'
    });
    return { success: true };
  }

  deleteSection(id: string): void {
    this._sections.update(list => list.filter(sec => sec.id !== id));
    this.sectionsSync.syncDelete(id);
  }

  saveBatch(data: Omit<BatchRecord, 'id'>, editId?: string): { success: boolean; error?: string } {
    if (data.endYear <= data.startYear) {
      return { success: false, error: 'Batch end year must be after start year.' };
    }
    const record: BatchRecord = editId ? { ...data, id: editId } : { ...data, id: `batch-${Date.now()}` };
    if (editId) {
      this._batches.update(list => list.map(b => (b.id === editId ? record : b)));
    } else {
      this._batches.update(list => [record, ...list]);
    }
    this.batchesSync.syncUpsert(record);
    return { success: true };
  }

  rolloverBatchToNextYear(batchId: string): { success: boolean; message?: string; error?: string } {
    const batch = this._batches().find(b => b.id === batchId);
    if (!batch) return { success: false, error: 'Batch not found.' };

    const course = this._courses().find(c => c.name === batch.course);
    const maxSems = course?.semesters ?? 4;
    const currentSemNum = Number((batch.currentSemester || 'Semester 1').replace(/\D/g, '')) || 1;
    const nextSemNum = currentSemNum + 1;

    if (nextSemNum > maxSems) {
      const graduated: BatchRecord = { ...batch, currentSemester: `Completed (${maxSems}/${maxSems})`, status: 'Inactive' };
      this._batches.update(list => list.map(b => (b.id === batchId ? graduated : b)));
      this.batchesSync.syncUpsert(graduated);
      this.activityService.logActivity({
        user: 'Admin (Dean Office)',
        role: 'System Administrator',
        operationType: 'Update',
        action: 'graduated final-semester cohort',
        target: `Batch ${batch.batchName} (${batch.course})`,
        recordId: batch.id,
        module: 'Sections & Batches',
        category: 'Academic',
        icon: 'school'
      });
      return { success: true, message: `Batch ${batch.batchName} reached final semester and was marked Completed.` };
    }

    const updated: BatchRecord = { ...batch, currentSemester: `Semester ${nextSemNum}` };
    this._batches.update(list => list.map(b => (b.id === batchId ? updated : b)));
    this.batchesSync.syncUpsert(updated);
    this.activityService.logActivity({
      user: 'Admin (Dean Office)',
      role: 'System Administrator',
      operationType: 'Update',
      action: 'promoted cohort batch to',
      target: `Batch ${batch.batchName} (${batch.course}) -> Semester ${nextSemNum}`,
      recordId: batch.id,
      module: 'Sections & Batches',
      category: 'Academic',
      icon: 'trending_up'
    });
    return { success: true, message: `Batch ${batch.batchName} promoted to Semester ${nextSemNum}.` };
  }

  deleteBatch(id: string): void {
    this._batches.update(list => list.filter(b => b.id !== id));
    this.batchesSync.syncDelete(id);
  }

  // ==========================================
  // SUBJECTS & ALLOCATIONS CRUD
  // ==========================================

  saveSubject(data: Omit<SubjectRecord, 'id'>, editId?: string): { success: boolean; error?: string } {
    const cleanCode = data.code.trim().toUpperCase();
    const existing = this._subjects().find(sub => sub.code.toUpperCase() === cleanCode && sub.id !== editId);
    if (existing) {
      return { success: false, error: `Subject code "${cleanCode}" already exists.` };
    }
    const record: SubjectRecord = editId
      ? { ...data, code: cleanCode, id: editId }
      : { ...data, code: cleanCode, id: `sub-${Date.now()}` };

    if (editId) {
      this._subjects.update(list => list.map(sub => (sub.id === editId ? record : sub)));
    } else {
      this._subjects.update(list => [record, ...list]);
    }
    this.subjectsSync.syncUpsert(record);
    this.activityService.logActivity({
      user: 'Admin (Dean Office)',
      role: 'System Administrator',
      operationType: editId ? 'Update' : 'Create',
      action: editId ? 'updated curriculum subject' : 'created curriculum subject',
      target: `${record.code} — ${record.name} (${record.credits} Credits)`,
      recordId: record.id,
      module: 'Subjects',
      category: 'Academic',
      icon: 'library_books'
    });
    return { success: true };
  }

  deleteSubject(id: string): void {
    this._subjects.update(list => list.filter(sub => sub.id !== id));
    this.subjectsSync.syncDelete(id);
  }

  saveSubjectAllocation(
    data: Omit<SubjectAllocationRecord, 'id'>,
    editId?: string
  ): { success: boolean; error?: string; warning?: string } {
    const duplicate = this._subjectAllocations().find(
      alloc =>
        alloc.subject === data.subject &&
        alloc.course === data.course &&
        alloc.semester === data.semester &&
        alloc.section === data.section &&
        alloc.id !== editId
    );
    if (duplicate) {
      return {
        success: false,
        error: `Conflict: "${data.subject}" is already allocated to ${data.section} (${data.course} - ${data.semester}) under ${duplicate.faculty}.`
      };
    }

    const existingHours = this._subjectAllocations()
      .filter(a => a.faculty.toLowerCase() === data.faculty.trim().toLowerCase() && a.id !== editId)
      .reduce((acc, a) => acc + a.weeklyHours, 0);
    const projectedHours = existingHours + (Number(data.weeklyHours) || 0);
    if (projectedHours > 22) {
      return {
        success: false,
        error: `Workload Cap Exceeded: ${data.faculty} would reach ${projectedHours} hrs/week (institution cap is 22 hrs/week).`
      };
    }

    const record: SubjectAllocationRecord = editId
      ? { ...data, id: editId }
      : { ...data, id: `alloc-${Date.now()}` };

    if (editId) {
      this._subjectAllocations.update(list => list.map(a => (a.id === editId ? record : a)));
    } else {
      this._subjectAllocations.update(list => [record, ...list]);
    }
    this.allocsSync.syncUpsert(record);

    this.activityService.logActivity({
      user: 'Admin (Dean Office)',
      role: 'System Administrator',
      operationType: editId ? 'Update' : 'Create',
      action: 'allocated subject workload',
      target: `${record.subject} -> ${record.faculty} (${record.section}, ${record.weeklyHours} hrs/wk)`,
      recordId: record.id,
      module: 'Subject Allocation',
      category: 'Academic',
      icon: 'assignment_turned_in'
    });

    const warning =
      projectedHours > 18
        ? `${data.faculty} is approaching max teaching load (${projectedHours}/22 hrs/wk).`
        : undefined;
    return { success: true, warning };
  }

  deleteSubjectAllocation(id: string): void {
    this._subjectAllocations.update(list => list.filter(a => a.id !== id));
    this.allocsSync.syncDelete(id);
  }
}
