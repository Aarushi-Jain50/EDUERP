import { Injectable, signal, computed } from '@angular/core';

export interface AcademicYear {
  id: string;
  year: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Upcoming' | 'Completed';
  notes?: string;
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
  status: 'Active' | 'Inactive';
}

@Injectable({
  providedIn: 'root'
})
export class AcademicService {
  // 1. Academic Years State
  private readonly _academicYears = signal<AcademicYear[]>([
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
  ]);

  // 2. Departments State
  private readonly _departments = signal<Department[]>([
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
  ]);

  // 3. Courses State
  private readonly _courses = signal<Course[]>([
    {
      id: 'course-mca',
      name: 'Master of Computer Applications',
      code: 'MCA-400',
      department: 'Computer Applications',
      level: 'PG',
      duration: '2 Years',
      semesters: 4,
      intake: 60,
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
      status: 'Active'
    }
  ]);

  // Readonly signals exposed to components
  readonly academicYears = this._academicYears.asReadonly();
  readonly departments = this._departments.asReadonly();
  readonly courses = this._courses.asReadonly();

  // Academic Year Stats
  readonly academicYearStats = computed(() => {
    const list = this._academicYears();
    const current = list.find(y => y.status === 'Active')?.year || 'None';
    const upcoming = list.filter(y => y.status === 'Upcoming').length;
    return {
      total: list.length,
      current,
      upcoming
    };
  });

  // Department Stats
  readonly departmentStats = computed(() => {
    const list = this._departments();
    const totalFaculty = list.reduce((sum, d) => sum + d.facultyCount, 0);
    const totalStudents = list.reduce((sum, d) => sum + d.studentCount, 0);
    return {
      departments: list.length,
      totalFaculty,
      totalStudents
    };
  });

  // Course Stats
  readonly courseStats = computed(() => {
    const list = this._courses();
    const ugCount = list.filter(c => c.level === 'UG').length;
    const pgCount = list.filter(c => c.level === 'PG').length;
    return {
      total: list.length,
      ug: ugCount,
      pg: pgCount
    };
  });

  // ==========================================
  // ACADEMIC YEARS CRUD
  // ==========================================

  saveAcademicYear(yearData: Omit<AcademicYear, 'id'>, editId?: string): { success: boolean; error?: string } {
    const cleanYear = yearData.year.trim();

    // Check unique year
    const existing = this._academicYears().find(
      y => y.year.toLowerCase() === cleanYear.toLowerCase() && y.id !== editId
    );
    if (existing) {
      return { success: false, error: `Academic Year "${cleanYear}" already exists.` };
    }

    // Check date validity: end > start
    if (new Date(yearData.endDate) <= new Date(yearData.startDate)) {
      return { success: false, error: 'End date must be chronologically after the start date.' };
    }

    if (editId) {
      // If setting to Active, ensure all other years are no longer Active
      this._academicYears.update(list =>
        list.map(item => {
          if (item.id === editId) {
            return { ...yearData, id: editId };
          }
          if (yearData.status === 'Active' && item.status === 'Active') {
            return { ...item, status: 'Completed' };
          }
          return item;
        })
      );
    } else {
      const newId = `ay-${Date.now()}`;
      const newYear: AcademicYear = { ...yearData, id: newId };

      this._academicYears.update(list => {
        let updatedList = list;
        if (newYear.status === 'Active') {
          updatedList = list.map(item =>
            item.status === 'Active' ? { ...item, status: 'Completed' as const } : item
          );
        }
        return [newYear, ...updatedList];
      });
    }

    return { success: true };
  }

  deleteAcademicYear(id: string): { success: boolean; error?: string } {
    const target = this._academicYears().find(y => y.id === id);
    if (target?.status === 'Active') {
      return { success: false, error: 'Cannot delete the current Active academic session. Change the active session first.' };
    }
    this._academicYears.update(list => list.filter(y => y.id !== id));
    return { success: true };
  }

