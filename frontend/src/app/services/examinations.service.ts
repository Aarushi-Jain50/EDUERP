import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AcademicService } from './academic.service';
import { StudentsService } from './students.service';
import { ActivityService } from './activity.service';
import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';
import { AttendanceService } from './attendance.service';
import { FirestoreCollectionSync } from '../lib/firestore-collection-sync';
import { Student } from '../models/student.model';

export type ExamType = 'Internal' | 'Mid-Term' | 'End-Term' | 'Practical';
export type ExamMode = 'Online' | 'Offline' | 'Hybrid';
export type ExamStatus = 'Scheduled' | 'Ongoing' | 'Completed';

export interface Examination {
  id: string;
  title: string;
  type: ExamType;
  mode: ExamMode;
  subjectId: string;
  subjectName: string;
  courseId: string;
  courseName: string;
  semester: string;
  date: string;
  time: string;
  duration: number;
  maxMarks: number;
  passingMarks: number;
  venue?: string;
  seatNo?: string;
  roomCapacity?: number;
  invigilator?: string;
  proctored?: boolean;
  publishedHallTickets?: boolean;
  reportingMinutesBefore?: number;
  resultAnnouncementDate?: string;
  resultAnnouncementTime?: string;
  status?: ExamStatus;
}

export interface HallTicketStudentEntry {
  student: Student;
  seatAllocation: string;
  attendancePct: number;
  eligible: boolean;
  ineligibleReason?: string;
}

