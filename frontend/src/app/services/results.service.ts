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
    },
    {
      id: 'res-6',
      examId: 'ex-3',
      studentId: 'stu-1',
      studentName: 'Rahul Verma',
      enrollmentNo: 'MCA-2025-001',
      marksObtained: 41,
      maxMarks: 50,
      grade: 'A+',
      remarks: 'Strong architectural concepts',
      status: 'Published'
    },
    {
      id: 'res-7',
      examId: 'ex-8',
      studentId: 'stu-1',
      studentName: 'Rahul Verma',
      enrollmentNo: 'MCA-2025-001',
      marksObtained: 16,
      maxMarks: 20,
      grade: 'A+',
      remarks: 'Consistent lab and test work',
      status: 'Published'
    },
    {
      id: 'res-8',
      examId: 'ex-6',
      studentId: 'stu-1',
      studentName: 'Rahul Verma',
      enrollmentNo: 'MCA-2025-001',
      marksObtained: 21,
      maxMarks: 25,
      grade: 'A+',
      remarks: 'Unpublished evaluation draft',
      status: 'Draft'
    },
    {
      id: 'res-9',
      examId: 'ex-3',
      studentId: 'stu-2',
      studentName: 'Ananya Sharma',
      enrollmentNo: 'MCA-2025-002',
      marksObtained: 44,
      maxMarks: 50,
      grade: 'O',
      remarks: 'Top scorer in design patterns',
      status: 'Published'
    },
    {
      id: 'res-10',
      examId: 'ex-4',
      studentId: 'stu-2',
      studentName: 'Ananya Sharma',
      enrollmentNo: 'MCA-2025-002',
      marksObtained: 46,
      maxMarks: 50,
      grade: 'O',
      remarks: 'Well structured full stack demo',
      status: 'Published'
    },
    {
      id: 'res-11',
      examId: 'ex-8',
      studentId: 'stu-2',
      studentName: 'Ananya Sharma',
      enrollmentNo: 'MCA-2025-002',
      marksObtained: 18,
      maxMarks: 20,
      grade: 'O',
      remarks: 'Strong DevOps concepts',
      status: 'Published'
    },
    {
      id: 'res-12',
      examId: 'ex-9',
      studentId: 'stu-3',
      studentName: 'Priyanshu Das',
      enrollmentNo: 'BCA-2025-014',
      marksObtained: 39,
      maxMarks: 50,
      grade: 'A',
      remarks: 'Good SQL query optimization',
      status: 'Published'
    },
    {
      id: 'res-13',
      examId: 'ex-10',
      studentId: 'stu-3',
      studentName: 'Priyanshu Das',
      enrollmentNo: 'BCA-2025-014',
      marksObtained: 42,
      maxMarks: 50,
      grade: 'A+',
      remarks: 'Clean Java OOP implementation',
      status: 'Published'
    },
    {
      id: 'res-14',
      examId: 'ex-12',
      studentId: 'stu-4',
      studentName: 'Meera Patel',
      enrollmentNo: 'CSE-2023-088',
      marksObtained: 43,
      maxMarks: 50,
      grade: 'A+',
      remarks: 'Clear explanation of scheduling',
      status: 'Published'
    },
    {
      id: 'res-15',
      examId: 'ex-3',
      studentId: 'stu-5',
      studentName: 'Rohan Kulkarni',
      enrollmentNo: 'MCA-2025-005',
      marksObtained: 37,
      maxMarks: 50,
      grade: 'A',
      remarks: 'Good effort',
      status: 'Published'
    },
    {
      id: 'res-16',
      examId: 'ex-4',
      studentId: 'stu-5',
      studentName: 'Rohan Kulkarni',
      enrollmentNo: 'MCA-2025-005',
      marksObtained: 41,
      maxMarks: 50,
      grade: 'A+',
      remarks: 'Solid practical work',
      status: 'Published'
    },
    {
      id: 'res-17',
      examId: 'ex-14',
      studentId: 'stu-1',
      studentName: 'Rahul Verma',
      enrollmentNo: 'MCA-2025-001',
      marksObtained: 84,
      maxMarks: 100,
      grade: 'A+',
      remarks: 'Strong algorithmic foundations',
      status: 'Published'
    },
    {
      id: 'res-18',
      examId: 'ex-15',
      studentId: 'stu-1',
      studentName: 'Rahul Verma',
      enrollmentNo: 'MCA-2025-001',
      marksObtained: 78,
      maxMarks: 100,
      grade: 'A',
      remarks: 'Very good SQL & normalization skills',
      status: 'Published'
    },
    {
      id: 'res-19',
      examId: 'ex-14',
      studentId: 'stu-2',
      studentName: 'Ananya Sharma',
      enrollmentNo: 'MCA-2025-002',
      marksObtained: 91,
      maxMarks: 100,
      grade: 'O',
      remarks: 'Top rank in Semester 1',
      status: 'Published'
    },
    {
      id: 'res-20',
      examId: 'ex-15',
      studentId: 'stu-5',
      studentName: 'Rohan Kulkarni',
      enrollmentNo: 'MCA-2025-005',
      marksObtained: 72,
      maxMarks: 100,
      grade: 'A',
      remarks: 'Good relational schema work',
      status: 'Published'
    },
    {
      id: 'res-21',
      examId: 'ex-16',
      studentId: 'stu-3',
      studentName: 'Priyanshu Das',
      enrollmentNo: 'BCA-2025-014',
      marksObtained: 81,
      maxMarks: 100,
      grade: 'A+',
      remarks: 'Consistent performance',
      status: 'Published'
    },
    {
      id: 'res-22',
      examId: 'ex-17',
      studentId: 'stu-4',
      studentName: 'Meera Patel',
      enrollmentNo: 'CSE-2023-088',
      marksObtained: 88,
      maxMarks: 100,
      grade: 'A+',
      remarks: 'Excellent mathematical rigor',
      status: 'Published'
    },
    {
      id: 'res-23',
      examId: 'ex-16',
      studentId: 'stu-21',
      studentName: 'Aanya Verma',
      enrollmentNo: 'BCA-2025-032',
      marksObtained: 86,
      maxMarks: 100,
      grade: 'A+',
      remarks: 'Strong foundation in computing concepts',
      status: 'Published'
    },
    {
      id: 'res-24',
      examId: 'ex-9',
      studentId: 'stu-21',
      studentName: 'Aanya Verma',
      enrollmentNo: 'BCA-2025-032',
      marksObtained: 44,
      maxMarks: 50,
      grade: 'O',
      remarks: 'Excellent relational schema design',
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
