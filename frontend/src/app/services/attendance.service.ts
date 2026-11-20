import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StudentsService } from './students.service';
import { AcademicService } from './academic.service';
import { ActivityService } from './activity.service';
import { AuditService } from './audit.service';
import { FirestoreCollectionSync } from '../lib/firestore-collection-sync';

export type AttendanceStatus = 'Present' | 'Absent' | 'Leave';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  initials: string;
  status: AttendanceStatus;
}

export interface AttendanceSession {
  id: string;
  date: string;
  courseId: string;
  courseName?: string;
  semester: string;
  sectionId: string;
  sectionName?: string;
  subjectId: string;
  subjectName?: string;
  facultyName?: string;
  total: number;
  present: number;
  absent: number;
  leave: number;
  percentage: number;
  locked?: boolean;
  studentStatuses?: Record<string, AttendanceStatus>;
}

export interface LowAttendanceStudent {
  studentId: string;
  enrollmentNo: string;
  name: string;
  course: string;
  semester: string;
  section: string;
  attended: number;
  totalSessions: number;
  percentage: number;
  shortagePct: number;
}

const SEED_SESSIONS: AttendanceSession[] = [
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
    percentage: 88,
    studentStatuses: { 'stu-1': 'Present', 'stu-2': 'Present' }
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
    percentage: 80,
    studentStatuses: { 'stu-1': 'Present', 'stu-2': 'Present' }
  },
  {
    id: 'sess-3',
    date: '2026-11-11',
    courseId: 'course-mca',
    semester: 'Semester 2',
    sectionId: 'sec-1',
    subjectId: 'sub-1',
    total: 25,
    present: 24,
    absent: 1,
    leave: 0,
    percentage: 96,
    studentStatuses: { 'stu-1': 'Present', 'stu-2': 'Present' }
  },
  {
    id: 'sess-4',
    date: '2026-10-10',
    courseId: 'course-mca',
    semester: 'Semester 2',
    sectionId: 'sec-1',
    subjectId: 'sub-2',
    total: 25,
    present: 18,
    absent: 5,
    leave: 2,
    percentage: 72,
    studentStatuses: { 'stu-1': 'Absent', 'stu-2': 'Present' }
  },
  {
    id: 'sess-5',
    date: '2026-10-15',
    courseId: 'course-mca',
    semester: 'Semester 2',
    sectionId: 'sec-1',
    subjectId: 'sub-1',
    total: 25,
    present: 21,
    absent: 3,
    leave: 1,
    percentage: 84,
    studentStatuses: { 'stu-1': 'Present', 'stu-2': 'Leave' }
  },
  {
    id: 'sess-6',
    date: '2026-09-20',
    courseId: 'course-mca',
    semester: 'Semester 2',
    sectionId: 'sec-1',
    subjectId: 'sub-3',
    total: 25,
    present: 23,
    absent: 2,
    leave: 0,
    percentage: 92,
    studentStatuses: { 'stu-1': 'Present', 'stu-2': 'Present' }
  },
  {
    id: 'sess-7',
    date: '2026-11-05',
    courseId: 'course-btech',
    semester: 'Semester 4',
    sectionId: 'sec-1',
    subjectId: 'sub-5',
    total: 60,
    present: 55,
    absent: 3,
    leave: 2,
    percentage: 91
  },
  {
    id: 'sess-8',
    date: '2026-11-08',
    courseId: 'course-mca',
    semester: 'Semester 2',
    sectionId: 'sec-1',
    subjectId: 'sub-4',
    total: 25,
    present: 17,
    absent: 6,
    leave: 2,
    percentage: 68,
    studentStatuses: { 'stu-1': 'Absent', 'stu-2': 'Present' }
  },
  {
    id: 'sess-9',
    date: '2026-11-12',
    courseId: 'course-mca',
    semester: 'Semester 2',
    sectionId: 'sec-1',
    subjectId: 'sub-4',
    total: 25,
    present: 18,
    absent: 6,
    leave: 1,
    percentage: 72,
    studentStatuses: { 'stu-1': 'Leave', 'stu-2': 'Absent' }
  },
  {
    id: 'sess-10',
    date: '2026-11-09',
    courseId: 'course-mca',
    semester: 'Semester 2',
    sectionId: 'sec-1',
    subjectId: 'sub-8',
    total: 25,
    present: 21,
    absent: 3,
    leave: 1,
    percentage: 84,
    studentStatuses: { 'stu-1': 'Present', 'stu-2': 'Present' }
  },
  {
    id: 'sess-11',
    date: '2026-11-11',
    courseId: 'course-mca',
    semester: 'Semester 2',
    sectionId: 'sec-1',
    subjectId: 'sub-9',
    total: 25,
    present: 20,
    absent: 4,
    leave: 1,
    percentage: 80,
    studentStatuses: { 'stu-1': 'Present', 'stu-2': 'Present' }
  },
  {
    id: 'sess-12',
    date: '2026-11-10',
    courseId: 'course-mca',
    semester: 'Semester 2',
    sectionId: 'sec-2',
    subjectId: 'sub-1',
    total: 30,
    present: 25,
    absent: 4,
    leave: 1,
    percentage: 83,
    studentStatuses: { 'stu-5': 'Present' }
  },
  {
    id: 'sess-13',
    date: '2026-11-11',
    courseId: 'course-mca',
    semester: 'Semester 2',
    sectionId: 'sec-2',
    subjectId: 'sub-2',
    total: 30,
    present: 20,
    absent: 8,
    leave: 2,
    percentage: 67,
    studentStatuses: { 'stu-5': 'Absent' }
  },
  {
    id: 'sess-13b',
    date: '2026-11-06',
    courseId: 'course-mca',
    semester: 'Semester 2',
    sectionId: 'sec-2',
    subjectId: 'sub-2',
    total: 30,
    present: 18,
    absent: 10,
    leave: 2,
    percentage: 60,
    studentStatuses: { 'stu-5': 'Absent' }
  },
  {
    id: 'sess-14',
    date: '2026-11-12',
    courseId: 'course-mca',
    semester: 'Semester 2',
    sectionId: 'sec-2',
    subjectId: 'sub-4',
    total: 30,
    present: 26,
    absent: 3,
    leave: 1,
    percentage: 87,
    studentStatuses: { 'stu-5': 'Present' }
  },
  {
    id: 'sess-15',
    date: '2026-11-08',
    courseId: 'course-bca',
    semester: 'Semester 2',
    sectionId: 'sec-3',
    subjectId: 'sub-5',
    total: 40,
    present: 34,
    absent: 5,
    leave: 1,
    percentage: 85,
    studentStatuses: { 'stu-3': 'Present', 'stu-21': 'Present' }
  },
  {
    id: 'sess-16',
    date: '2026-11-10',
    courseId: 'course-bca',
    semester: 'Semester 2',
    sectionId: 'sec-3',
    subjectId: 'sub-6',
    total: 40,
    present: 28,
    absent: 10,
    leave: 2,
    percentage: 70,
    studentStatuses: { 'stu-3': 'Absent', 'stu-21': 'Absent' }
  },
  {
    id: 'sess-17',
    date: '2026-11-11',
    courseId: 'course-bca',
    semester: 'Semester 2',
    sectionId: 'sec-3',
    subjectId: 'sub-10',
    total: 40,
    present: 36,
    absent: 3,
    leave: 1,
    percentage: 90,
    studentStatuses: { 'stu-3': 'Present', 'stu-21': 'Present' }
  },
  {
    id: 'sess-18',
    date: '2026-11-09',
    courseId: 'course-btech-cse',
    semester: 'Semester 2',
    sectionId: 'sec-4',
    subjectId: 'sub-7',
    total: 50,
    present: 43,
    absent: 5,
    leave: 2,
    percentage: 86,
    studentStatuses: { 'stu-4': 'Present' }
  },
  {
    id: 'sess-19',
    date: '2026-11-10',
    courseId: 'course-btech-cse',
    semester: 'Semester 2',
    sectionId: 'sec-4',
    subjectId: 'sub-11',
    total: 50,
    present: 35,
    absent: 12,
    leave: 3,
    percentage: 70,
    studentStatuses: { 'stu-4': 'Leave' }
  },
  {
    id: 'sess-20',
    date: '2026-11-12',
    courseId: 'course-btech-cse',
    semester: 'Semester 2',
    sectionId: 'sec-4',
    subjectId: 'sub-12',
    total: 50,
    present: 41,
    absent: 7,
    leave: 2,
    percentage: 82,
    studentStatuses: { 'stu-4': 'Present' }
  }
];

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly studentsService = inject(StudentsService);
  private readonly academicService = inject(AcademicService);
  private readonly activityService = inject(ActivityService);
  private readonly auditService = inject(AuditService);

  private readonly _sessions = signal<AttendanceSession[]>([]);
  private readonly sessionsSync = new FirestoreCollectionSync<AttendanceSession>(
    'attendanceSessions',
    'eduerp_attendance_sessions_v1',
    this._sessions,
    isPlatformBrowser(this.platformId)
  );

  readonly sessions = computed(() => {
    const courses = this.academicService.courses();
    const sections = this.academicService.sections();
    const subjects = this.academicService.subjects();

    return this._sessions().map(s => ({
      ...s,
      courseName: s.courseName || courses.find(c => c.id === s.courseId)?.name || s.courseId,
      sectionName: s.sectionName || sections.find(sec => sec.id === s.sectionId)?.section || s.sectionId,
      subjectName: s.subjectName || subjects.find(sub => sub.id === s.subjectId)?.name || s.subjectId
    }));
  });

  private readonly _studentStatuses = signal<Record<string, AttendanceStatus>>({
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

  private readonly _markingList = signal<AttendanceRecord[]>([]);
  readonly markingList = this._markingList.asReadonly();

  readonly lowAttendanceStudents = computed<LowAttendanceStudent[]>(() => this.getLowAttendanceStudents(75));

  constructor() {
    this._sessions.set(this.sessionsSync.loadInitial(SEED_SESSIONS));
    this.sessionsSync.startSync();
  }

  getStudentStatusForSession(sessionId: string, studentId: string): AttendanceStatus {
    const session = this._sessions().find(s => s.id === sessionId);
    const inSession = session?.studentStatuses?.[studentId];
    if (inSession) return inSession;
    const explicit = this._studentStatuses()[`${sessionId}::${studentId}`];
    if (explicit) return explicit;
    const hash = (sessionId + studentId).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    if (hash % 11 === 0) return 'Absent';
    if (hash % 17 === 0) return 'Leave';
    return 'Present';
  }

  loadStudentsForMarking(courseId: string, semester: string, sectionId: string, date?: string, subjectId?: string): void {
    const students = this.studentsService.students().filter(
      s => s.courseId === courseId && s.semester === semester && s.sectionId === sectionId && s.status !== 'Inactive'
    );

    const existingSession =
      date && subjectId
        ? this._sessions().find(
            s =>
              s.date === date &&
              s.courseId === courseId &&
              s.semester === semester &&
              s.sectionId === sectionId &&
              s.subjectId === subjectId
          )
        : undefined;

    this._markingList.set(
      students.map(s => ({
        id: `mark-${s.id}`,
        studentId: s.id,
        studentName: s.name,
        rollNo: s.enrollmentNo,
        initials: s.initials,
        status: existingSession ? this.getStudentStatusForSession(existingSession.id, s.id) : 'Present'
      }))
    );
  }

  loadSessionForEditing(sessionId: string): AttendanceRecord[] {
    const session = this._sessions().find(s => s.id === sessionId);
    if (!session) return [];
    const students = this.studentsService.students().filter(
      s => s.courseId === session.courseId && s.semester === session.semester && s.sectionId === session.sectionId
    );
    return students.map(s => ({
      id: `mark-${s.id}`,
      studentId: s.id,
      studentName: s.name,
      rollNo: s.enrollmentNo,
      initials: s.initials,
      status: this.getStudentStatusForSession(sessionId, s.id)
    }));
  }

  updateMarkingStatus(recordId: string, status: AttendanceStatus): void {
    this._markingList.update(list => list.map(r => (r.id === recordId ? { ...r, status } : r)));
  }

  markAllPresent(): void {
    this._markingList.update(list => list.map(r => ({ ...r, status: 'Present' })));
  }

  resetMarking(): void {
    this._markingList.update(list => list.map(r => ({ ...r, status: 'Present' })));
  }

  saveAttendance(
    session: Omit<AttendanceSession, 'id' | 'total' | 'present' | 'absent' | 'leave' | 'percentage'>
  ): { success: boolean; error?: string } {
    const records = this._markingList();
    if (records.length === 0) {
      return { success: false, error: 'No students loaded for marking.' };
    }

    const existing = this._sessions().find(
      s =>
        s.date === session.date &&
        s.courseId === session.courseId &&
        s.semester === session.semester &&
        s.sectionId === session.sectionId &&
        s.subjectId === session.subjectId
    );

    if (existing?.locked) {
      this.studentsService.showToast('error', 'This attendance session is locked by administration.');
      return { success: false, error: 'Session is locked.' };
    }

    const total = records.length;
    const present = records.filter(r => r.status === 'Present').length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const leave = records.filter(r => r.status === 'Leave').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    const statusMap: Record<string, AttendanceStatus> = {};
    for (const r of records) {
      statusMap[r.studentId] = r.status;
    }

    const courseName =
      session.courseName || this.academicService.courses().find(c => c.id === session.courseId)?.name || session.courseId;
    const sectionName =
      session.sectionName || this.academicService.sections().find(sec => sec.id === session.sectionId)?.section || session.sectionId;
    const subjectName =
      session.subjectName || this.academicService.subjects().find(sub => sub.id === session.subjectId)?.name || session.subjectId;

    const targetId = existing?.id || `sess-${Date.now()}`;
    const savedSession: AttendanceSession = {
      ...session,
      id: targetId,
      courseName,
      sectionName,
      subjectName,
      total,
      present,
      absent,
      leave,
      percentage,
      locked: session.locked ?? existing?.locked ?? false,
      studentStatuses: statusMap
    };

    this._studentStatuses.update(map => {
      const next = { ...map };
      for (const r of records) {
        next[`${targetId}::${r.studentId}`] = r.status;
      }
      return next;
    });

    this._sessions.update(list =>
      existing ? list.map(item => (item.id === targetId ? savedSession : item)) : [savedSession, ...list]
    );
    this.sessionsSync.syncUpsert(savedSession);

    this.activityService.logActivity({
      user: 'Admin / Faculty',
      role: 'Academic Operations',
      module: 'Attendance',
      category: 'Attendance',
      operationType: existing ? 'Update' : 'Create',
      action: existing ? 'Updated Attendance Session' : 'Marked Attendance Session',
      target: `${subjectName} (${sectionName}) • ${session.date}`,
      recordId: targetId,
      details: `${present}/${total} Present (${percentage}%), ${absent} Absent, ${leave} Leave.`,
      icon: 'how_to_reg'
    });

    this.studentsService.showToast(
      'success',
      `Attendance saved for ${session.date}. ${present}/${total} students marked present.`
    );
    this._markingList.set([]);
    return { success: true };
  }

  updateSessionRecords(sessionId: string, updatedRecords: AttendanceRecord[]): { success: boolean; error?: string } {
    const existing = this._sessions().find(s => s.id === sessionId);
    if (!existing) return { success: false, error: 'Session not found.' };
    if (existing.locked) return { success: false, error: 'Unlock the session before editing marks.' };

    const total = updatedRecords.length;
    const present = updatedRecords.filter(r => r.status === 'Present').length;
    const absent = updatedRecords.filter(r => r.status === 'Absent').length;
    const leave = updatedRecords.filter(r => r.status === 'Leave').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    const statusMap: Record<string, AttendanceStatus> = {};
    for (const r of updatedRecords) {
      statusMap[r.studentId] = r.status;
    }

    const updated: AttendanceSession = {
      ...existing,
      total,
      present,
      absent,
      leave,
      percentage,
      studentStatuses: statusMap
    };

    this._studentStatuses.update(map => {
      const next = { ...map };
      for (const r of updatedRecords) {
        next[`${sessionId}::${r.studentId}`] = r.status;
      }
      return next;
    });

    this._sessions.update(list => list.map(s => (s.id === sessionId ? updated : s)));
    this.sessionsSync.syncUpsert(updated);

    this.auditService.log({
      userId: 'admin',
      userName: 'Administrator',
      role: 'Academic Operations',
      module: 'Attendance',
      action: 'Update',
      target: `Edited Session ${existing.date} (${sessionId})`,
      status: 'Success',
      oldValue: `${existing.present}/${existing.total} (${existing.percentage}%)`,
      newValue: `${present}/${total} (${percentage}%)`
    });
    this.studentsService.showToast('success', `Session attendance updated (${present}/${total} present).`);
    return { success: true };
  }

  toggleSessionLock(sessionId: string): void {
    const existing = this._sessions().find(s => s.id === sessionId);
    if (!existing) return;
    const nextLocked = !existing.locked;
    const updated: AttendanceSession = { ...existing, locked: nextLocked };
    this._sessions.update(list => list.map(s => (s.id === sessionId ? updated : s)));
    this.sessionsSync.syncUpsert(updated);

    this.auditService.log({
      userId: 'admin',
      userName: 'Administrator',
      role: 'Academic Operations',
      module: 'Attendance',
      action: 'Update',
      target: `${nextLocked ? 'Locked' : 'Unlocked'} attendance session ${existing.date}`,
      status: 'Success'
    });
    this.studentsService.showToast(
      'info',
      `Attendance session for ${existing.date} ${nextLocked ? 'locked' : 'unlocked'}.`
    );
  }

  deleteSession(sessionId: string): void {
    const existing = this._sessions().find(s => s.id === sessionId);
    if (!existing) return;
    if (existing.locked) {
      this.studentsService.showToast('error', 'Locked attendance sessions cannot be deleted.');
      return;
    }
    this._sessions.update(list => list.filter(s => s.id !== sessionId));
    this.sessionsSync.syncDelete(sessionId);
    this.auditService.log({
      userId: 'admin',
      userName: 'Administrator',
      role: 'Academic Operations',
      module: 'Attendance',
      action: 'Delete',
      target: `Deleted attendance session ${existing.date}`,
      status: 'Success'
    });
    this.studentsService.showToast('info', 'Attendance session deleted.');
  }

  getStudentAttendanceStats(studentId?: string): {
    percentage: number;
    isLow: boolean;
    attended: number;
    total: number;
  } {
    if (!studentId) {
      const list = this._sessions();
      const avg = list.length > 0 ? Math.round(list.reduce((sum, s) => sum + s.percentage, 0) / list.length) : 85;
      return { percentage: avg, isLow: avg < 75, attended: 0, total: list.length };
    }

    const student = this.studentsService.students().find(s => s.id === studentId);
    if (!student) return { percentage: 0, isLow: true, attended: 0, total: 0 };

    const matchingSessions = this._sessions().filter(
      s => s.courseId === student.courseId && s.semester === student.semester && s.sectionId === student.sectionId
    );
    if (matchingSessions.length === 0) {
      return { percentage: 100, isLow: false, attended: 0, total: 0 };
    }

    let attended = 0;
    for (const s of matchingSessions) {
      const status = this.getStudentStatusForSession(s.id, studentId);
      if (status === 'Present') attended++;
    }
    const percentage = Math.round((attended / matchingSessions.length) * 100);
    return {
      percentage,
      isLow: percentage < 75,
      attended,
      total: matchingSessions.length
    };
  }

  getLowAttendanceStudents(threshold = 75): LowAttendanceStudent[] {
    const out: LowAttendanceStudent[] = [];
    for (const stu of this.studentsService.students()) {
      if (stu.status === 'Inactive') continue;
      const stats = this.getStudentAttendanceStats(stu.id);
      if (stats.total > 0 && stats.percentage < threshold) {
        out.push({
          studentId: stu.id,
          enrollmentNo: stu.enrollmentNo,
          name: stu.name,
          course: stu.course,
          semester: stu.semester,
          section: stu.section,
          attended: stats.attended,
          totalSessions: stats.total,
          percentage: stats.percentage,
          shortagePct: Math.max(0, threshold - stats.percentage)
        });
      }
    }
    return out.sort((a, b) => a.percentage - b.percentage);
  }
}
