import { Injectable, signal, inject, computed } from '@angular/core';
import { StudentsService } from './students.service';
import { ExaminationsService } from './examinations.service';
import { getGrade } from '../utils/grade-scale.helper';

export interface ResultRecord {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  enrollmentNo: string;
  marksObtained: number;
  maxMarks: number;
  grade: string;
  remarks: string;
  status: 'Draft' | 'Published';
}

@Injectable({ providedIn: 'root' })
export class ResultsService {
  private readonly studentsService = inject(StudentsService);
  private readonly examService = inject(ExaminationsService);

  private _results = signal<ResultRecord[]>([
    {
      id: 'res-1',
      examId: 'ex-2', // End-Term Theory Exam
      studentId: 'stu-1',
      studentName: 'Rahul Verma',
      enrollmentNo: 'MCA-2025-001',
      marksObtained: 62,
      maxMarks: 70,
      grade: 'A+',
      remarks: 'Excellent performance',
      status: 'Published'
    },
    {
      id: 'res-2',
      examId: 'ex-2',
      studentId: 'stu-2',
      studentName: 'Ananya Sharma',
      enrollmentNo: 'MCA-2025-002',
      marksObtained: 58,
      maxMarks: 70,
      grade: 'A',
      remarks: 'Very Good',
      status: 'Published'
    },
    {
      id: 'res-3',
      examId: 'ex-4', // Practical Viva
      studentId: 'stu-1',
      studentName: 'Rahul Verma',
      enrollmentNo: 'MCA-2025-001',
      marksObtained: 45,
      maxMarks: 50,
      grade: 'O',
      remarks: 'Outstanding practical knowledge',
      status: 'Published'
    },
    {
      id: 'res-4',
      examId: 'ex-2',
      studentId: 'stu-3',
      studentName: 'Vikram Aditya',
      enrollmentNo: 'MCA-2025-003',
      marksObtained: 45,
      maxMarks: 70,
      grade: 'B+',
      remarks: 'Needs improvement',
      status: 'Published'
    },
    {
      id: 'res-5',
      examId: 'ex-2',
      studentId: 'stu-4',
      studentName: 'Sneha Kapur',
      enrollmentNo: 'MCA-2025-004',
      marksObtained: 68,
      maxMarks: 70,
      grade: 'O',
      remarks: 'Brilliant',
      status: 'Published'
    }
  ]);

  readonly results = this._results.asReadonly();

  // Computed stats
  readonly publishedCount = computed(() => this._results().filter(r => r.status === 'Published').length);
  readonly toppers = computed(() => {
    // Basic logic to find top performers across published results
    return this._results()
      .filter(r => r.status === 'Published')
      .sort((a, b) => (b.marksObtained / b.maxMarks) - (a.marksObtained / a.maxMarks))
      .slice(0, 5);
  });

  getResultsByExam(examId: string) {
    return this._results().filter(r => r.examId === examId);
  }

  saveResults(examId: string, marks: { studentId: string, marks: number, remarks: string }[]): void {
    const exam = this.examService.getById(examId);
    if (!exam) return;

    const newRecords: ResultRecord[] = marks.map(m => {
      const student = this.studentsService.students().find(s => s.id === m.studentId);
      const percentage = (m.marks / exam.maxMarks) * 100;
      const grade = getGrade(percentage).grade;

      return {
        id: `res-${Date.now()}-${m.studentId}`,
        examId,
        studentId: m.studentId,
        studentName: student?.name || 'Unknown',
        enrollmentNo: student?.enrollmentNo || 'N/A',
        marksObtained: m.marks,
        maxMarks: exam.maxMarks,
        grade,
        remarks: m.remarks,
        status: 'Draft'
      };
    });

    // Replace or add new records
    this._results.update(list => {
      const filtered = list.filter(r => r.examId !== examId);
      return [...filtered, ...newRecords];
    });

    this.studentsService.showToast('success', `Results for "${exam.title}" saved as draft.`);
  }

  publishResults(examId: string): void {
    this._results.update(list => list.map(r => 
      r.examId === examId ? { ...r, status: 'Published' } : r
    ));
    this.studentsService.showToast('success', 'Results published successfully and visible to students.');
  }

  deleteResults(examId: string): void {
    this._results.update(list => list.filter(r => r.examId !== examId));
  }
}
