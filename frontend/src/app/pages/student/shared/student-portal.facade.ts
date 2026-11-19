import { Injectable, inject, computed } from '@angular/core';
import { CurrentUserService } from '../../../services/current-user.service';
import { AcademicService, SubjectRecord } from '../../../services/academic.service';
import { TimetableService } from '../../../services/timetable.service';
import { AttendanceService } from '../../../services/attendance.service';
import { AssignmentsService, Assignment, AssignmentSubmission } from '../../../services/assignments.service';
import { ExaminationsService, Examination } from '../../../services/examinations.service';
import { ResultsService, ResultRecord } from '../../../services/results.service';
import { FinanceService } from '../../../services/finance.service';
import { SettingsService } from '../../../services/settings.service';
import { StudentFirebaseService } from '../../../services/student-firebase.service';
import { Student } from '../../../models/student.model';
import { Payment } from '../../../models/finance.model';
import { getGrade } from '../../../utils/grade-scale.helper';
import { formatCurrency } from '../../../utils/money.helper';

export interface StudentSubjectDetail {
  id: string;
  code: string;
  name: string;
  type: 'Theory' | 'Practical' | 'Elective';
  credits: number;
  faculty: string;
  weeklyHours: number;
  attended: number;
  held: number;
  attendancePercentage: number;
  isLowAttendance: boolean;
  marksSoFar: {
    examTitle: string;
    marksObtained: number;
    maxMarks: number;
    percentage: number;
    grade: string;
  }[];
  upcomingExams: {
    id: string;
    title: string;
    mode: Examination['mode'];
    date: string;
    time: string;
    maxMarks: number;
    resultAnnouncementDate: string;
    resultAnnouncementTime: string;
  }[];
  pendingAssignments: {
    id: string;
    title: string;
    dueDate: string;
    dueText: string;
    status: string;
  }[];
}

export interface StudentAttendanceDayRecord {
  sessionId: string;
  date: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  status: 'Present' | 'Absent' | 'Leave';
}

export interface StudentSubjectAttendance {
  subjectId: string;
  code: string;
  name: string;
  held: number;
  attended: number;
  absent: number;
  leave: number;
  percentage: number;
  isLow: boolean;
}

export interface StudentAssignmentItem {
  assignment: Assignment;
  subjectCode: string;
  facultyName: string;
  bucket: 'Pending' | 'Submitted' | 'Overdue';
  displayStatus: 'Pending' | 'Overdue' | 'Draft' | 'Submitted' | 'Late' | 'Evaluated';
  dueText: string;
  isOverdue: boolean;
  submission: AssignmentSubmission | null;
  submittedOn?: string;
  submissionNote?: string;
  attachmentsCount: number;
  version: number;
  marksObtained?: number;
  evaluationFeedback?: string;
  evaluatedBy?: string;
  evaluatedAt?: string;
  totalQuestions: number;
  answeredQuestions: number;
}

export interface StudentExamItem {
  exam: Examination;
  subjectCode: string;
  dayNumber: string;
  monthShort: string;
  countdownLabel: string;
  daysUntil: number;
  hasPublishedResult: boolean;
  resultAnnouncementDate: string;
  resultAnnouncementTime: string;
  resultCountdownLabel: string;
}

export interface StudentResultAnnouncementItem {
  exam: Examination;
  subjectCode: string;
  resultAnnouncementDate: string;
  resultAnnouncementTime: string;
  countdownLabel: string;
  daysUntilAnnouncement: number;
  hasAttemptSubmitted: boolean;
  stageLabel: 'Scheduled Exam' | 'Online Paper Submitted' | 'Evaluation in Progress';
}

export interface StudentResultItem {
  record: ResultRecord;
  examTitle: string;
  examDate: string;
  resultAnnouncementDate: string;
  resultAnnouncementTime: string;
  semester: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  credits: number;
  percentage: number;
  grade: string;
  gradePoint: number;
  passed: boolean;
}

export interface StudentInstallmentRow {
  installmentId: string;
  label: string;
  dueDate: string;
  amount: number;
  paid: number;
  concession: number;
  lateFine: number;
  balance: number;
  displayStatus: 'Paid' | 'Pending' | 'Overdue';
}

export interface StudentFeeSummaryView {
  totalFee: number;
  paidAmount: number;
  dueAmount: number;
  paidPercent: number;
  nextDueDate: string | null;
  academicYear: string;
  lateFinePerDay: number;
  feeHeads: { id: string; name: string; amount: number; installmentLabel: string }[];
  installmentRows: StudentInstallmentRow[];
}

