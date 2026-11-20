import { Injectable, PLATFORM_ID, signal, inject, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StudentsService } from './students.service';
import { ExaminationsService } from './examinations.service';
import { NotificationService } from './notification.service';
import { getGrade } from '../utils/grade-scale.helper';

export type ResultStatus =
  | 'Draft'
  | 'Submitted for Approval'
  | 'Approved'
  | 'Published'
  | 'Revision Requested';

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
  status: ResultStatus;
  submittedBy?: string;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvalNote?: string;
}

const RESULTS_STORAGE_KEY = 'eduerp_exam_results_v1';

const SEED_RESULTS: ResultRecord[] = [
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
];

@Injectable({ providedIn: 'root' })
export class ResultsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly studentsService = inject(StudentsService);
  private readonly examService = inject(ExaminationsService);
  private readonly notificationService = inject(NotificationService);

  private _results = signal<ResultRecord[]>(this.loadStoredResults());

  readonly results = this._results.asReadonly();

  // Computed stats
  readonly publishedCount = computed(() => this._results().filter(r => r.status === 'Published').length);
  readonly pendingApprovalCount = computed(
    () => this._results().filter(r => r.status === 'Submitted for Approval').length
  );
  readonly toppers = computed(() => {
    // Basic logic to find top performers across published results
    return this._results()
      .filter(r => r.status === 'Published')
      .sort((a, b) => (b.marksObtained / b.maxMarks) - (a.marksObtained / a.maxMarks))
      .slice(0, 5);
  });

  private loadStoredResults(): ResultRecord[] {
    if (!isPlatformBrowser(this.platformId)) return SEED_RESULTS;
    try {
      const raw = localStorage.getItem(RESULTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ResultRecord[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore corrupted storage
    }
    return SEED_RESULTS;
  }

  private persistResults(list: ResultRecord[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ignore storage errors
    }
  }

  getResultsByExam(examId: string) {
    return this._results().filter(r => r.examId === examId);
  }

  getExamApprovalStatus(examId: string): ResultStatus | 'Not Entered' {
    const list = this.getResultsByExam(examId);
    if (list.length === 0) return 'Not Entered';
    if (list.every(r => r.status === 'Published')) return 'Published';
    if (list.some(r => r.status === 'Submitted for Approval')) return 'Submitted for Approval';
    if (list.some(r => r.status === 'Revision Requested')) return 'Revision Requested';
    if (list.some(r => r.status === 'Approved')) return 'Approved';
    return 'Draft';
  }

  saveResults(examId: string, marks: { studentId: string; marks: number; remarks: string }[]): void {
    const exam = this.examService.getById(examId);
    if (!exam) return;

    const existing = this.getResultsByExam(examId);
    const prevByStudent = new Map(existing.map(r => [r.studentId, r]));

    const newRecords: ResultRecord[] = marks.map(m => {
      const student = this.studentsService.students().find(s => s.id === m.studentId);
      const percentage = (m.marks / exam.maxMarks) * 100;
      const grade = getGrade(percentage).grade;
      const prev = prevByStudent.get(m.studentId);

      return {
        id: prev?.id || `res-${Date.now()}-${m.studentId}`,
        examId,
        studentId: m.studentId,
        studentName: student?.name || 'Unknown',
        enrollmentNo: student?.enrollmentNo || 'N/A',
        marksObtained: m.marks,
        maxMarks: exam.maxMarks,
        grade,
        remarks: m.remarks,
        status: prev?.status === 'Published' ? 'Published' : 'Draft',
        ...(prev?.submittedBy ? { submittedBy: prev.submittedBy } : {}),
        ...(prev?.submittedAt ? { submittedAt: prev.submittedAt } : {}),
        ...(prev?.approvalNote ? { approvalNote: prev.approvalNote } : {})
      };
    });

    this._results.update(list => {
      const filtered = list.filter(r => r.examId !== examId);
      const next = [...filtered, ...newRecords];
      this.persistResults(next);
      return next;
    });

    this.studentsService.showToast('success', `Marks for "${exam.title}" saved as draft.`);
  }

  submitForApproval(examId: string, submittedBy: string, note = ''): void {
    const exam = this.examService.getById(examId);
    if (!exam) return;

    const nowIso = new Date().toISOString();
    const cleanNote = note.trim();

    this._results.update(list => {
      const next = list.map(r =>
        r.examId === examId && r.status !== 'Published'
          ? {
              ...r,
              status: 'Submitted for Approval' as ResultStatus,
              submittedBy,
              submittedAt: nowIso,
              ...(cleanNote ? { approvalNote: cleanNote } : {})
            }
          : r
      );
      this.persistResults(next);
      return next;
    });

    this.notificationService.add({
      title: `Result approval pending: ${exam.title}`,
      description: `${submittedBy} submitted ${exam.subjectName} marks for Examination Cell approval.`,
      type: 'Academic',
      priority: 'High',
      icon: 'fact_check',
      link: '/admin/results',
      targetRole: 'admin'
    });

    this.studentsService.showToast(
      'success',
      `Results for "${exam.title}" submitted for Examination Cell approval.`
    );
  }

  approveAndPublishResults(examId: string, reviewedBy: string, note = ''): void {
    const exam = this.examService.getById(examId);
    const nowIso = new Date().toISOString();
    const cleanNote = note.trim();

    this._results.update(list => {
      const next = list.map(r =>
        r.examId === examId
          ? {
              ...r,
              status: 'Published' as ResultStatus,
              reviewedBy,
              reviewedAt: nowIso,
              ...(cleanNote ? { approvalNote: cleanNote } : {})
            }
          : r
      );
      this.persistResults(next);
      return next;
    });

    if (exam) {
      this.notificationService.add({
        title: `Results approved & published: ${exam.title}`,
        description: `${exam.subjectName} results approved by ${reviewedBy} are now live on student & parent portals.`,
        type: 'Academic',
        priority: 'Medium',
        icon: 'verified',
        link: '/faculty/results-marks',
        targetRole: 'faculty'
      });
    }

    this.studentsService.showToast('success', 'Results approved and published to student portals.');
  }

  returnResultsForRevision(examId: string, reviewedBy: string, reason: string): void {
    const exam = this.examService.getById(examId);
    const nowIso = new Date().toISOString();
    const cleanReason = reason.trim() || 'Please verify borderline scores and resubmit.';

    this._results.update(list => {
      const next = list.map(r =>
        r.examId === examId && r.status !== 'Published'
          ? {
              ...r,
              status: 'Revision Requested' as ResultStatus,
              reviewedBy,
              reviewedAt: nowIso,
              approvalNote: cleanReason
            }
          : r
      );
      this.persistResults(next);
      return next;
    });

    if (exam) {
      this.notificationService.add({
        title: `Result revision requested: ${exam.title}`,
        description: `${reviewedBy}: ${cleanReason}`,
        type: 'Academic',
        priority: 'High',
        icon: 'assignment_return',
        link: '/faculty/results-marks',
        targetRole: 'faculty'
      });
    }

    this.studentsService.showToast('warning', 'Results returned to faculty for revision.');
  }

  publishResults(examId: string): void {
    this.approveAndPublishResults(examId, 'Controller of Examinations');
  }

  deleteResults(examId: string): void {
    this._results.update(list => {
      const next = list.filter(r => r.examId !== examId);
      this.persistResults(next);
      return next;
    });
  }
}
