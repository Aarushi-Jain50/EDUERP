import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StudentsService } from './students.service';
import { ExaminationsService } from './examinations.service';
import { NotificationService } from './notification.service';
import { ActivityService } from './activity.service';
import { AuditService } from './audit.service';
import { FirestoreCollectionSync } from '../lib/firestore-collection-sync';
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
  locked?: boolean;
  submittedBy?: string;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvalNote?: string;
}

export interface ExamResultSummary {
  totalStudents: number;
  passCount: number;
  failCount: number;
  passPercentage: number;
  avgPercentage: number;
  highestScore: number;
  maxMarks: number;
  isLocked: boolean;
  gradeDistribution: Record<string, number>;
}

const RESULTS_STORAGE_KEY = 'eduerp_exam_results_v1';

const SEED_RESULTS: ResultRecord[] = [
  {
    id: 'res-1',
    examId: 'ex-2',
    studentId: 'stu-1',
    studentName: 'Rahul Verma',
    enrollmentNo: 'MCA-2025-001',
    marksObtained: 62,
    maxMarks: 70,
    grade: 'A+',
    remarks: 'Excellent performance',
    status: 'Published',
    locked: true
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
    status: 'Published',
    locked: true
  },
  {
    id: 'res-3',
    examId: 'ex-4',
    studentId: 'stu-1',
    studentName: 'Rahul Verma',
    enrollmentNo: 'MCA-2025-001',
    marksObtained: 45,
    maxMarks: 50,
    grade: 'O',
    remarks: 'Outstanding practical knowledge',
    status: 'Published',
    locked: true
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
    status: 'Published',
    locked: true
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
    status: 'Published',
    locked: true
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
    status: 'Published',
    locked: true
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
    status: 'Published',
    locked: true
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
  private readonly activityService = inject(ActivityService);
  private readonly auditService = inject(AuditService);

  private readonly _results = signal<ResultRecord[]>([]);
  private readonly resultsSync = new FirestoreCollectionSync<ResultRecord>(
    'examResults',
    RESULTS_STORAGE_KEY,
    this._results,
    isPlatformBrowser(this.platformId)
  );

  readonly results = this._results.asReadonly();

  readonly publishedCount = computed(() => this._results().filter(r => r.status === 'Published').length);
  readonly pendingApprovalCount = computed(
    () => this._results().filter(r => r.status === 'Submitted for Approval').length
  );
  readonly toppers = computed(() =>
    this._results()
      .filter(r => r.status === 'Published')
      .sort((a, b) => b.marksObtained / Math.max(1, b.maxMarks) - a.marksObtained / Math.max(1, a.maxMarks))
      .slice(0, 5)
  );

  constructor() {
    this._results.set(this.resultsSync.loadInitial(SEED_RESULTS));
    this.resultsSync.startSync();
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

  isExamLocked(examId: string): boolean {
    const list = this.getResultsByExam(examId);
    return list.length > 0 && list.every(r => r.locked === true);
  }

  getExamSummary(examId: string): ExamResultSummary {
    const list = examId === 'All' ? this._results() : this.getResultsByExam(examId);
    const exam = examId === 'All' ? undefined : this.examService.getById(examId);
    const totalStudents = list.length;
    const dist: Record<string, number> = { O: 0, 'A+': 0, A: 0, 'B+': 0, B: 0, C: 0, P: 0, F: 0 };

    if (totalStudents === 0) {
      return {
        totalStudents: 0,
        passCount: 0,
        failCount: 0,
        passPercentage: 0,
        avgPercentage: 0,
        highestScore: 0,
        maxMarks: exam?.maxMarks || 100,
        isLocked: false,
        gradeDistribution: dist
      };
    }

    let passCount = 0;
    let pctSum = 0;
    let highestScore = 0;

    for (const r of list) {
      const linkedExam = exam || this.examService.getById(r.examId);
      const passMarks = linkedExam ? linkedExam.passingMarks : Math.round(r.maxMarks * 0.4);
      if (r.marksObtained >= passMarks && r.grade !== 'F') passCount++;
      pctSum += r.maxMarks > 0 ? (r.marksObtained / r.maxMarks) * 100 : 0;
      if (r.marksObtained > highestScore) highestScore = r.marksObtained;
      dist[r.grade] = (dist[r.grade] || 0) + 1;
    }

    return {
      totalStudents,
      passCount,
      failCount: totalStudents - passCount,
      passPercentage: Math.round((passCount / totalStudents) * 100),
      avgPercentage: Math.round(pctSum / totalStudents),
      highestScore,
      maxMarks: exam?.maxMarks || list[0].maxMarks,
      isLocked: list.every(r => r.locked === true),
      gradeDistribution: dist
    };
  }

  getStudentCgpaSummary(studentId: string): { cgpa: number; avgPct: number; examsCount: number } {
    const published = this._results().filter(r => r.studentId === studentId && r.status === 'Published');
    if (published.length === 0) return { cgpa: 0, avgPct: 0, examsCount: 0 };

    const pcts = published.map(r => (r.maxMarks > 0 ? (r.marksObtained / r.maxMarks) * 100 : 0));
    const avgPct = Math.round(pcts.reduce((s, v) => s + v, 0) / pcts.length);
    const points = published.reduce((sum, r) => sum + this.gradeToPoints(r.grade), 0);
    return {
      cgpa: Number((points / published.length).toFixed(2)),
      avgPct,
      examsCount: published.length
    };
  }

  saveResults(examId: string, marks: { studentId: string; marks: number; remarks: string }[]): void {
    const exam = this.examService.getById(examId);
    if (!exam) return;

    if (this.isExamLocked(examId)) {
      this.studentsService.showToast('error', `Results for "${exam.title}" are moderation-locked.`);
      return;
    }

    const existing = this.getResultsByExam(examId);
    const prevByStudent = new Map(existing.map(r => [r.studentId, r]));

    const newRecords: ResultRecord[] = marks.map(m => {
      const student = this.studentsService.students().find(s => s.id === m.studentId);
      const boundedMarks = Math.max(0, Math.min(exam.maxMarks, Number(m.marks) || 0));
      const percentage = (boundedMarks / Math.max(1, exam.maxMarks)) * 100;
      const grade = getGrade(percentage).grade;
      const prev = prevByStudent.get(m.studentId);

      return {
        id: prev?.id || `res-${Date.now()}-${m.studentId}`,
        examId,
        studentId: m.studentId,
        studentName: student?.name || 'Unknown',
        enrollmentNo: student?.enrollmentNo || 'N/A',
        marksObtained: boundedMarks,
        maxMarks: exam.maxMarks,
        grade,
        remarks: m.remarks || (boundedMarks >= exam.passingMarks ? 'Passed' : 'Requires Remedial Review'),
        status: prev?.status === 'Published' ? 'Published' : 'Draft',
        locked: prev?.locked ?? false,
        ...(prev?.submittedBy ? { submittedBy: prev.submittedBy } : {}),
        ...(prev?.submittedAt ? { submittedAt: prev.submittedAt } : {}),
        ...(prev?.approvalNote ? { approvalNote: prev.approvalNote } : {})
      };
    });

    this._results.update(list => [...list.filter(r => r.examId !== examId), ...newRecords]);
    for (const rec of newRecords) {
      this.resultsSync.syncUpsert(rec);
    }

    this.activityService.logActivity({
      user: 'Examination Cell',
      role: 'Controller of Examinations',
      module: 'Results & Grades',
      category: 'Exams',
      operationType: 'Update',
      action: 'Saved Examination Marks',
      target: `${exam.title} (${newRecords.length} students)`,
      recordId: examId,
      icon: 'grading'
    });
    this.studentsService.showToast('success', `Marks for "${exam.title}" saved.`);
  }

  submitForApproval(examId: string, submittedBy: string, note = ''): void {
    const exam = this.examService.getById(examId);
    if (!exam) return;

    const nowIso = new Date().toISOString();
    const cleanNote = note.trim();
    const updatedRows: ResultRecord[] = [];

    this._results.update(list =>
      list.map(r => {
        if (r.examId === examId && r.status !== 'Published') {
          const next: ResultRecord = {
            ...r,
            status: 'Submitted for Approval',
            submittedBy,
            submittedAt: nowIso,
            ...(cleanNote ? { approvalNote: cleanNote } : {})
          };
          updatedRows.push(next);
          return next;
        }
        return r;
      })
    );
    for (const r of updatedRows) this.resultsSync.syncUpsert(r);

    this.notificationService.add({
      title: `Result approval pending: ${exam.title}`,
      description: `${submittedBy} submitted ${exam.subjectName} marks for Examination Cell approval.`,
      type: 'Academic',
      priority: 'High',
      icon: 'fact_check',
      link: '/admin/results',
      targetRole: 'admin'
    });

    this.studentsService.showToast('success', `Results for "${exam.title}" submitted for Examination Cell approval.`);
  }

  approveAndPublishResults(examId: string, reviewedBy: string, note = ''): void {
    const exam = this.examService.getById(examId);
    const nowIso = new Date().toISOString();
    const cleanNote = note.trim();
    const updatedRows: ResultRecord[] = [];

    this._results.update(list =>
      list.map(r => {
        if (r.examId === examId) {
          const next: ResultRecord = {
            ...r,
            status: 'Published',
            reviewedBy,
            reviewedAt: nowIso,
            ...(cleanNote ? { approvalNote: cleanNote } : {})
          };
          updatedRows.push(next);
          return next;
        }
        return r;
      })
    );
    for (const r of updatedRows) this.resultsSync.syncUpsert(r);

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

      this.activityService.logActivity({
        user: reviewedBy,
        role: 'Controller of Examinations',
        module: 'Results & Grades',
        category: 'Exams',
        operationType: 'Publish',
        action: 'Approved & Published Exam Results',
        target: `${exam.title} (${updatedRows.length} records)`,
        recordId: examId,
        details: `Reviewed by ${reviewedBy}`,
        icon: 'verified'
      });
      this.auditService.log({
        userId: 'admin',
        userName: reviewedBy,
        role: 'Controller of Examinations',
        module: 'Results & Grades',
        action: 'Update',
        target: `Published ${exam.title} results`,
        status: 'Success'
      });
    }

    this.studentsService.showToast('success', 'Results approved and published to student portals.');
  }

  returnResultsForRevision(examId: string, reviewedBy: string, reason: string): void {
    const exam = this.examService.getById(examId);
    const nowIso = new Date().toISOString();
    const cleanReason = reason.trim() || 'Please verify borderline scores and resubmit.';
    const updatedRows: ResultRecord[] = [];

    this._results.update(list =>
      list.map(r => {
        if (r.examId === examId && r.status !== 'Published') {
          const next: ResultRecord = {
            ...r,
            status: 'Revision Requested',
            reviewedBy,
            reviewedAt: nowIso,
            approvalNote: cleanReason
          };
          updatedRows.push(next);
          return next;
        }
        return r;
      })
    );
    for (const r of updatedRows) this.resultsSync.syncUpsert(r);

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
      this.auditService.log({
        userId: 'admin',
        userName: reviewedBy,
        role: 'Controller of Examinations',
        module: 'Results & Grades',
        action: 'Update',
        target: `Returned ${exam.title} for revision: ${cleanReason}`,
        status: 'Success'
      });
    }

    this.studentsService.showToast('warning', 'Results returned to faculty for revision.');
  }

  toggleModerationLock(examId: string, reviewer: string): void {
    const list = this.getResultsByExam(examId);
    if (list.length === 0) return;
    const nextLocked = !this.isExamLocked(examId);
    const updatedRows: ResultRecord[] = [];

    this._results.update(all =>
      all.map(r => {
        if (r.examId === examId) {
          const next = { ...r, locked: nextLocked, reviewedBy: reviewer };
          updatedRows.push(next);
          return next;
        }
        return r;
      })
    );
    for (const r of updatedRows) this.resultsSync.syncUpsert(r);

    const examTitle = this.examService.getById(examId)?.title || examId;
    this.auditService.log({
      userId: 'admin',
      userName: reviewer,
      role: 'Controller of Examinations',
      module: 'Results & Grades',
      action: 'Update',
      target: `${nextLocked ? 'Moderation locked' : 'Unlocked'} results for ${examTitle}`,
      status: 'Success'
    });
    this.studentsService.showToast(
      'info',
      `Moderation lock ${nextLocked ? 'enabled' : 'removed'} for "${examTitle}".`
    );
  }

  publishResults(examId: string): void {
    this.approveAndPublishResults(examId, 'Controller of Examinations');
  }

  deleteResults(examId: string): void {
    const toDelete = this.getResultsByExam(examId);
    this._results.update(list => list.filter(r => r.examId !== examId));
    for (const r of toDelete) this.resultsSync.syncDelete(r.id);
    this.auditService.log({
      userId: 'admin',
      userName: 'Administrator',
      role: 'Controller of Examinations',
      module: 'Results & Grades',
      action: 'Delete',
      target: `Removed ${toDelete.length} result records for ${examId}`,
      status: 'Success'
    });
  }

  private gradeToPoints(grade: string): number {
    switch (grade) {
      case 'O': return 10;
      case 'A+': return 9;
      case 'A': return 8;
      case 'B+': return 7;
      case 'B': return 6;
      case 'C': return 5;
      case 'P': return 4;
      default: return 0;
    }
  }
}