@Injectable({ providedIn: 'root' })
export class StudentPortalFacade {
  private readonly userService = inject(CurrentUserService);
  private readonly academicService = inject(AcademicService);
  private readonly timetableService = inject(TimetableService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly assignmentsService = inject(AssignmentsService);
  private readonly examinationsService = inject(ExaminationsService);
  private readonly resultsService = inject(ResultsService);
  private readonly financeService = inject(FinanceService);
  private readonly settingsService = inject(SettingsService);
  private readonly firebaseService = inject(StudentFirebaseService);

  readonly currentStudent = this.userService.currentStudent;
  readonly instituteProfile = this.settingsService.profile;
  readonly attendanceThreshold = computed(() => this.settingsService.academic().attendanceThreshold || 75);
  readonly passingPercentage = computed(() => this.settingsService.academic().passingPercentage || 40);

  parseSemesterNumber(semesterLabel: string): number {
    const match = semesterLabel.match(/\d+/);
    return match ? Number(match[0]) : 1;
  }

  formatShortDate(isoDate: string): string {
    if (!isoDate) return '-';
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return isoDate;
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(d);
  }

  formatINR(amount: number): string {
    return formatCurrency(amount);
  }

  getDueText(dueDateIso: string): { dueText: string; diffDays: number } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateIso);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      const overdue = Math.abs(diffDays);
      return {
        dueText: overdue === 1 ? 'Overdue by 1 day' : `Overdue by ${overdue} days`,
        diffDays
      };
    }
    if (diffDays === 0) return { dueText: 'Due today', diffDays };
    if (diffDays === 1) return { dueText: 'Due tomorrow', diffDays };
    return { dueText: `Due in ${diffDays} days`, diffDays };
  }

  resolveFacultyForSubject(student: Student, subject: SubjectRecord): { faculty: string; weeklyHours: number } {
    const alloc = this.academicService.subjectAllocations().find(
      a =>
        a.course === student.course &&
        a.semester === student.semester &&
        (a.section === student.section || !a.section) &&
        a.subject.toLowerCase() === subject.name.toLowerCase()
    ) || this.academicService.subjectAllocations().find(
      a => a.course === student.course && a.subject.toLowerCase() === subject.name.toLowerCase()
    );

    const semNum = this.parseSemesterNumber(student.semester);
    const matchingSlots = this.timetableService.slots().filter(
      s =>
        s.courseId === student.courseId &&
        s.semester === semNum &&
        s.sectionId === student.sectionId &&
        s.subjectId === subject.id
    );

    const facultyFromSlot = matchingSlots[0]?.facultyName;
    return {
      faculty: alloc?.faculty || facultyFromSlot || 'Department Faculty',
      weeklyHours: alloc?.weeklyHours ?? (matchingSlots.length > 0 ? matchingSlots.length : subject.type === 'Practical' ? 2 : 3)
    };
  }

  // Per-student attendance records across sessions for their course/semester/section
  readonly studentAttendanceLogs = computed<StudentAttendanceDayRecord[]>(() => {
    const student = this.currentStudent();
    const subjectsById = new Map(this.academicService.subjects().map(s => [s.id, s]));

    return this.attendanceService
      .sessions()
      .filter(
        sess =>
          sess.courseId === student.courseId &&
          sess.semester === student.semester &&
          sess.sectionId === student.sectionId
      )
      .map(sess => {
        const sub = subjectsById.get(sess.subjectId);
        return {
          sessionId: sess.id,
          date: sess.date,
          subjectId: sess.subjectId,
          subjectCode: sub?.code || sess.subjectId.toUpperCase(),
          subjectName: sub?.name || sess.subjectId,
          status: this.attendanceService.getStudentStatusForSession(sess.id, student.id)
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  });

  readonly subjectAttendances = computed<StudentSubjectAttendance[]>(() => {
    const student = this.currentStudent();
    const threshold = this.attendanceThreshold();
    const logs = this.studentAttendanceLogs();
    const enrolledSubjects = this.academicService
      .subjects()
      .filter(s => s.course === student.course && s.semester === student.semester && s.status === 'Active');

    const map = new Map<string, { code: string; name: string; logs: StudentAttendanceDayRecord[] }>();
    for (const sub of enrolledSubjects) {
      map.set(sub.id, { code: sub.code, name: sub.name, logs: [] });
    }
    for (const log of logs) {
      const existing = map.get(log.subjectId);
      if (existing) {
        existing.logs.push(log);
      } else {
        map.set(log.subjectId, { code: log.subjectCode, name: log.subjectName, logs: [log] });
      }
    }

    const result: StudentSubjectAttendance[] = [];
    for (const [subjectId, entry] of map.entries()) {
      const held = entry.logs.length;
      if (held === 0) continue;
      const attended = entry.logs.filter(l => l.status === 'Present').length;
      const absent = entry.logs.filter(l => l.status === 'Absent').length;
      const leave = entry.logs.filter(l => l.status === 'Leave').length;
      const percentage = Math.round((attended / held) * 100);
      result.push({
        subjectId,
        code: entry.code,
        name: entry.name,
        held,
        attended,
        absent,
        leave,
        percentage,
        isLow: percentage < threshold
      });
    }
    return result;
  });

  readonly overallAttendanceSummary = computed(() => {
    const logs = this.studentAttendanceLogs();
    const threshold = this.attendanceThreshold();
    const total = logs.length;
    const present = logs.filter(l => l.status === 'Present').length;
    const absent = logs.filter(l => l.status === 'Absent').length;
    const leave = logs.filter(l => l.status === 'Leave').length;
    const percentage = total > 0 ? Math.round((present / total) * 1000) / 10 : 0;

    let classesNeeded = 0;
    if (total > 0 && percentage < threshold && threshold < 100) {
      classesNeeded = Math.max(0, Math.ceil((threshold * total - 100 * present) / (100 - threshold)));
    }

    return {
      total,
      present,
      absent,
      leave,
      percentage,
      threshold,
      isBelowThreshold: total > 0 && percentage < threshold,
      classesNeeded
    };
  });

  readonly studentSubjects = computed<StudentSubjectDetail[]>(() => {
    const student = this.currentStudent();
    const threshold = this.attendanceThreshold();
    const subjects = this.academicService
      .subjects()
      .filter(s => s.course === student.course && s.semester === student.semester && s.status === 'Active');

    const attBySubject = new Map(this.subjectAttendances().map(a => [a.subjectId, a]));
    const publishedResults = this.studentPublishedResults();
    const exams = this.studentExams().upcoming;
    const pendingAsgs = this.studentAssignments().filter(a => a.bucket !== 'Submitted');

    return subjects.map(sub => {
      const resolved = this.resolveFacultyForSubject(student, sub);
      const att = attBySubject.get(sub.id);
      const attended = att?.attended ?? 0;
      const held = att?.held ?? 0;
      const pct = held > 0 ? att!.percentage : 100;

      const marksSoFar = publishedResults
        .filter(r => r.subjectId === sub.id)
        .map(r => ({
          examTitle: r.examTitle,
          marksObtained: r.record.marksObtained,
          maxMarks: r.record.maxMarks,
          percentage: r.percentage,
          grade: r.grade
        }));

      const subExams = exams
        .filter(e => e.exam.subjectId === sub.id)
        .map(e => ({
          id: e.exam.id,
          title: e.exam.title,
          mode: e.exam.mode,
          date: e.exam.date,
          time: e.exam.time,
          maxMarks: e.exam.maxMarks,
          resultAnnouncementDate: e.resultAnnouncementDate,
          resultAnnouncementTime: e.resultAnnouncementTime
        }));

      const subPendingAssignments = pendingAsgs
        .filter(a => a.assignment.subjectId === sub.id)
        .map(a => ({
          id: a.assignment.id,
          title: a.assignment.title,
          dueDate: a.assignment.dueDate,
          dueText: a.dueText,
          status: a.displayStatus
        }));

      return {
        id: sub.id,
        code: sub.code,
        name: sub.name,
        type: sub.type,
        credits: sub.credits,
        faculty: resolved.faculty,
        weeklyHours: resolved.weeklyHours,
        attended,
        held,
        attendancePercentage: pct,
        isLowAttendance: held > 0 && pct < threshold,
        marksSoFar,
        upcomingExams: subExams,
        pendingAssignments: subPendingAssignments
      };
    });
  });

  readonly studentAssignments = computed<StudentAssignmentItem[]>(() => {
    const student = this.currentStudent();
    const courseSubjects = this.academicService
      .subjects()
      .filter(s => s.course === student.course);
    const subjectMap = new Map(courseSubjects.map(s => [s.id, s]));
    const submissionsByAsg = new Map(
      this.assignmentsService
        .submissions()
        .filter(s => s.studentId === student.id)
        .map(s => [s.assignmentId, s])
    );

    return this.assignmentsService
      .assignments()
      .filter(a => a.sectionId === student.sectionId && subjectMap.has(a.subjectId))
      .map(a => {
        const subject = subjectMap.get(a.subjectId)!;
        const resolved = this.resolveFacultyForSubject(student, subject);
        const subm = submissionsByAsg.get(a.id) ?? null;
        const evaluation = this.assignmentsService.getEvaluation(a.id, student.id);
        const { dueText, diffDays } = this.getDueText(a.dueDate);

        const questionsCount = (a.questions ?? this.assignmentsService.getQuestionsForAssignment(a.id)).length;
        const answeredCount = subm?.questionAnswers
          ? Object.values(subm.questionAnswers).filter(v => v.trim().length > 0).length
          : 0;

        if (subm && subm.status !== 'Draft') {
          const submittedDate = (subm.submittedAt || subm.submittedOn || '').split('T')[0];
          const isLate = subm.status === 'Late' || (submittedDate !== '' && submittedDate > a.dueDate);
          const marksObtained = subm.marks ?? evaluation?.marksObtained;
          const evaluationFeedback = subm.feedback ?? evaluation?.feedback;

          let statusDueText = `Submitted on ${this.formatShortDate(submittedDate)}`;
          if (subm.status === 'Evaluated') {
            statusDueText = `Evaluated · ${marksObtained ?? 0}/${a.maxMarks} marks`;
          } else if (isLate) {
            statusDueText = `Submitted late on ${this.formatShortDate(submittedDate)}`;
          }

          return {
            assignment: a,
            subjectCode: subject.code,
            facultyName: resolved.faculty,
            bucket: 'Submitted' as const,
            displayStatus: subm.status,
            dueText: statusDueText,
            isOverdue: false,
            submission: subm,
            submittedOn: submittedDate,
            submissionNote: subm.answerText || subm.note,
            attachmentsCount: subm.attachments.length,
            version: subm.version,
            marksObtained,
            evaluationFeedback,
            evaluatedBy: subm.evaluatedBy,
            evaluatedAt: subm.evaluatedAt,
            totalQuestions: questionsCount,
            answeredQuestions: answeredCount
          };
        }

        const isOverdue = a.status === 'Overdue' || a.status === 'Closed' || diffDays < 0;
        return {
          assignment: a,
          subjectCode: subject.code,
          facultyName: resolved.faculty,
          bucket: isOverdue ? ('Overdue' as const) : ('Pending' as const),
          displayStatus: subm?.status === 'Draft' ? ('Draft' as const) : isOverdue ? ('Overdue' as const) : ('Pending' as const),
          dueText,
          isOverdue,
          submission: subm,
          attachmentsCount: subm?.attachments.length ?? 0,
          version: subm?.version ?? 0,
          totalQuestions: questionsCount,
          answeredQuestions: answeredCount
        };
      })
      .sort((a, b) => a.assignment.dueDate.localeCompare(b.assignment.dueDate));
  });

  private formatAnnouncementCountdown(announceDateIso: string, hasPublishedResult: boolean): { label: string; daysUntil: number } {
    if (hasPublishedResult) {
      return { label: 'Announced', daysUntil: 0 };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(announceDateIso);
    target.setHours(0, 0, 0, 0);
    if (Number.isNaN(target.getTime())) {
      return { label: 'Schedule TBD', daysUntil: 999 };
    }
    const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: 'Evaluation wrapping up', daysUntil: diff };
    if (diff === 0) return { label: 'Announces Today', daysUntil: 0 };
    if (diff === 1) return { label: 'Announces Tomorrow', daysUntil: 1 };
    return { label: `Announces in ${diff} days`, daysUntil: diff };
  }

  readonly studentExams = computed(() => {
    const student = this.currentStudent();
    const subjectsById = new Map(this.academicService.subjects().map(s => [s.id, s]));
    const publishedExamIds = new Set(
      this.resultsService
        .results()
        .filter(r => r.studentId === student.id && r.status === 'Published')
        .map(r => r.examId)
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items: StudentExamItem[] = this.examinationsService
      .exams()
      .filter(ex => ex.courseId === student.courseId)
      .map(ex => {
        const d = new Date(ex.date);
        d.setHours(0, 0, 0, 0);
        const daysUntil = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const dayNumber = String(d.getDate()).padStart(2, '0');
        const monthShort = new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(d);
        let countdownLabel = '';
        if (daysUntil === 0) countdownLabel = 'Today';
        else if (daysUntil === 1) countdownLabel = 'Tomorrow';
        else if (daysUntil > 1) countdownLabel = `In ${daysUntil} days`;
        else countdownLabel = `${Math.abs(daysUntil)}d ago`;

        const hasPublishedResult = publishedExamIds.has(ex.id);
        const resultAnnouncementDate = ex.resultAnnouncementDate || this.examinationsService.getExpectedResultDate(ex);
        const resultAnnouncementTime = ex.resultAnnouncementTime || '17:00';
        const { label: resultCountdownLabel } = this.formatAnnouncementCountdown(resultAnnouncementDate, hasPublishedResult);

        const sub = subjectsById.get(ex.subjectId);
        return {
          exam: ex,
          subjectCode: sub?.code || ex.subjectId.toUpperCase(),
          dayNumber,
          monthShort,
          countdownLabel,
          daysUntil,
          hasPublishedResult,
          resultAnnouncementDate,
          resultAnnouncementTime,
          resultCountdownLabel
        };
      });

    const upcoming = items
      .filter(i => i.exam.semester === student.semester && i.exam.status !== 'Completed')
      .sort((a, b) => a.exam.date.localeCompare(b.exam.date));

    const completed = items
      .filter(i => i.exam.status === 'Completed')
      .sort((a, b) => b.exam.date.localeCompare(a.exam.date));

    return { upcoming, completed };
  });

  readonly studentResultAnnouncements = computed<StudentResultAnnouncementItem[]>(() => {
    const student = this.currentStudent();
    const subjectsById = new Map(this.academicService.subjects().map(s => [s.id, s]));
    const publishedExamIds = new Set(
      this.resultsService
        .results()
        .filter(r => r.studentId === student.id && r.status === 'Published')
        .map(r => r.examId)
    );
    const attemptsByExamId = new Map(
      this.firebaseService
        .examAttempts()
        .filter(a => a.studentId === student.id)
        .map(a => [a.examId, a])
    );

    return this.examinationsService
      .exams()
      .filter(ex => ex.courseId === student.courseId && ex.semester === student.semester && !publishedExamIds.has(ex.id))
      .map(ex => {
        const sub = subjectsById.get(ex.subjectId);
        const resultAnnouncementDate = ex.resultAnnouncementDate || this.examinationsService.getExpectedResultDate(ex);
        const resultAnnouncementTime = ex.resultAnnouncementTime || '17:00';
        const { label, daysUntil } = this.formatAnnouncementCountdown(resultAnnouncementDate, false);
        const attempt = attemptsByExamId.get(ex.id);
        const hasAttemptSubmitted = attempt?.status === 'Submitted';

        let stageLabel: StudentResultAnnouncementItem['stageLabel'] = 'Scheduled Exam';
        if (hasAttemptSubmitted) {
          stageLabel = 'Online Paper Submitted';
        } else if (ex.status === 'Completed') {
          stageLabel = 'Evaluation in Progress';
        }

        return {
          exam: ex,
          subjectCode: sub?.code || ex.subjectId.toUpperCase(),
          resultAnnouncementDate,
          resultAnnouncementTime,
          countdownLabel: label,
          daysUntilAnnouncement: daysUntil,
          hasAttemptSubmitted,
          stageLabel
        };
      })
      .sort((a, b) => a.resultAnnouncementDate.localeCompare(b.resultAnnouncementDate));
  });

  readonly studentPublishedResults = computed<StudentResultItem[]>(() => {
    const student = this.currentStudent();
    const examsById = new Map(this.examinationsService.exams().map(e => [e.id, e]));
    const subjectsById = new Map(this.academicService.subjects().map(s => [s.id, s]));
    const passingPct = this.passingPercentage();

    return this.resultsService
      .results()
      .filter(r => r.studentId === student.id && r.status === 'Published')
      .map(r => {
        const exam = examsById.get(r.examId);
        const subject = exam ? subjectsById.get(exam.subjectId) : undefined;
        const pct = r.maxMarks > 0 ? Math.round((r.marksObtained / r.maxMarks) * 100) : 0;
        const computedGrade = getGrade(pct);
        const resultAnnouncementDate = exam
          ? exam.resultAnnouncementDate || this.examinationsService.getExpectedResultDate(exam)
          : '2026-01-05';
        return {
          record: r,
          examTitle: exam?.title || 'Examination',
          examDate: exam?.date || '2026-01-01',
          resultAnnouncementDate,
          resultAnnouncementTime: exam?.resultAnnouncementTime || '17:00',
          semester: exam?.semester || student.semester,
          subjectId: exam?.subjectId || '',
          subjectCode: subject?.code || (exam?.subjectId ? exam.subjectId.toUpperCase() : 'SUB'),
          subjectName: exam?.subjectName || 'Subject',
          credits: subject?.credits ?? 4,
          percentage: pct,
          grade: computedGrade.grade,
          gradePoint: computedGrade.point,
          passed: pct >= passingPct
        };
      })
      .sort((a, b) => b.examDate.localeCompare(a.examDate));
  });

  computeGpa(items: StudentResultItem[]): number {
    if (items.length === 0) return 0;
    const totalCredits = items.reduce((acc, r) => acc + r.credits, 0);
    if (totalCredits === 0) return 0;
    const weightedPoints = items.reduce((acc, r) => acc + r.gradePoint * r.credits, 0);
    return Math.round((weightedPoints / totalCredits) * 100) / 100;
  }

  readonly studentFeeSummary = computed<StudentFeeSummaryView>(() => {
    const student = this.currentStudent();
    const ledger = this.financeService.ledgers().find(l => l.studentId === student.id);
    const structure = ledger
      ? this.financeService.structures().find(s => s.id === ledger.structureId)
      : this.financeService.structures().find(s => s.courseId === student.courseId);

    if (!ledger) {
      return {
        totalFee: 0,
        paidAmount: 0,
        dueAmount: 0,
        paidPercent: 0,
        nextDueDate: null,
        academicYear: structure?.academicYear || '2025-26',
        lateFinePerDay: structure?.lateFinePerDay || 50,
        feeHeads: [],
        installmentRows: []
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lateFineRate = structure?.lateFinePerDay || 50;

    const installmentRows: StudentInstallmentRow[] = ledger.installments.map(inst => {
      const baseNet = Math.max(0, inst.totalAmount - inst.concessionAmount);
      const isAlreadySettled = inst.paidAmount >= baseNet + inst.fineAmount;
      const due = new Date(inst.dueDate);
      due.setHours(0, 0, 0, 0);
      const dynamicFine = !isAlreadySettled && today > due
        ? this.financeService.calculateFine(inst.dueDate, lateFineRate)
        : 0;
      const effectiveFine = Math.max(inst.fineAmount, dynamicFine);
      const balance = Math.max(0, inst.totalAmount + effectiveFine - inst.concessionAmount - inst.paidAmount);

      let displayStatus: 'Paid' | 'Pending' | 'Overdue' = 'Pending';
      if (balance === 0) displayStatus = 'Paid';
      else if (today > due) displayStatus = 'Overdue';

      return {
        installmentId: inst.installmentId,
        label: inst.label,
        dueDate: inst.dueDate,
        amount: inst.totalAmount,
        paid: inst.paidAmount,
        concession: inst.concessionAmount,
        lateFine: effectiveFine,
        balance,
        displayStatus
      };
    });

    const totalFee = installmentRows.reduce((acc, r) => acc + r.amount + r.lateFine - r.concession, 0);
    const paidAmount = installmentRows.reduce((acc, r) => acc + r.paid, 0);
    const dueAmount = Math.max(0, totalFee - paidAmount);
    const paidPercent = totalFee > 0 ? Math.min(100, Math.round((paidAmount / totalFee) * 100)) : 0;

    const nextUnpaid = installmentRows
      .filter(r => r.balance > 0)
      .slice()
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

    const feeHeads = (structure?.installments || []).flatMap(inst =>
      inst.heads.map(h => ({
        id: h.id,
        name: h.name,
        amount: h.amount,
        installmentLabel: inst.label
      }))
    );

    return {
      totalFee,
      paidAmount,
      dueAmount,
      paidPercent,
      nextDueDate: nextUnpaid ? nextUnpaid.dueDate : null,
      academicYear: structure?.academicYear || '2025-26',
      lateFinePerDay: lateFineRate,
      feeHeads,
      installmentRows
    };
  });

  readonly studentReceipts = computed(() => {
    const student = this.currentStudent();
    const list: Payment[] = this.financeService
      .payments()
      .filter(p => p.studentId === student.id)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));

    const paidReceipts = list.filter(p => p.status === 'Paid');
    const totalPaid = paidReceipts.reduce((acc, p) => acc + p.total, 0);
    const lastPaymentDate = paidReceipts.length > 0 ? paidReceipts[0].date : null;

    return {
      list,
      totalCount: list.length,
      paidCount: paidReceipts.length,
      totalPaid,
      lastPaymentDate
    };
  });
}
