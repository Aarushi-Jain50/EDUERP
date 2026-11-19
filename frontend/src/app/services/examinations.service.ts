import { Injectable, signal, computed, inject } from '@angular/core';
import { AcademicService } from './academic.service';
import { StudentsService } from './students.service';

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
  duration: number; // in minutes
  maxMarks: number;
  passingMarks: number;
  venue?: string;
  seatNo?: string;
  proctored?: boolean;
  reportingMinutesBefore?: number;
  resultAnnouncementDate?: string;
  resultAnnouncementTime?: string;
  status?: ExamStatus; // Derived in component or service
}

@Injectable({ providedIn: 'root' })
export class ExaminationsService {
  private readonly academicService = inject(AcademicService);
  private readonly studentsService = inject(StudentsService);

  private _exams = signal<Examination[]>([
    {
      id: 'ex-1',
      title: 'Internal Assessment I',
      type: 'Internal',
      mode: 'Online',
      proctored: true,
      venue: 'Protected Online Exam Browser',
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
      venue: 'Block A · Hall 104',
      seatNo: 'A-104-14',
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
      venue: 'Protected Online Exam Browser',
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
      venue: 'Computing Lab 2 · Block B',
      seatNo: 'LAB2-08',
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
      venue: 'Protected Online Exam Browser',
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
      venue: 'Cloud Lab 3 / Proctored Online Browser',
      seatNo: 'CL3-12',
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
      venue: 'Central Examination Hall · Block C-204',
      seatNo: 'C-204-21',
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
      venue: 'Protected Online Exam Browser',
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
      venue: 'Block B · Hall 201',
      seatNo: 'B-201-05',
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
      venue: 'Programming Lab 1 / Online Sandbox',
      seatNo: 'PL1-19',
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
      venue: 'Main Auditorium · Hall 101',
      seatNo: 'AUD-11',
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
      venue: 'Protected Online Exam Browser',
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
      venue: 'Engineering Block D · Hall 305',
      seatNo: 'D-305-27',
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
      venue: 'Block A · Hall 102',
      seatNo: 'A-102-14',
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
      venue: 'Block A · Hall 105',
      seatNo: 'A-105-14',
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
      venue: 'Block B · Hall 203',
      seatNo: 'B-203-09',
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
      venue: 'Engineering Block D · Hall 101',
      seatNo: 'D-101-18',
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
      venue: 'Protected Online Exam Browser',
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
  ]);

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

  getExpectedResultDate(exam: Pick<Examination, 'date' | 'type' | 'resultAnnouncementDate'>): string {
    if (exam.resultAnnouncementDate) return exam.resultAnnouncementDate;
    const base = new Date(exam.date);
    if (Number.isNaN(base.getTime())) return exam.date;
    const offsetDays = exam.type === 'End-Term' ? 16 : exam.type === 'Mid-Term' ? 10 : 6;
    base.setDate(base.getDate() + offsetDays);
    return base.toISOString().split('T')[0];
  }

  getAll() { return this.exams(); }
  getById(id: string) { return this.exams().find(e => e.id === id); }
  getCompleted() { return this.exams().filter(e => e.status === 'Completed'); }

  add(exam: Omit<Examination, 'id'>): { success: boolean; error?: string } {
    if (this.isClashing(exam)) {
      return { success: false, error: 'Another exam is already scheduled for this course, semester, date and time.' };
    }
    
    const newId = `ex-${Date.now()}`;
    const enriched: Examination = {
      ...exam,
      id: newId,
      resultAnnouncementDate: exam.resultAnnouncementDate || this.getExpectedResultDate(exam),
      resultAnnouncementTime: exam.resultAnnouncementTime || '17:00'
    };
    this._exams.update(list => [...list, enriched]);
    this.studentsService.showToast('success', `Exam "${exam.title}" (${exam.mode}) scheduled successfully.`);
    return { success: true };
  }

  update(id: string, exam: Omit<Examination, 'id'>): { success: boolean; error?: string } {
    if (this.isClashing(exam, id)) {
      return { success: false, error: 'Clash detected: Another exam is already scheduled for this slot.' };
    }

    const enriched: Examination = {
      ...exam,
      id,
      resultAnnouncementDate: exam.resultAnnouncementDate || this.getExpectedResultDate(exam),
      resultAnnouncementTime: exam.resultAnnouncementTime || '17:00'
    };
    this._exams.update(list => list.map(e => e.id === id ? enriched : e));
    this.studentsService.showToast('success', `Exam "${exam.title}" updated successfully.`);
    return { success: true };
  }

  delete(id: string): void {
    const exam = this._exams().find(e => e.id === id);
    this._exams.update(list => list.filter(e => e.id !== id));
    if (exam) {
      this.studentsService.showToast('info', `Exam "${exam.title}" has been removed.`);
    }
  }

  private isClashing(exam: Omit<Examination, 'id'>, excludeId?: string): boolean {
    return this._exams().some(e => 
      e.id !== excludeId &&
      e.courseId === exam.courseId &&
      e.semester === exam.semester &&
      e.date === exam.date &&
      e.time === exam.time
    );
  }
}