const SEED_EXAMS: Examination[] = [
  {
    id: 'ex-1',
    title: 'Internal Assessment I',
    type: 'Internal',
    mode: 'Online',
    proctored: true,
    publishedHallTickets: true,
    venue: 'Protected Online Exam Browser',
    invigilator: 'Dr. Amit Joshi',
    roomCapacity: 60,
    resultAnnouncementDate: '2026-11-26',
    resultAnnouncementTime: '17:00',
    subjectId: 'sub-1',
    subjectName: 'Advanced Data Structures & Algorithms',
    courseId: 'course-mca',
    courseName: 'Master of Computer Applications',
    semester: 'Semester 2',
    date: '2026-11-20',
    time: '10:00',
    duration: 60,
    maxMarks: 20,
    passingMarks: 8
  },
  {
    id: 'ex-2',
    title: 'End-Term Theory Exam',
    type: 'End-Term',
    mode: 'Offline',
    publishedHallTickets: true,
    venue: 'Block A · Hall 104',
    seatNo: 'A-104-14',
    invigilator: 'Prof. Ananya Sen',
    roomCapacity: 40,
    reportingMinutesBefore: 30,
    resultAnnouncementDate: '2026-01-05',
    resultAnnouncementTime: '16:00',
    subjectId: 'sub-1',
    subjectName: 'Advanced Data Structures & Algorithms',
    courseId: 'course-mca',
    courseName: 'Master of Computer Applications',
    semester: 'Semester 2',
    date: '2025-12-15',
    time: '14:00',
    duration: 180,
    maxMarks: 70,
    passingMarks: 28
  },
  {
    id: 'ex-3',
    title: 'Mid-Term Examination',
    type: 'Mid-Term',
    mode: 'Online',
    proctored: true,
    publishedHallTickets: true,
    venue: 'Protected Online Exam Browser',
    invigilator: 'Prof. Ananya Sen',
    resultAnnouncementDate: '2026-10-20',
    resultAnnouncementTime: '17:00',
    subjectId: 'sub-2',
    subjectName: 'Enterprise Web Application Architecture',
    courseId: 'course-mca',
    courseName: 'Master of Computer Applications',
    semester: 'Semester 2',
    date: '2026-10-10',
    time: '11:00',
    duration: 90,
    maxMarks: 50,
    passingMarks: 20
  },
  {
    id: 'ex-4',
    title: 'Practical Viva-Voce',
    type: 'Practical',
    mode: 'Offline',
    publishedHallTickets: true,
    venue: 'Computing Lab 2 · Block B',
    seatNo: 'LAB2-08',
    invigilator: 'Dr. S. N. Roy',
    roomCapacity: 30,
    reportingMinutesBefore: 20,
    resultAnnouncementDate: '2026-01-08',
    resultAnnouncementTime: '16:00',
    subjectId: 'sub-3',
    subjectName: 'Full Stack Development Lab',
    courseId: 'course-mca',
    courseName: 'Master of Computer Applications',
    semester: 'Semester 2',
    date: '2025-12-20',
    time: '09:00',
    duration: 120,
    maxMarks: 50,
    passingMarks: 25
  },
  {
    id: 'ex-5',
    title: 'Sessional Test II',
    type: 'Internal',
    mode: 'Online',
    proctored: true,
    publishedHallTickets: false,
    venue: 'Protected Online Exam Browser',
    invigilator: 'Prof. Meena Sharma',
    resultAnnouncementDate: '2026-12-01',
    resultAnnouncementTime: '17:00',
    subjectId: 'sub-5',
    subjectName: 'Discrete Mathematics',
    courseId: 'course-bca',
    courseName: 'Bachelor of Computer Applications',
    semester: 'Semester 2',
    date: '2026-11-25',
    time: '10:30',
    duration: 60,
    maxMarks: 20,
    passingMarks: 8
  },
  {
    id: 'ex-6',
    title: 'Internal Assessment II',
    type: 'Internal',
    mode: 'Hybrid',
    proctored: true,
    publishedHallTickets: true,
    venue: 'Cloud Lab 3 / Proctored Online Browser',
    seatNo: 'CL3-12',
    invigilator: 'Prof. Sandeep Bansal',
    roomCapacity: 35,
    reportingMinutesBefore: 15,
    resultAnnouncementDate: '2026-11-30',
    resultAnnouncementTime: '17:00',
    subjectId: 'sub-4',
    subjectName: 'Cloud Computing & DevOps',
    courseId: 'course-mca',
    courseName: 'Master of Computer Applications',
    semester: 'Semester 2',
    date: '2026-11-24',
    time: '11:00',
    duration: 60,
    maxMarks: 25,
    passingMarks: 10
  },
  {
    id: 'ex-7',
    title: 'End-Term Theory Exam (AI & ML)',
    type: 'End-Term',
    mode: 'Offline',
    publishedHallTickets: true,
    venue: 'Central Examination Hall · Block C-204',
    seatNo: 'C-204-21',
    invigilator: 'Dr. Meera Nair',
    roomCapacity: 60,
    reportingMinutesBefore: 30,
    resultAnnouncementDate: '2026-12-22',
    resultAnnouncementTime: '16:00',
    subjectId: 'sub-8',
    subjectName: 'Artificial Intelligence & ML',
    courseId: 'course-mca',
    courseName: 'Master of Computer Applications',
    semester: 'Semester 2',
    date: '2026-12-05',
    time: '10:00',
    duration: 180,
    maxMarks: 70,
    passingMarks: 28
  },
  {
    id: 'ex-8',
    title: 'Sessional Test I (Cloud & DevOps)',
    type: 'Internal',
    mode: 'Online',
    proctored: true,
    publishedHallTickets: true,
    venue: 'Protected Online Exam Browser',
    invigilator: 'Prof. Sandeep Bansal',
    resultAnnouncementDate: '2026-09-25',
    resultAnnouncementTime: '17:00',
    subjectId: 'sub-4',
    subjectName: 'Cloud Computing & DevOps',
    courseId: 'course-mca',
    courseName: 'Master of Computer Applications',
    semester: 'Semester 2',
    date: '2026-09-18',
    time: '10:00',
    duration: 60,
    maxMarks: 20,
    passingMarks: 8
  },
  {
    id: 'ex-9',
    title: 'Mid-Term DBMS Examination',
    type: 'Mid-Term',
    mode: 'Offline',
    publishedHallTickets: true,
    venue: 'Block B · Hall 201',
    seatNo: 'B-201-05',
    invigilator: 'Prof. Ananya Sen',
    roomCapacity: 45,
    reportingMinutesBefore: 30,
    resultAnnouncementDate: '2026-10-22',
    resultAnnouncementTime: '16:00',
    subjectId: 'sub-10',
    subjectName: 'Database Management Systems',
    courseId: 'course-bca',
    courseName: 'Bachelor of Computer Applications',
    semester: 'Semester 2',
    date: '2026-10-12',
    time: '10:00',
    duration: 90,
    maxMarks: 50,
    passingMarks: 20
  },
  {
    id: 'ex-10',
    title: 'Java Practical Evaluation',
    type: 'Practical',
    mode: 'Hybrid',
    proctored: true,
    publishedHallTickets: true,
    venue: 'Programming Lab 1 / Online Sandbox',
    seatNo: 'PL1-19',
    invigilator: 'Prof. Ananya Sen',
    roomCapacity: 40,
    reportingMinutesBefore: 15,
    resultAnnouncementDate: '2026-11-05',
    resultAnnouncementTime: '17:00',
    subjectId: 'sub-6',
    subjectName: 'Java Programming Lab',
    courseId: 'course-bca',
    courseName: 'Bachelor of Computer Applications',
    semester: 'Semester 2',
    date: '2026-10-28',
    time: '14:00',
    duration: 120,
    maxMarks: 50,
    passingMarks: 25
  },
  {
    id: 'ex-11',
    title: 'End-Term Theory Exam (DBMS)',
    type: 'End-Term',
    mode: 'Offline',
    publishedHallTickets: true,
    venue: 'Main Auditorium · Hall 101',
    seatNo: 'AUD-11',
    invigilator: 'Prof. Meena Sharma',
    roomCapacity: 80,
    reportingMinutesBefore: 30,
    resultAnnouncementDate: '2026-12-18',
    resultAnnouncementTime: '16:00',
    subjectId: 'sub-10',
    subjectName: 'Database Management Systems',
    courseId: 'course-bca',
    courseName: 'Bachelor of Computer Applications',
    semester: 'Semester 2',
    date: '2026-12-02',
    time: '10:00',
    duration: 180,
    maxMarks: 70,
    passingMarks: 28
  },
  {
    id: 'ex-12',
    title: 'Mid-Term Operating Systems',
    type: 'Mid-Term',
    mode: 'Online',
    proctored: true,
    publishedHallTickets: true,
    venue: 'Protected Online Exam Browser',
    invigilator: 'Dr. S. N. Roy',
    resultAnnouncementDate: '2026-10-24',
    resultAnnouncementTime: '17:00',
    subjectId: 'sub-11',
    subjectName: 'Operating Systems',
    courseId: 'course-btech-cse',
    courseName: 'B.Tech Computer Science & Engineering',
    semester: 'Semester 2',
    date: '2026-10-14',
    time: '09:30',
    duration: 90,
    maxMarks: 50,
    passingMarks: 20
  },
  {
    id: 'ex-13',
    title: 'End-Term Computer Networks',
    type: 'End-Term',
    mode: 'Offline',
    publishedHallTickets: true,
    venue: 'Engineering Block D · Hall 305',
    seatNo: 'D-305-27',
    invigilator: 'Dr. R. K. Singh',
    roomCapacity: 60,
    reportingMinutesBefore: 30,
    resultAnnouncementDate: '2026-12-15',
    resultAnnouncementTime: '16:00',
    subjectId: 'sub-12',
    subjectName: 'Computer Networks',
    courseId: 'course-btech-cse',
    courseName: 'B.Tech Computer Science & Engineering',
    semester: 'Semester 2',
    date: '2026-11-28',
    time: '10:00',
    duration: 180,
    maxMarks: 70,
    passingMarks: 28
  },
  {
    id: 'ex-14',
    title: 'End-Term Theory Exam (Programming in C)',
    type: 'End-Term',
    mode: 'Offline',
    publishedHallTickets: true,
    venue: 'Block A · Hall 102',
    seatNo: 'A-102-14',
    invigilator: 'Dr. Amit Joshi',
    roomCapacity: 50,
    reportingMinutesBefore: 30,
    resultAnnouncementDate: '2025-12-05',
    resultAnnouncementTime: '16:00',
    subjectId: 'sub-sem1-c',
    subjectName: 'Programming & Problem Solving in C',
    courseId: 'course-mca',
    courseName: 'Master of Computer Applications',
    semester: 'Semester 1',
    date: '2025-11-18',
    time: '10:00',
    duration: 180,
    maxMarks: 100,
    passingMarks: 40
  },
  {
    id: 'ex-15',
    title: 'End-Term Theory Exam (Relational Databases)',
    type: 'End-Term',
    mode: 'Offline',
    publishedHallTickets: true,
    venue: 'Block A · Hall 105',
    seatNo: 'A-105-14',
    invigilator: 'Prof. Ananya Sen',
    roomCapacity: 50,
    reportingMinutesBefore: 30,
    resultAnnouncementDate: '2025-12-09',
    resultAnnouncementTime: '16:00',
    subjectId: 'sub-sem1-db',
    subjectName: 'Relational Database Systems',
    courseId: 'course-mca',
    courseName: 'Master of Computer Applications',
    semester: 'Semester 1',
    date: '2025-11-22',
    time: '10:00',
    duration: 180,
    maxMarks: 100,
    passingMarks: 40
  },
  {
    id: 'ex-16',
    title: 'End-Term Theory Exam (Computer Fundamentals)',
    type: 'End-Term',
    mode: 'Offline',
    publishedHallTickets: true,
    venue: 'Block B · Hall 203',
    seatNo: 'B-203-09',
    invigilator: 'Prof. Meena Sharma',
    roomCapacity: 45,
    reportingMinutesBefore: 30,
    resultAnnouncementDate: '2025-12-07',
    resultAnnouncementTime: '16:00',
    subjectId: 'sub-sem1-bca',
    subjectName: 'Computer Fundamentals & Logic Design',
    courseId: 'course-bca',
    courseName: 'Bachelor of Computer Applications',
    semester: 'Semester 1',
    date: '2025-11-20',
    time: '10:00',
    duration: 180,
    maxMarks: 100,
    passingMarks: 40
  },
  {
    id: 'ex-17',
    title: 'End-Term Theory Exam (Engineering Mathematics I)',
    type: 'End-Term',
    mode: 'Offline',
    publishedHallTickets: true,
    venue: 'Engineering Block D · Hall 101',
    seatNo: 'D-101-18',
    invigilator: 'Dr. Rajesh Khanna',
    roomCapacity: 60,
    reportingMinutesBefore: 30,
    resultAnnouncementDate: '2025-12-08',
    resultAnnouncementTime: '16:00',
    subjectId: 'sub-sem1-cse',
    subjectName: 'Engineering Mathematics I',
    courseId: 'course-btech-cse',
    courseName: 'B.Tech Computer Science & Engineering',
    semester: 'Semester 1',
    date: '2025-11-21',
    time: '10:00',
    duration: 180,
    maxMarks: 100,
    passingMarks: 40
  },
  {
    id: 'ex-18',
    title: 'Live Online Readiness & Web Architecture Quiz',
    type: 'Internal',
    mode: 'Online',
    proctored: true,
    publishedHallTickets: true,
    venue: 'Protected Online Exam Browser',
    invigilator: 'Prof. Ananya Sen',
    resultAnnouncementDate: '2026-11-23',
    resultAnnouncementTime: '18:00',
    subjectId: 'sub-2',
    subjectName: 'Enterprise Web Application Architecture',
    courseId: 'course-mca',
    courseName: 'Master of Computer Applications',
    semester: 'Semester 2',
    date: '2026-11-19',
    time: '02:30',
    duration: 45,
    maxMarks: 30,
    passingMarks: 12
  }
];