  // ==========================================
  // DEPARTMENTS CRUD
  // ==========================================

  saveDepartment(deptData: Omit<Department, 'id'>, editId?: string): { success: boolean; error?: string } {
    const cleanCode = deptData.code.trim().toUpperCase();

    // Unique code check
    const existing = this._departments().find(
      d => d.code.toUpperCase() === cleanCode && d.id !== editId
    );
    if (existing) {
      return { success: false, error: `Department code "${cleanCode}" is already in use.` };
    }

    if (editId) {
      this._departments.update(list =>
        list.map(d => (d.id === editId ? { ...deptData, code: cleanCode, id: editId } : d))
      );
    } else {
      const newDept: Department = {
        ...deptData,
        code: cleanCode,
        id: `dept-${Date.now()}`
      };
      this._departments.update(list => [newDept, ...list]);
    }

    return { success: true };
  }

  deleteDepartment(id: string): { success: boolean; error?: string } {
    const target = this._departments().find(d => d.id === id);
    if (target && target.coursesCount > 0) {
      // Check if courses are tied
      const linkedCourses = this._courses().filter(c => c.department === target.name);
      if (linkedCourses.length > 0) {
        return {
          success: false,
          error: `Cannot delete "${target.name}". It is associated with ${linkedCourses.length} active course(s). Reassign or delete courses first.`
        };
      }
    }
    this._departments.update(list => list.filter(d => d.id !== id));
    return { success: true };
  }

  // ==========================================
  // COURSES CRUD
  // ==========================================

  saveCourse(courseData: Omit<Course, 'id'>, editId?: string): { success: boolean; error?: string } {
    const cleanCode = courseData.code.trim().toUpperCase();

    // Unique code check
    const existing = this._courses().find(
      c => c.code.toUpperCase() === cleanCode && c.id !== editId
    );
    if (existing) {
      return { success: false, error: `Course code "${cleanCode}" already exists.` };
    }

    if (editId) {
      this._courses.update(list =>
        list.map(c => (c.id === editId ? { ...courseData, code: cleanCode, id: editId } : c))
      );
    } else {
      const newCourse: Course = {
        ...courseData,
        code: cleanCode,
        id: `course-${Date.now()}`
      };
      this._courses.update(list => [newCourse, ...list]);
      // Update department course counter
      this.updateDepartmentCourseCount(courseData.department, 1);
    }

    return { success: true };
  }

  deleteCourse(id: string): { success: boolean } {
    const target = this._courses().find(c => c.id === id);
    if (target) {
      this.updateDepartmentCourseCount(target.department, -1);
    }
    this._courses.update(list => list.filter(c => c.id !== id));
    return { success: true };
  }

  private updateDepartmentCourseCount(deptName: string, delta: number): void {
    this._departments.update(list =>
      list.map(d => {
        if (d.name === deptName) {
          return { ...d, coursesCount: Math.max(0, d.coursesCount + delta) };
        }
        return d;
      })
    );
  }

  // ==========================================
  // 4. SEMESTERS STATE & CRUD
  // ==========================================
  private readonly _semesters = signal<SemesterRecord[]>([
    { id: 'sem-1', semesterNumber: 1, course: 'Master of Computer Applications', academicYear: '2025-26', startDate: '2025-07-01', endDate: '2025-12-15', status: 'Completed' },
    { id: 'sem-2', semesterNumber: 2, course: 'Master of Computer Applications', academicYear: '2025-26', startDate: '2026-01-05', endDate: '2026-06-15', status: 'Active' },
    { id: 'sem-3', semesterNumber: 3, course: 'Master of Computer Applications', academicYear: '2026-27', startDate: '2026-07-01', endDate: '2026-12-15', status: 'Upcoming' },
    { id: 'sem-4', semesterNumber: 4, course: 'Master of Computer Applications', academicYear: '2026-27', startDate: '2027-01-05', endDate: '2027-06-15', status: 'Upcoming' },
    { id: 'sem-5', semesterNumber: 1, course: 'Bachelor of Computer Applications', academicYear: '2025-26', startDate: '2025-07-01', endDate: '2025-12-15', status: 'Completed' },
    { id: 'sem-6', semesterNumber: 2, course: 'Bachelor of Computer Applications', academicYear: '2025-26', startDate: '2026-01-05', endDate: '2026-06-15', status: 'Active' },
    { id: 'sem-7', semesterNumber: 1, course: 'B.Tech Computer Science & Engineering', academicYear: '2025-26', startDate: '2025-07-01', endDate: '2025-12-15', status: 'Completed' },
    { id: 'sem-8', semesterNumber: 2, course: 'B.Tech Computer Science & Engineering', academicYear: '2025-26', startDate: '2026-01-05', endDate: '2026-06-15', status: 'Active' }
  ]);

