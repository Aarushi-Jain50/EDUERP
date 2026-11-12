import { Injectable, signal, computed, inject } from '@angular/core';
import { AcademicService } from './academic.service';
import { StudentsService } from './students.service';

export type ExamType = 'Internal' | 'Mid-Term' | 'End-Term' | 'Practical';
export type ExamStatus = 'Scheduled' | 'Ongoing' | 'Completed';

export interface Examination {
  id: string;
  title: string;
  type: ExamType;
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
    }
    // ... adding more to reach ~15 in implementation if needed, but let's stick to core functionality first
  ]);

  readonly exams = computed(() => {
    const now = new Date();
    return this._exams().map(e => {
      const examDate = new Date(`${e.date}T${e.time}`);
      const endDate = new Date(examDate.getTime() + e.duration * 60000);
      
      let status: ExamStatus = 'Scheduled';
      if (now > endDate) status = 'Completed';
      else if (now >= examDate && now <= endDate) status = 'Ongoing';
      
      return { ...e, status };
    });
  });

  getAll() { return this.exams(); }
  getById(id: string) { return this.exams().find(e => e.id === id); }
  getCompleted() { return this.exams().filter(e => e.status === 'Completed'); }

  add(exam: Omit<Examination, 'id'>): { success: boolean; error?: string } {
    if (this.isClashing(exam)) {
      return { success: false, error: 'Another exam is already scheduled for this course, semester, date and time.' };
    }
    
    const newId = `ex-${Date.now()}`;
    this._exams.update(list => [...list, { ...exam, id: newId }]);
    this.studentsService.showToast('success', `Exam "${exam.title}" scheduled successfully.`);
    return { success: true };
  }

  update(id: string, exam: Omit<Examination, 'id'>): { success: boolean; error?: string } {
    if (this.isClashing(exam, id)) {
      return { success: false, error: 'Clash detected: Another exam is already scheduled for this slot.' };
    }

    this._exams.update(list => list.map(e => e.id === id ? { ...exam, id } : e));
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
