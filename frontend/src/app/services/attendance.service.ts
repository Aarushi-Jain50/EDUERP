import { Injectable, signal, inject } from '@angular/core';
import { StudentsService } from './students.service';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  initials: string;
  status: 'Present' | 'Absent' | 'Leave';
}

export interface AttendanceSession {
  id: string;
  date: string;
  courseId: string;
  semester: string;
  sectionId: string;
  subjectId: string;
  total: number;
  present: number;
  absent: number;
  leave: number;
  percentage: number;
}

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly studentsService = inject(StudentsService);

  // Mock sessions seed data
  private _sessions = signal<AttendanceSession[]>([
    {
      id: 'sess-1',
      date: '2026-11-10',
      courseId: 'course-mca',
      semester: 'Semester 2',
      sectionId: 'sec-1',
      subjectId: 'sub-1',
      total: 25,
      present: 22,
      absent: 2,
      leave: 1,
      percentage: 88
    },
    {
      id: 'sess-2',
      date: '2026-11-10',
      courseId: 'course-mca',
      semester: 'Semester 2',
      sectionId: 'sec-1',
      subjectId: 'sub-2',
      total: 25,
      present: 20,
      absent: 4,
      leave: 1,
      percentage: 80
    },
    { id: 'sess-3', date: '2026-11-11', courseId: 'course-mca', semester: 'Semester 2', sectionId: 'sec-1', subjectId: 'sub-1', total: 25, present: 24, absent: 1, leave: 0, percentage: 96 },
    { id: 'sess-4', date: '2026-10-10', courseId: 'course-mca', semester: 'Semester 2', sectionId: 'sec-1', subjectId: 'sub-2', total: 25, present: 18, absent: 5, leave: 2, percentage: 72 },
    { id: 'sess-5', date: '2026-10-15', courseId: 'course-mca', semester: 'Semester 2', sectionId: 'sec-1', subjectId: 'sub-1', total: 25, present: 21, absent: 3, leave: 1, percentage: 84 },
    { id: 'sess-6', date: '2026-09-20', courseId: 'course-mca', semester: 'Semester 2', sectionId: 'sec-1', subjectId: 'sub-3', total: 25, present: 23, absent: 2, leave: 0, percentage: 92 },
    { id: 'sess-7', date: '2026-11-05', courseId: 'course-btech', semester: 'Semester 4', sectionId: 'sec-1', subjectId: 'sub-5', total: 60, present: 55, absent: 3, leave: 2, percentage: 91 },
    { id: 'sess-8', date: '2026-11-08', courseId: 'course-mca', semester: 'Semester 2', sectionId: 'sec-1', subjectId: 'sub-4', total: 25, present: 17, absent: 6, leave: 2, percentage: 68 },
    { id: 'sess-9', date: '2026-11-12', courseId: 'course-mca', semester: 'Semester 2', sectionId: 'sec-1', subjectId: 'sub-4', total: 25, present: 18, absent: 6, leave: 1, percentage: 72 },
    { id: 'sess-10', date: '2026-11-09', courseId: 'course-mca', semester: 'Semester 2', sectionId: 'sec-1', subjectId: 'sub-8', total: 25, present: 21, absent: 3, leave: 1, percentage: 84 },
    { id: 'sess-11', date: '2026-11-11', courseId: 'course-mca', semester: 'Semester 2', sectionId: 'sec-1', subjectId: 'sub-9', total: 25, present: 20, absent: 4, leave: 1, percentage: 80 },
    // MCA Section B (sec-2)
    { id: 'sess-12', date: '2026-11-10', courseId: 'course-mca', semester: 'Semester 2', sectionId: 'sec-2', subjectId: 'sub-1', total: 30, present: 25, absent: 4, leave: 1, percentage: 83 },
    { id: 'sess-13', date: '2026-11-11', courseId: 'course-mca', semester: 'Semester 2', sectionId: 'sec-2', subjectId: 'sub-2', total: 30, present: 20, absent: 8, leave: 2, percentage: 67 },
    { id: 'sess-13b', date: '2026-11-06', courseId: 'course-mca', semester: 'Semester 2', sectionId: 'sec-2', subjectId: 'sub-2', total: 30, present: 18, absent: 10, leave: 2, percentage: 60 },
    { id: 'sess-14', date: '2026-11-12', courseId: 'course-mca', semester: 'Semester 2', sectionId: 'sec-2', subjectId: 'sub-4', total: 30, present: 26, absent: 3, leave: 1, percentage: 87 },
    // BCA Section A (sec-3)
    { id: 'sess-15', date: '2026-11-08', courseId: 'course-bca', semester: 'Semester 2', sectionId: 'sec-3', subjectId: 'sub-5', total: 40, present: 34, absent: 5, leave: 1, percentage: 85 },
    { id: 'sess-16', date: '2026-11-10', courseId: 'course-bca', semester: 'Semester 2', sectionId: 'sec-3', subjectId: 'sub-6', total: 40, present: 28, absent: 10, leave: 2, percentage: 70 },
    { id: 'sess-17', date: '2026-11-11', courseId: 'course-bca', semester: 'Semester 2', sectionId: 'sec-3', subjectId: 'sub-10', total: 40, present: 36, absent: 3, leave: 1, percentage: 90 },
    // B.Tech CSE Section A (sec-4)
    { id: 'sess-18', date: '2026-11-09', courseId: 'course-btech-cse', semester: 'Semester 2', sectionId: 'sec-4', subjectId: 'sub-7', total: 50, present: 43, absent: 5, leave: 2, percentage: 86 },
    { id: 'sess-19', date: '2026-11-10', courseId: 'course-btech-cse', semester: 'Semester 2', sectionId: 'sec-4', subjectId: 'sub-11', total: 50, present: 35, absent: 12, leave: 3, percentage: 70 },
    { id: 'sess-20', date: '2026-11-12', courseId: 'course-btech-cse', semester: 'Semester 2', sectionId: 'sec-4', subjectId: 'sub-12', total: 50, present: 41, absent: 7, leave: 2, percentage: 82 }
  ]);

  readonly sessions = this._sessions.asReadonly();

  // Per-student attendance status keyed by `${sessionId}::${studentId}`
  private readonly _studentStatuses = signal<Record<string, 'Present' | 'Absent' | 'Leave'>>({
    'sess-1::stu-1': 'Present',
    'sess-2::stu-1': 'Present',
    'sess-3::stu-1': 'Present',
    'sess-4::stu-1': 'Absent',
    'sess-5::stu-1': 'Present',
    'sess-6::stu-1': 'Present',
    'sess-8::stu-1': 'Absent',
    'sess-9::stu-1': 'Leave',
    'sess-10::stu-1': 'Present',
    'sess-11::stu-1': 'Present',
    'sess-1::stu-2': 'Present',
    'sess-2::stu-2': 'Present',
    'sess-3::stu-2': 'Present',
    'sess-4::stu-2': 'Present',
    'sess-5::stu-2': 'Leave',
    'sess-6::stu-2': 'Present',
    'sess-8::stu-2': 'Present',
    'sess-9::stu-2': 'Absent',
    'sess-10::stu-2': 'Present',
    'sess-11::stu-2': 'Present',
    'sess-12::stu-5': 'Present',
    'sess-13::stu-5': 'Absent',
    'sess-13b::stu-5': 'Absent',
    'sess-14::stu-5': 'Present',
    'sess-15::stu-3': 'Present',
    'sess-16::stu-3': 'Absent',
    'sess-17::stu-3': 'Present',
    'sess-18::stu-4': 'Present',
    'sess-19::stu-4': 'Leave',
    'sess-20::stu-4': 'Present',
    'sess-15::stu-21': 'Present',
    'sess-16::stu-21': 'Absent',
    'sess-17::stu-21': 'Present'
  });

  readonly studentStatuses = this._studentStatuses.asReadonly();

  // Temporary list for currently being marked attendance
  private _markingList = signal<AttendanceRecord[]>([]);
  readonly markingList = this._markingList.asReadonly();

  getStudentStatusForSession(sessionId: string, studentId: string): 'Present' | 'Absent' | 'Leave' {
    const explicit = this._studentStatuses()[`${sessionId}::${studentId}`];
    if (explicit) return explicit;
    const hash = (sessionId + studentId).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    if (hash % 11 === 0) return 'Absent';
    if (hash % 17 === 0) return 'Leave';
    return 'Present';
  }

  loadStudentsForMarking(courseId: string, semester: string, sectionId: string): void {
    const students = this.studentsService.students().filter(s => 
      s.courseId === courseId && s.semester === semester && s.sectionId === sectionId
    );
    
    this._markingList.set(students.map(s => ({
      id: `mark-${s.id}`,
      studentId: s.id,
      studentName: s.name,
      rollNo: s.enrollmentNo,
      initials: s.initials,
      status: 'Present' // Default to present
    })));
  }

  updateMarkingStatus(recordId: string, status: 'Present' | 'Absent' | 'Leave'): void {
    this._markingList.update(list => list.map(r => 
      r.id === recordId ? { ...r, status } : r
    ));
  }

  markAllPresent(): void {
    this._markingList.update(list => list.map(r => ({ ...r, status: 'Present' })));
  }

  resetMarking(): void {
    this._markingList.update(list => list.map(r => ({ ...r, status: 'Present' })));
  }

  saveAttendance(session: Omit<AttendanceSession, 'id' | 'total' | 'present' | 'absent' | 'leave' | 'percentage'>): void {
    const records = this._markingList();
    const total = records.length;
    const present = records.filter(r => r.status === 'Present').length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const leave = records.filter(r => r.status === 'Leave').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    const newSessionId = `sess-${Date.now()}`;
    const newSession: AttendanceSession = {
      ...session,
      id: newSessionId,
      total,
      present,
      absent,
      leave,
      percentage
    };

    if (records.length > 0) {
      this._studentStatuses.update(map => {
        const next = { ...map };
        for (const r of records) {
          next[`${newSessionId}::${r.studentId}`] = r.status;
        }
        return next;
      });
    }

    this._sessions.update(s => [newSession, ...s]);
    this.studentsService.showToast('success', `Attendance saved for ${session.date}. ${present} students marked present.`);
    this._markingList.set([]); // Clear after save
  }

  // Helper to calculate overall attendance for a student (mocked for now)
  getStudentAttendanceStats() {
    // In a real app, this would query all sessions for this student.
    // For mock, we'll return a random value between 65 and 95.
    const randomPercent = 65 + Math.floor(Math.random() * 30);
    return {
      percentage: randomPercent,
      isLow: randomPercent < 75
    };
  }
}