  // ==========================================
  // 5. SECTIONS STATE & CRUD
  // ==========================================
  private readonly _sections = signal<SectionRecord[]>([
    { id: 'sec-1', section: 'Section A', course: 'Master of Computer Applications', semester: 'Semester 2', classTeacher: 'Dr. Amit Joshi', currentStrength: 58, capacity: 60, status: 'Active' },
    { id: 'sec-2', section: 'Section B', course: 'Master of Computer Applications', semester: 'Semester 2', classTeacher: 'Prof. Ananya Sen', currentStrength: 55, capacity: 60, status: 'Active' },
    { id: 'sec-3', section: 'Section A', course: 'Bachelor of Computer Applications', semester: 'Semester 2', classTeacher: 'Prof. Meena Sharma', currentStrength: 112, capacity: 120, status: 'Active' },
    { id: 'sec-4', section: 'Section A', course: 'B.Tech Computer Science & Engineering', semester: 'Semester 2', classTeacher: 'Dr. Rajesh Khanna', currentStrength: 170, capacity: 180, status: 'Active' }
  ]);

  // ==========================================
  // 6. BATCHES STATE & CRUD
  // ==========================================
  private readonly _batches = signal<BatchRecord[]>([
    { id: 'batch-1', batchName: '2024-2026', course: 'Master of Computer Applications', startYear: 2024, endYear: 2026, studentsCount: 115, status: 'Active' },
    { id: 'batch-2', batchName: '2025-2027', course: 'Master of Computer Applications', startYear: 2025, endYear: 2027, studentsCount: 120, status: 'Active' },
    { id: 'batch-3', batchName: '2023-2027', course: 'B.Tech Computer Science & Engineering', startYear: 2023, endYear: 2027, studentsCount: 178, status: 'Active' },
    { id: 'batch-4', batchName: '2025-2028', course: 'Bachelor of Computer Applications', startYear: 2025, endYear: 2028, studentsCount: 120, status: 'Active' }
  ]);

