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
    { id: 'sess-7', date: '2026-11-05', courseId: 'course-btech', semester: 'Semester 4', sectionId: 'sec-1', subjectId: 'sub-5', total: 60, present: 55, absent: 3, leave: 2, percentage: 91 }
  ]);

  readonly sessions = this._sessions.asReadonly();

  // Temporary list for currently being marked attendance
  private _markingList = signal<AttendanceRecord[]>([]);
  readonly markingList = this._markingList.asReadonly();

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

    const newSession: AttendanceSession = {
      ...session,
      id: `sess-${Date.now()}`,
      total,
      present,
      absent,
      leave,
      percentage
    };

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