@Injectable({ providedIn: 'root' })
export class ExaminationsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly academicService = inject(AcademicService);
  private readonly studentsService = inject(StudentsService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly activityService = inject(ActivityService);
  private readonly auditService = inject(AuditService);
  private readonly notificationService = inject(NotificationService);

  private readonly _exams = signal<Examination[]>([]);
  private readonly examsSync = new FirestoreCollectionSync<Examination>(
    'examinations',
    'eduerp_examinations_v1',
    this._exams,
    isPlatformBrowser(this.platformId)
  );

  readonly exams = computed(() => {
    const now = new Date();
    return this._exams().map(e => {
      const examDate = new Date(`${e.date}T${e.time}`);
      const endDate = new Date(examDate.getTime() + e.duration * 60000);

      let status: ExamStatus = 'Scheduled';
      if (now > endDate) status = 'Completed';
      else if (now >= examDate && now <= endDate) status = 'Ongoing';

      return {
        ...e,
        resultAnnouncementDate: e.resultAnnouncementDate || this.getExpectedResultDate(e),
        resultAnnouncementTime: e.resultAnnouncementTime || '17:00',
        status
      };
    });
  });

  constructor() {
    this._exams.set(this.examsSync.loadInitial(SEED_EXAMS));
    this.examsSync.startSync();
  }

  getExpectedResultDate(exam: Pick<Examination, 'date' | 'type' | 'resultAnnouncementDate'>): string {
    if (exam.resultAnnouncementDate) return exam.resultAnnouncementDate;
    const base = new Date(exam.date);
    if (Number.isNaN(base.getTime())) return exam.date;
    const offsetDays = exam.type === 'End-Term' ? 16 : exam.type === 'Mid-Term' ? 10 : 6;
    base.setDate(base.getDate() + offsetDays);
    return base.toISOString().split('T')[0];
  }

  getAll() {
    return this.exams();
  }

  getById(id: string) {
    return this.exams().find(e => e.id === id);
  }

  getCompleted() {
    return this.exams().filter(e => e.status === 'Completed');
  }

  add(exam: Omit<Examination, 'id'>): { success: boolean; error?: string } {
    const clash = this.detectConflict(exam);
    if (clash) {
      return { success: false, error: clash };
    }

    const newId = `ex-${Date.now()}`;
    const enriched: Examination = {
      ...exam,
      id: newId,
      publishedHallTickets: exam.publishedHallTickets ?? false,
      resultAnnouncementDate: exam.resultAnnouncementDate || this.getExpectedResultDate(exam),
      resultAnnouncementTime: exam.resultAnnouncementTime || '17:00'
    };

    this._exams.update(list => [enriched, ...list]);
    this.examsSync.syncUpsert(enriched);

    this.activityService.logActivity({
      user: 'Controller of Examinations',
      role: 'Examination Cell',
      module: 'Examinations',
      category: 'Exams',
      operationType: 'Create',
      action: 'Scheduled Examination',
      target: `${enriched.title} (${enriched.subjectName})`,
      recordId: newId,
      details: `${enriched.date} at ${enriched.time} · ${enriched.venue || enriched.mode}`,
      icon: 'event_note'
    });
    this.auditService.log({
      userId: 'admin',
      userName: 'Controller of Examinations',
      role: 'Examination Cell',
      module: 'Examinations',
      action: 'Create',
      target: `Scheduled ${enriched.title} on ${enriched.date}`,
      status: 'Success'
    });
    this.studentsService.showToast('success', `Exam "${exam.title}" (${exam.mode}) scheduled successfully.`);
    return { success: true };
  }

  update(id: string, exam: Omit<Examination, 'id'>): { success: boolean; error?: string } {
    const clash = this.detectConflict(exam, id);
    if (clash) {
      return { success: false, error: clash };
    }

    const prev = this._exams().find(e => e.id === id);
    const enriched: Examination = {
      ...exam,
      id,
      publishedHallTickets: exam.publishedHallTickets ?? prev?.publishedHallTickets ?? false,
      resultAnnouncementDate: exam.resultAnnouncementDate || this.getExpectedResultDate(exam),
      resultAnnouncementTime: exam.resultAnnouncementTime || '17:00'
    };

    this._exams.update(list => list.map(e => (e.id === id ? enriched : e)));
    this.examsSync.syncUpsert(enriched);

    this.activityService.logActivity({
      user: 'Controller of Examinations',
      role: 'Examination Cell',
      module: 'Examinations',
      category: 'Exams',
      operationType: 'Update',
      action: 'Updated Exam Schedule',
      target: `${enriched.title} (${enriched.subjectName})`,
      recordId: id,
      details: `${enriched.date} at ${enriched.time}`,
      icon: 'edit_calendar'
    });
    this.studentsService.showToast('success', `Exam "${exam.title}" updated successfully.`);
    return { success: true };
  }

  publishHallTickets(examId: string): void {
    const exam = this._exams().find(e => e.id === examId);
    if (!exam) return;
    const nextState = !exam.publishedHallTickets;
    const updated: Examination = { ...exam, publishedHallTickets: nextState };
    this._exams.update(list => list.map(e => (e.id === examId ? updated : e)));
    this.examsSync.syncUpsert(updated);

    if (nextState) {
      this.notificationService.add({
        title: `Hall Ticket Issued: ${exam.title}`,
        description: `Admit cards for ${exam.subjectName} (${exam.date} at ${exam.time}) are now available in the student portal.`,
        type: 'Academic',
        priority: 'High',
        icon: 'badge',
        link: '/student/examinations',
        targetRole: 'student'
      });
    }

    this.activityService.logActivity({
      user: 'Controller of Examinations',
      role: 'Examination Cell',
      module: 'Examinations',
      category: 'Exams',
      operationType: nextState ? 'Publish' : 'Update',
      action: nextState ? 'Published Exam Hall Tickets' : 'Unpublished Exam Hall Tickets',
      target: exam.title,
      recordId: examId,
      icon: 'badge'
    });
    this.studentsService.showToast(
      'success',
      nextState ? `Hall tickets published for "${exam.title}".` : `Hall tickets unpublished for "${exam.title}".`
    );
  }

  delete(id: string): void {
    const exam = this._exams().find(e => e.id === id);
    this._exams.update(list => list.filter(e => e.id !== id));
    this.examsSync.syncDelete(id);
    if (exam) {
      this.auditService.log({
        userId: 'admin',
        userName: 'Controller of Examinations',
        role: 'Examination Cell',
        module: 'Examinations',
        action: 'Delete',
        target: `Cancelled exam ${exam.title} (${exam.date})`,
        status: 'Success'
      });
      this.studentsService.showToast('info', `Exam "${exam.title}" has been removed.`);
    }
  }

  getEligibleStudentsForExam(examId: string): HallTicketStudentEntry[] {
    const exam = this.getById(examId);
    if (!exam) return [];
    const students = this.studentsService.students().filter(
      s => s.courseId === exam.courseId && s.semester === exam.semester && s.status !== 'Inactive'
    );
    const prefix = exam.seatNo ? exam.seatNo.split('-').slice(0, 2).join('-') : exam.venue?.slice(0, 4).toUpperCase() || 'HALL';

    return students.map((student, idx) => {
      const att = this.attendanceService.getStudentAttendanceStats(student.id);
      const attendanceLow = att.total > 0 && att.percentage < 75;
      return {
        student,
        seatAllocation: exam.mode === 'Online' ? `ONLINE-${String(idx + 1).padStart(2, '0')}` : `${prefix}-${String(idx + 1).padStart(2, '0')}`,
        attendancePct: att.percentage,
        eligible: !attendanceLow,
        ineligibleReason: attendanceLow ? `Attendance ${att.percentage}% (<75% required)` : undefined
      };
    });
  }

  private detectConflict(exam: Omit<Examination, 'id'>, excludeId?: string): string | null {
    const candidateStart = this.toMinutes(exam.time);
    const candidateEnd = candidateStart + exam.duration;
    const cleanVenue = (exam.venue || '').trim().toLowerCase();
    const cleanInvigilator = (exam.invigilator || '').trim().toLowerCase();

    for (const existing of this._exams()) {
      if (existing.id === excludeId || existing.date !== exam.date) continue;

      const existingStart = this.toMinutes(existing.time);
      const existingEnd = existingStart + existing.duration;
      const overlaps = candidateStart < existingEnd && existingStart < candidateEnd;
      if (!overlaps) continue;

      if (existing.courseId === exam.courseId && existing.semester === exam.semester) {
        return `Schedule clash: ${existing.title} is already scheduled for ${exam.courseName || 'this course'} (${exam.semester}) at ${existing.time}.`;
      }

      if (
        exam.mode !== 'Online' &&
        cleanVenue &&
        (existing.venue || '').trim().toLowerCase() === cleanVenue
      ) {
        return `Room clash: Venue "${exam.venue}" is already booked for "${existing.title}" (${existing.time}).`;
      }

      if (
        cleanInvigilator &&
        (existing.invigilator || '').trim().toLowerCase() === cleanInvigilator
      ) {
        return `Invigilator clash: ${exam.invigilator} is already assigned to "${existing.title}" (${existing.time}).`;
      }
    }

    return null;
  }

  private toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(n => Number(n));
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  }
}