  // ==========================================
  // 7. SUBJECTS STATE & CRUD
  // ==========================================
  private readonly _subjects = signal<SubjectRecord[]>([
    { id: 'sub-1', code: 'MCA-201', name: 'Advanced Data Structures & Algorithms', course: 'Master of Computer Applications', semester: 'Semester 2', type: 'Theory', credits: 4, status: 'Active' },
    { id: 'sub-2', code: 'MCA-202', name: 'Enterprise Web Application Architecture', course: 'Master of Computer Applications', semester: 'Semester 2', type: 'Theory', credits: 4, status: 'Active' },
    { id: 'sub-3', code: 'MCA-203L', name: 'Full Stack Development Lab', course: 'Master of Computer Applications', semester: 'Semester 2', type: 'Practical', credits: 2, status: 'Active' },
    { id: 'sub-4', code: 'MCA-204E', name: 'Cloud Computing & DevOps', course: 'Master of Computer Applications', semester: 'Semester 2', type: 'Elective', credits: 3, status: 'Active' },
    { id: 'sub-5', code: 'BCA-101', name: 'Discrete Mathematics', course: 'Bachelor of Computer Applications', semester: 'Semester 2', type: 'Theory', credits: 4, status: 'Active' },
    { id: 'sub-6', code: 'BCA-102L', name: 'Java Programming Lab', course: 'Bachelor of Computer Applications', semester: 'Semester 2', type: 'Practical', credits: 2, status: 'Active' },
    { id: 'sub-7', code: 'CSE-201', name: 'Object Oriented Design & C++', course: 'B.Tech Computer Science & Engineering', semester: 'Semester 2', type: 'Theory', credits: 4, status: 'Active' },
    { id: 'sub-8', code: 'MCA-205', name: 'Artificial Intelligence & ML', course: 'Master of Computer Applications', semester: 'Semester 2', type: 'Theory', credits: 4, status: 'Active' },
    { id: 'sub-9', code: 'MCA-206', name: 'Cyber Security & Ethics', course: 'Master of Computer Applications', semester: 'Semester 2', type: 'Theory', credits: 3, status: 'Active' },
    { id: 'sub-10', code: 'BCA-103', name: 'Database Management Systems', course: 'Bachelor of Computer Applications', semester: 'Semester 2', type: 'Theory', credits: 4, status: 'Active' },
    { id: 'sub-11', code: 'CSE-202', name: 'Operating Systems', course: 'B.Tech Computer Science & Engineering', semester: 'Semester 2', type: 'Theory', credits: 4, status: 'Active' },
    { id: 'sub-12', code: 'CSE-203', name: 'Computer Networks', course: 'B.Tech Computer Science & Engineering', semester: 'Semester 2', type: 'Theory', credits: 3, status: 'Active' }
  ]);

  // ==========================================
  // 8. SUBJECT ALLOCATIONS STATE & CRUD
  // ==========================================
  private readonly _subjectAllocations = signal<SubjectAllocationRecord[]>([
    { id: 'alloc-1', subject: 'Advanced Data Structures & Algorithms', faculty: 'Dr. Amit Joshi', course: 'Master of Computer Applications', semester: 'Semester 2', section: 'Section A', weeklyHours: 4 },
    { id: 'alloc-2', subject: 'Enterprise Web Application Architecture', faculty: 'Prof. Ananya Sen', course: 'Master of Computer Applications', semester: 'Semester 2', section: 'Section A', weeklyHours: 4 },
    { id: 'alloc-3', subject: 'Full Stack Development Lab', faculty: 'Dr. S. N. Roy', course: 'Master of Computer Applications', semester: 'Semester 2', section: 'Section A', weeklyHours: 3 },
    { id: 'alloc-4', subject: 'Cloud Computing & DevOps', faculty: 'Prof. Sandeep Bansal', course: 'Master of Computer Applications', semester: 'Semester 2', section: 'Section B', weeklyHours: 3 },
    { id: 'alloc-5', subject: 'Discrete Mathematics', faculty: 'Prof. Meena Sharma', course: 'Bachelor of Computer Applications', semester: 'Semester 2', section: 'Section A', weeklyHours: 4 },
    { id: 'alloc-6', subject: 'Java Programming Lab', faculty: 'Prof. Ananya Sen', course: 'Bachelor of Computer Applications', semester: 'Semester 2', section: 'Section A', weeklyHours: 3 },
    { id: 'alloc-7', subject: 'Object Oriented Design & C++', faculty: 'Dr. Rajesh Khanna', course: 'B.Tech Computer Science & Engineering', semester: 'Semester 2', section: 'Section A', weeklyHours: 4 }
  ]);

  // Readonly exposures
  readonly semesters = this._semesters.asReadonly();
  readonly sections = this._sections.asReadonly();
  readonly batches = this._batches.asReadonly();
  readonly subjects = this._subjects.asReadonly();
  readonly subjectAllocations = this._subjectAllocations.asReadonly();

  // SEMESTER CRUD
  saveSemester(data: Omit<SemesterRecord, 'id'>, editId?: string): { success: boolean; error?: string } {
    if (new Date(data.endDate) <= new Date(data.startDate)) {
      return { success: false, error: 'End date must be chronologically after start date.' };
    }
    if (editId) {
      this._semesters.update(list => list.map(s => s.id === editId ? { ...data, id: editId } : s));
    } else {
      this._semesters.update(list => [{ ...data, id: `sem-${Date.now()}` }, ...list]);
    }
    return { success: true };
  }
  deleteSemester(id: string): void {
    this._semesters.update(list => list.filter(s => s.id !== id));
  }

  // SECTION CRUD
  saveSection(data: Omit<SectionRecord, 'id'>, editId?: string): { success: boolean; error?: string } {
    if (editId) {
      this._sections.update(list => list.map(sec => sec.id === editId ? { ...data, id: editId } : sec));
    } else {
      this._sections.update(list => [{ ...data, id: `sec-${Date.now()}` }, ...list]);
    }
    return { success: true };
  }
  deleteSection(id: string): void {
    this._sections.update(list => list.filter(sec => sec.id !== id));
  }

  // BATCH CRUD
  saveBatch(data: Omit<BatchRecord, 'id'>, editId?: string): { success: boolean; error?: string } {
    if (data.endYear <= data.startYear) {
      return { success: false, error: 'Batch end year must be after start year.' };
    }
    if (editId) {
      this._batches.update(list => list.map(b => b.id === editId ? { ...data, id: editId } : b));
    } else {
      this._batches.update(list => [{ ...data, id: `batch-${Date.now()}` }, ...list]);
    }
    return { success: true };
  }
  deleteBatch(id: string): void {
    this._batches.update(list => list.filter(b => b.id !== id));
  }

  // SUBJECT CRUD
  saveSubject(data: Omit<SubjectRecord, 'id'>, editId?: string): { success: boolean; error?: string } {
    const cleanCode = data.code.trim().toUpperCase();
    const existing = this._subjects().find(sub => sub.code.toUpperCase() === cleanCode && sub.id !== editId);
    if (existing) {
      return { success: false, error: `Subject code "${cleanCode}" already exists.` };
    }
    if (editId) {
      this._subjects.update(list => list.map(sub => sub.id === editId ? { ...data, code: cleanCode, id: editId } : sub));
    } else {
      this._subjects.update(list => [{ ...data, code: cleanCode, id: `sub-${Date.now()}` }, ...list]);
    }
    return { success: true };
  }
  deleteSubject(id: string): void {
    this._subjects.update(list => list.filter(sub => sub.id !== id));
  }

  // SUBJECT ALLOCATION CRUD (with duplicate allocation warning)
  saveSubjectAllocation(data: Omit<SubjectAllocationRecord, 'id'>, editId?: string): { success: boolean; error?: string } {
    const duplicate = this._subjectsAllocationsList().find(
      alloc => alloc.subject === data.subject && alloc.section === data.section && alloc.id !== editId
    );
    if (duplicate) {
      return { success: false, error: `Warning: Subject "${data.subject}" is already allocated to ${data.section} (${data.course} - ${data.semester}).` };
    }

    if (editId) {
      this._subjectAllocations.update(list => list.map(a => a.id === editId ? { ...data, id: editId } : a));
    } else {
      this._subjectAllocations.update(list => [{ ...data, id: `alloc-${Date.now()}` }, ...list]);
    }
    return { success: true };
  }
  deleteSubjectAllocation(id: string): void {
    this._subjectAllocations.update(list => list.filter(a => a.id !== id));
  }

  private _subjectsAllocationsList() {
    return this._subjectAllocations();
  }
}

export interface SemesterRecord {
  id: string;
  semesterNumber: number;
  course: string;
  academicYear: string;
  startDate: string;
  endDate: string;
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
