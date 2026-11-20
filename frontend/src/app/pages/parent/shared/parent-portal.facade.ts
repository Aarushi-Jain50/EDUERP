import { Injectable, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ChildContextService } from '../../../services/child-context.service';
import { AcademicService, SubjectRecord } from '../../../services/academic.service';
import { TimetableService } from '../../../services/timetable.service';
import { AttendanceService } from '../../../services/attendance.service';
import { AssignmentsService, Assignment, AssignmentSubmission } from '../../../services/assignments.service';
import { ExaminationsService, Examination } from '../../../services/examinations.service';
import { ResultsService, ResultRecord } from '../../../services/results.service';
import { FinanceService } from '../../../services/finance.service';
import { FacultyService } from '../../../services/faculty.service';
import { CommunicationService } from '../../../services/communication.service';
import { SettingsService } from '../../../services/settings.service';
import { StudentsService } from '../../../services/students.service';
import { AuditService } from '../../../services/audit.service';
import { Student } from '../../../models/student.model';
import { Notice } from '../../../models/communication.model';
import { Payment } from '../../../models/finance.model';
import { TimetableEntry } from '../../../models/timetable.model';
import { getGrade } from '../../../utils/grade-scale.helper';
import { formatCurrency } from '../../../utils/money.helper';

export interface ParentSubjectAttendance {
  subjectId: string;
  code: string;
  name: string;
  held: number;
  attended: number;
  absent: number;
  leave: number;
  total: number;
  percentage: number;
  isLow: boolean;
}

export interface ParentAttendanceDayRecord {
  sessionId: string;
  date: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  status: 'Present' | 'Absent' | 'Leave';
}

export interface ParentOverallAttendance {
  total: number;
  present: number;
  absent: number;
  leave: number;
  percentage: number;
  threshold: number;
  isBelowThreshold: boolean;
  classesNeeded: number;
}

export interface AttendanceTrendPoint {
  date: string;
  label: string;
  percentage: number;
}

export interface ParentPublishedResult {
  id: string;
  examId: string;
  examTitle: string;
  subjectName: string;
  examDate: string;
  marksObtained: number;
  maxMarks: number;
  percentage: number;
  grade: string;
}

export interface ParentResultItem {
  record: ResultRecord;
  examTitle: string;
  examDate: string;
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

export interface ParentTimetablePeriod {
  id: string;
  timeRange: string;
  subjectName: string;
  subjectType: string;
  facultyName: string;
  room: string;
  status: 'current' | 'next' | 'completed' | 'upcoming';
}

export interface ParentAssignmentItem {
  assignment: Assignment;
  subjectCode: string;
  facultyName: string;
  bucket: 'Pending' | 'Submitted' | 'Overdue';
  displayStatus: 'Pending' | 'Overdue' | 'Draft' | 'Submitted' | 'Late' | 'Evaluated';
  dueText: string;
  isOverdue: boolean;
  submission: AssignmentSubmission | null;
  submittedAtDisplay?: string;
  attachmentNames: string[];
  attachmentsCount: number;
  version: number;
  marksObtained?: number;
  evaluationFeedback?: string;
  evaluatedBy?: string;
}

export interface ParentExamItem {
  exam: Examination;
  subjectCode: string;
  dayNumber: string;
  monthShort: string;
  countdownLabel: string;
  daysUntil: number;
  hasPublishedResult: boolean;
}

export interface ParentInstallmentRow {
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

export interface ParentFeeDetailView {
  totalFee: number;
  paidAmount: number;
  dueAmount: number;
  paidPercent: number;
  nextDueDate: string | null;
  academicYear: string;
  lateFinePerDay: number;
  feeHeads: { id: string; name: string; amount: number; installmentLabel: string }[];
  installmentRows: ParentInstallmentRow[];
}

export interface ParentFeeSummary {
  total: number;
  paid: number;
  due: number;
  nextDueDate: string | null;
  overdueCount: number;
  firstOverdueLabel: string | null;
  firstOverdueAmount: number;
  firstOverdueDate: string | null;
}

export interface ParentAlertItem {
  id: string;
  category: 'Attendance' | 'Fees' | 'Result' | 'Notice';
  title: string;
  description: string;
  severity: 'Urgent' | 'High' | 'Info';
  icon: string;
  route: string;
}

export interface ParentRecipientOption {
  id: string;
  name: string;
  roleGroup: 'Admin' | 'Faculty';
  subtext: string;
}

export interface ChildOverviewSnapshot {
  student: Student;
  overallAttendancePct: number;
  attendanceThreshold: number;
  isLowAttendance: boolean;
  subjectAttendances: ParentSubjectAttendance[];
  attendanceTrend: AttendanceTrendPoint[];
  pendingAssignmentsCount: number;
  overdueAssignmentsCount: number;
  upcomingExams: Examination[];
  publishedResults: ParentPublishedResult[];
  averageMarksPct: number | null;
  sgpa: number;
  cgpa: number;
  feeSummary: ParentFeeSummary;
  todaysTimetable: ParentTimetablePeriod[];
  notices: Notice[];
  alerts: ParentAlertItem[];
}

@Injectable({ providedIn: 'root' })
export class ParentPortalFacade {
  private readonly childContext = inject(ChildContextService);
  private readonly academicService = inject(AcademicService);
  private readonly timetableService = inject(TimetableService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly assignmentsService = inject(AssignmentsService);
  private readonly examinationsService = inject(ExaminationsService);
  private readonly resultsService = inject(ResultsService);
  private readonly financeService = inject(FinanceService);
  private readonly facultyService = inject(FacultyService);
  private readonly communicationService = inject(CommunicationService);
  private readonly settingsService = inject(SettingsService);
  private readonly studentsService = inject(StudentsService);
  private readonly auditService = inject(AuditService);

  readonly currentParent = this.childContext.currentParent;
  readonly linkedChildren = this.childContext.linkedChildren;
  readonly selectedChild = toSignal(this.childContext.selectedChild$, {
    initialValue: this.childContext.selectedChild()
  });

  readonly instituteProfile = this.settingsService.profile;
  readonly attendanceThreshold = computed(() => this.settingsService.academic().attendanceThreshold || 75);
  readonly passingPercentage = computed(() => this.settingsService.academic().passingPercentage || 40);

  readonly selectedSnapshot = computed<ChildOverviewSnapshot | null>(() => {
    const child = this.selectedChild();
    if (!child) return null;
    return this.buildChildSnapshot(child);
  });

  readonly linkedChildrenSnapshots = computed<ChildOverviewSnapshot[]>(() => {
    return this.linkedChildren().map(child => this.buildChildSnapshot(child));
  });

  // 1. Attendance detailed views for selected child
  readonly selectedAttendanceLogs = computed<ParentAttendanceDayRecord[]>(() => {
    const child = this.selectedChild();
    if (!child) return [];
    const subjectsById = new Map(this.academicService.subjects().map(s => [s.id, s]));

    return this.attendanceService
      .sessions()
      .filter(
        sess =>
          sess.courseId === child.courseId &&
          sess.semester === child.semester &&
          sess.sectionId === child.sectionId
      )
      .map(sess => {
        const sub = subjectsById.get(sess.subjectId);
        return {
          sessionId: sess.id,
          date: sess.date,
          subjectId: sess.subjectId,
          subjectCode: sub?.code || sess.subjectId.toUpperCase(),
          subjectName: sub?.name || sess.subjectId,
          status: this.attendanceService.getStudentStatusForSession(sess.id, child.id)
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  });

  readonly selectedSubjectAttendances = computed<ParentSubjectAttendance[]>(() => {
    const child = this.selectedChild();
    if (!child) return [];
    const threshold = this.attendanceThreshold();
    const logs = this.selectedAttendanceLogs();
    const enrolledSubjects = this.academicService
      .subjects()
      .filter(s => s.course === child.course && s.semester === child.semester && s.status === 'Active');

    const map = new Map<string, { code: string; name: string; logs: ParentAttendanceDayRecord[] }>();
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

    const list: ParentSubjectAttendance[] = [];
    for (const [subjectId, entry] of map.entries()) {
      const held = entry.logs.length;
      if (held === 0) continue;
      const attended = entry.logs.filter(l => l.status === 'Present').length;
      const absent = entry.logs.filter(l => l.status === 'Absent').length;
      const leave = entry.logs.filter(l => l.status === 'Leave').length;
      const percentage = Math.round((attended / held) * 100);
      list.push({
        subjectId,
        code: entry.code,
        name: entry.name,
        held,
        attended,
        absent,
        leave,
        total: held,
        percentage,
        isLow: percentage < threshold
      });
    }
    return list;
  });

  readonly selectedOverallAttendance = computed<ParentOverallAttendance>(() => {
    const logs = this.selectedAttendanceLogs();
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

  // 2. Timetable slots for selected child
  readonly selectedTimetableSlots = computed<TimetableEntry[]>(() => {
    const child = this.selectedChild();
    if (!child) return [];
    const semNum = this.parseSemesterNumber(child.semester);
    return this.timetableService
      .slots()
      .filter(s => s.courseId === child.courseId && s.semester === semNum && s.sectionId === child.sectionId);
  });

  // 3. Assignments for selected child (read-only)
  readonly selectedAssignments = computed<ParentAssignmentItem[]>(() => {
    const child = this.selectedChild();
    if (!child) return [];
    const courseSubjects = this.academicService.subjects().filter(s => s.course === child.course);
    const subjectMap = new Map(courseSubjects.map(s => [s.id, s]));
    const submissionsByAsg = new Map(
      this.assignmentsService
        .submissions()
        .filter(s => s.studentId === child.id)
        .map(s => [s.assignmentId, s])
    );

    return this.assignmentsService
      .assignments()
      .filter(a => a.sectionId === child.sectionId && subjectMap.has(a.subjectId))
      .map(a => {
        const subject = subjectMap.get(a.subjectId)!;
        const resolved = this.resolveFacultyForSubject(child, subject);
        const subm = submissionsByAsg.get(a.id) ?? null;
        const evaluation = this.assignmentsService.getEvaluation(a.id, child.id);
        const { dueText, diffDays } = this.getDueText(a.dueDate);

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
            submittedAtDisplay: subm.submittedAt
              ? this.formatDateTime(subm.submittedAt)
              : submittedDate
                ? this.formatShortDate(submittedDate)
                : '-',
            attachmentNames: subm.attachments.map(att => att.name),
            attachmentsCount: subm.attachments.length,
            version: subm.version,
            marksObtained,
            evaluationFeedback,
            evaluatedBy: subm.evaluatedBy
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
          attachmentNames: subm?.attachments.map(att => att.name) ?? [],
          attachmentsCount: subm?.attachments.length ?? 0,
          version: subm?.version ?? 0
        };
      })
      .sort((a, b) => a.assignment.dueDate.localeCompare(b.assignment.dueDate));
  });

  // 4. Exams for selected child
  readonly selectedExamGroups = computed(() => {
    const child = this.selectedChild();
    if (!child) return { upcoming: [] as ParentExamItem[], completed: [] as ParentExamItem[] };
    const subjectsById = new Map(this.academicService.subjects().map(s => [s.id, s]));
    const publishedExamIds = new Set(
      this.resultsService
        .results()
        .filter(r => r.studentId === child.id && r.status === 'Published')
        .map(r => r.examId)
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items: ParentExamItem[] = this.examinationsService
      .exams()
      .filter(ex => ex.courseId === child.courseId)
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

        const sub = subjectsById.get(ex.subjectId);
        return {
          exam: ex,
          subjectCode: sub?.code || ex.subjectId.toUpperCase(),
          dayNumber,
          monthShort,
          countdownLabel,
          daysUntil,
          hasPublishedResult: publishedExamIds.has(ex.id)
        };
      });

    const upcoming = items
      .filter(i => i.exam.semester === child.semester && i.exam.status !== 'Completed')
      .sort((a, b) => a.exam.date.localeCompare(b.exam.date));

    const completed = items
      .filter(i => i.exam.status === 'Completed')
      .sort((a, b) => b.exam.date.localeCompare(a.exam.date));

    return { upcoming, completed };
  });

  // 5. Published results for selected child
  readonly selectedPublishedResults = computed<ParentResultItem[]>(() => {
    const child = this.selectedChild();
    if (!child) return [];
    const examsById = new Map(this.examinationsService.exams().map(e => [e.id, e]));
    const subjectsById = new Map(this.academicService.subjects().map(s => [s.id, s]));
    const passingPct = this.passingPercentage();

    return this.resultsService
      .results()
      .filter(r => r.studentId === child.id && r.status === 'Published')
      .map(r => {
        const exam = examsById.get(r.examId);
        const subject = exam ? subjectsById.get(exam.subjectId) : undefined;
        const pct = r.maxMarks > 0 ? Math.round((r.marksObtained / r.maxMarks) * 100) : 0;
        const computedGrade = getGrade(pct);
        return {
          record: r,
          examTitle: exam?.title || 'Examination',
          examDate: exam?.date || '2026-01-01',
          semester: exam?.semester || child.semester,
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

  computeGpa(items: ParentResultItem[]): number {
    if (items.length === 0) return 0;
    const totalCredits = items.reduce((acc, r) => acc + r.credits, 0);
    if (totalCredits === 0) return 0;
    const weightedPoints = items.reduce((acc, r) => acc + r.gradePoint * r.credits, 0);
    return Math.round((weightedPoints / totalCredits) * 100) / 100;
  }

  // 6. Fees & Receipts for selected child
  readonly selectedFeeDetail = computed<ParentFeeDetailView>(() => {
    const child = this.selectedChild();
    if (!child) {
      return {
        totalFee: 0,
        paidAmount: 0,
        dueAmount: 0,
        paidPercent: 0,
        nextDueDate: null,
        academicYear: '2025-26',
        lateFinePerDay: 50,
        feeHeads: [],
        installmentRows: []
      };
    }

    const ledger = this.financeService.ledgers().find(l => l.studentId === child.id);
    const structure = ledger
      ? this.financeService.structures().find(s => s.id === ledger.structureId)
      : this.financeService.structures().find(s => s.courseId === child.courseId);

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

    const installmentRows: ParentInstallmentRow[] = ledger.installments.map(inst => {
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

  readonly selectedReceipts = computed(() => {
    const child = this.selectedChild();
    if (!child) {
      return { list: [] as Payment[], totalCount: 0, paidCount: 0, totalPaid: 0, lastPaymentDate: null as string | null };
    }
    const list: Payment[] = this.financeService
      .payments()
      .filter(p => p.studentId === child.id)
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

  payInstallmentsOnline(
    installmentIds: string[],
    mode: 'UPI' | 'Card' | 'Bank Transfer',
    referenceNote?: string
  ): Payment | null {
    const child = this.selectedChild();
    const parent = this.currentParent();
    if (!child || installmentIds.length === 0) return null;

    const feeDetail = this.selectedFeeDetail();
    const targetRows = feeDetail.installmentRows.filter(
      r => installmentIds.includes(r.installmentId) && r.balance > 0
    );
    if (targetRows.length === 0) return null;

    const ledger = this.financeService.getLedgerByStudent(child.id);
    if (!ledger) return null;

    const items = targetRows.map(r => {
      const ledgerInst = ledger.installments.find(i => i.installmentId === r.installmentId);
      const pendingFine = Math.max(0, r.lateFine - (ledgerInst?.fineAmount || 0));
      const principalAndExistingBalance = Math.max(0, r.balance - pendingFine);
      return {
        installmentId: r.installmentId,
        amount: principalAndExistingBalance,
        fine: pendingFine
      };
    });

    const subtotal = items.reduce((acc, i) => acc + i.amount, 0);
    const fine = items.reduce((acc, i) => acc + i.fine, 0);
    const total = subtotal + fine;
    const prefix = mode === 'UPI' ? 'UPI' : mode === 'Card' ? 'CARD' : 'NB';
    const refNo = referenceNote?.trim() || `${prefix}-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const todayIso = new Date().toISOString().split('T')[0];

    const payment = this.financeService.collectPayment({
      studentId: child.id,
      studentName: child.name,
      courseName: child.course,
      date: todayIso,
      subtotal,
      concession: 0,
      fine,
      total,
      mode,
      refNo,
      items,
      collectedBy: `Online Portal (${parent.name})`
    });

    this.auditService.log({
      userId: parent.id,
      userName: parent.name,
      role: 'Parent',
      module: 'Parent Fees',
      action: 'Create',
      target: `Online Payment ${payment.receiptNo} (${this.formatINR(total)})`,
      status: 'Success'
    });

    this.studentsService.showToast(
      'success',
      `Payment of ${this.formatINR(total)} successful! Receipt ${payment.receiptNo} generated.`
    );

    return payment;
  }

  // 7. Notices eligible for parent & selected child
  readonly selectedNotices = computed<Notice[]>(() => {
    const child = this.selectedChild();
    return this.communicationService
      .notices()
      .filter(n => {
        if (n.status !== 'Published') return false;
        if (n.audience === 'All' || n.audience === 'Parents') return true;
        if (child && n.audience === 'Course-wise' && n.courseId === child.courseId) return true;
        return false;
      })
      .slice()
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return b.publishDate.localeCompare(a.publishDate);
      });
  });

  // 8. Messaging recipients strictly restricted to Admin & faculty teaching the selected child (Subject Allocation)
  readonly selectedChildRecipients = computed<ParentRecipientOption[]>(() => {
    const child = this.selectedChild();
    const allocations = this.academicService.subjectAllocations();
    const facultyList = this.facultyService.facultyList();

    const list: ParentRecipientOption[] = [
      {
        id: 'admin',
        name: 'Administrator / Central Office',
        roleGroup: 'Admin',
        subtext: 'Academic Administration & Accounts Desk'
      }
    ];

    if (!child) return list;

    const childAllocs = allocations.filter(
      a =>
        (a.course === child.course || a.course === child.courseId) &&
        a.semester === child.semester &&
        (a.section === child.section || !a.section)
    );

    const seenFaculty = new Set<string>();
    for (const alloc of childAllocs) {
      const facName = alloc.faculty.trim();
      if (!facName || facName === 'Unassigned' || seenFaculty.has(facName.toLowerCase())) continue;
      seenFaculty.add(facName.toLowerCase());
      const matched = facultyList.find(f => f.name.toLowerCase().trim() === facName.toLowerCase());
      list.push({
        id: matched?.id || `fac-${alloc.id}`,
        name: facName,
        roleGroup: 'Faculty',
        subtext: `${alloc.subject} (${alloc.weeklyHours} hrs/wk)`
      });
    }

    return list;
  });

  formatINR(amount: number): string {
    return formatCurrency(amount);
  }

  formatShortDate(dateStr: string): string {
    if (!dateStr) return '-';
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(parsed);
  }

  formatDateTime(isoStr: string): string {
    if (!isoStr) return '-';
    const parsed = new Date(isoStr);
    if (Number.isNaN(parsed.getTime())) return isoStr;
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(parsed);
  }

  parseSemesterNumber(semesterLabel: string): number {
    const match = semesterLabel.match(/\d+/);
    return match ? Number(match[0]) : 1;
  }

  private getDueText(dueDateIso: string): { dueText: string; diffDays: number } {
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

  private resolveFacultyForSubject(student: Student, subject: SubjectRecord): { faculty: string; weeklyHours: number } {
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

    return {
      faculty: alloc?.faculty || matchingSlots[0]?.facultyName || 'Department Faculty',
      weeklyHours: alloc?.weeklyHours ?? (matchingSlots.length > 0 ? matchingSlots.length : subject.type === 'Practical' ? 2 : 3)
    };
  }

  private formatChartDate(dateStr: string): string {
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short'
    }).format(parsed);
  }

  private parseTimeToMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  private formatTimeRange(periodId: string): string {
    const startMins = this.parseTimeToMinutes(periodId);
    const endMins = startMins + 60;
    const fmt = (total: number) => {
      const h24 = Math.floor(total / 60) % 24;
      const m = total % 60;
      const suffix = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
    };
    return `${fmt(startMins)} - ${fmt(endMins)}`;
  }

  buildChildSnapshot(student: Student): ChildOverviewSnapshot {
    const threshold = this.attendanceThreshold();
    const subjects = this.academicService.subjects();
    const subjectsById = new Map(subjects.map(s => [s.id, s]));

    const sectionSessions = this.attendanceService
      .sessions()
      .filter(
        sess =>
          sess.courseId === student.courseId &&
          sess.semester === student.semester &&
          sess.sectionId === student.sectionId
      )
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));

    const logs = sectionSessions.map(sess => ({
      sessionId: sess.id,
      date: sess.date,
      subjectId: sess.subjectId,
      status: this.attendanceService.getStudentStatusForSession(sess.id, student.id)
    }));

    const courseSubjects = subjects.filter(
      sub => sub.course === student.course && sub.semester === student.semester && sub.status === 'Active'
    );

    const subjectLogsMap = new Map<string, { code: string; name: string; attended: number; absent: number; leave: number; total: number }>();
    for (const sub of courseSubjects) {
      subjectLogsMap.set(sub.id, { code: sub.code, name: sub.name, attended: 0, absent: 0, leave: 0, total: 0 });
    }
    for (const log of logs) {
      let entry = subjectLogsMap.get(log.subjectId);
      if (!entry) {
        const subMeta = subjectsById.get(log.subjectId);
        entry = {
          code: subMeta?.code || log.subjectId.toUpperCase(),
          name: subMeta?.name || log.subjectId,
          attended: 0,
          absent: 0,
          leave: 0,
          total: 0
        };
        subjectLogsMap.set(log.subjectId, entry);
      }
      entry.total += 1;
      if (log.status === 'Present') entry.attended += 1;
      else if (log.status === 'Absent') entry.absent += 1;
      else entry.leave += 1;
    }

    const subjectAttendances: ParentSubjectAttendance[] = [];
    for (const [subjectId, entry] of subjectLogsMap.entries()) {
      if (entry.total === 0) continue;
      const percentage = Math.round((entry.attended / entry.total) * 100);
      subjectAttendances.push({
        subjectId,
        code: entry.code,
        name: entry.name,
        held: entry.total,
        attended: entry.attended,
        absent: entry.absent,
        leave: entry.leave,
        total: entry.total,
        percentage,
        isLow: percentage < threshold
      });
    }

    const totalAttended = logs.filter(l => l.status === 'Present').length;
    const totalSessions = logs.length;
    const overallAttendancePct = totalSessions > 0 ? Math.round((totalAttended / totalSessions) * 1000) / 10 : 0;
    const isLowAttendance = totalSessions > 0 && overallAttendancePct < threshold;

    const byDate = new Map<string, { attended: number; total: number }>();
    for (const log of logs) {
      const bucket = byDate.get(log.date) || { attended: 0, total: 0 };
      bucket.total += 1;
      if (log.status === 'Present') bucket.attended += 1;
      byDate.set(log.date, bucket);
    }

    const attendanceTrend: AttendanceTrendPoint[] = [];
    let runningAttended = 0;
    let runningTotal = 0;
    const sortedDates = Array.from(byDate.keys()).sort((a, b) => a.localeCompare(b));
    for (const date of sortedDates) {
      const dayStats = byDate.get(date)!;
      runningAttended += dayStats.attended;
      runningTotal += dayStats.total;
      const pct = runningTotal > 0 ? Math.round((runningAttended / runningTotal) * 1000) / 10 : 0;
      attendanceTrend.push({
        date,
        label: this.formatChartDate(date),
        percentage: pct
      });
    }

    const courseSubjectIds = new Set(subjects.filter(s => s.course === student.course).map(s => s.id));
    const submissionsByAsg = new Map(
      this.assignmentsService
        .submissions()
        .filter(subm => subm.studentId === student.id)
        .map(subm => [subm.assignmentId, subm])
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pendingAssignments = this.assignmentsService
      .assignments()
      .filter(a => {
        if (a.sectionId !== student.sectionId || !courseSubjectIds.has(a.subjectId) || a.status === 'Closed') {
          return false;
        }
        const subm = submissionsByAsg.get(a.id);
        return !subm || subm.status === 'Draft';
      });

    const overdueAssignmentsCount = pendingAssignments.filter(a => {
      const due = new Date(a.dueDate);
      due.setHours(0, 0, 0, 0);
      return a.status === 'Overdue' || due < today;
    }).length;

    const upcomingExams = this.examinationsService
      .exams()
      .filter(ex => ex.courseId === student.courseId && ex.semester === student.semester && ex.status !== 'Completed')
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));

    const examsById = new Map(this.examinationsService.exams().map(e => [e.id, e]));
    const publishedResults: ParentPublishedResult[] = this.resultsService
      .results()
      .filter(r => r.studentId === student.id && r.status === 'Published')
      .map(r => {
        const exam = examsById.get(r.examId);
        const percentage = r.maxMarks > 0 ? Math.round((r.marksObtained / r.maxMarks) * 100) : 0;
        const gradeInfo = getGrade(percentage);
        return {
          id: r.id,
          examId: r.examId,
          examTitle: exam?.title || 'Examination',
          subjectName: exam?.subjectName || 'Subject',
          examDate: exam?.date || '2026-01-01',
          marksObtained: r.marksObtained,
          maxMarks: r.maxMarks,
          percentage,
          grade: r.grade || gradeInfo.grade
        };
      })
      .sort((a, b) => b.examDate.localeCompare(a.examDate));

    const averageMarksPct =
      publishedResults.length > 0
        ? Math.round((publishedResults.reduce((acc, r) => acc + r.percentage, 0) / publishedResults.length) * 10) / 10
        : null;

    const semGpaRows: { semester: string; credits: number; gradePoint: number }[] = this.resultsService
      .results()
      .filter(r => r.studentId === student.id && r.status === 'Published')
      .map(r => {
        const exam = examsById.get(r.examId);
        const subject = exam ? subjectsById.get(exam.subjectId) : undefined;
        const pct = r.maxMarks > 0 ? Math.round((r.marksObtained / r.maxMarks) * 100) : 0;
        const gradeInfo = getGrade(pct);
        return {
          semester: exam?.semester || student.semester,
          credits: subject?.credits ?? 4,
          gradePoint: gradeInfo.point
        };
      });

    const computeWeightedGpa = (rows: { credits: number; gradePoint: number }[]): number => {
      if (rows.length === 0) return 0;
      const totalCredits = rows.reduce((acc, r) => acc + r.credits, 0);
      if (totalCredits === 0) return 0;
      const weighted = rows.reduce((acc, r) => acc + r.gradePoint * r.credits, 0);
      return Math.round((weighted / totalCredits) * 100) / 100;
    };

    const currentSemGpaRows = semGpaRows.filter(r => r.semester === student.semester);
    const sgpa = computeWeightedGpa(currentSemGpaRows.length > 0 ? currentSemGpaRows : semGpaRows);
    const cgpa = computeWeightedGpa(semGpaRows);

    const ledger = this.financeService.ledgers().find(l => l.studentId === student.id);
    const structure = ledger
      ? this.financeService.structures().find(s => s.id === ledger.structureId)
      : this.financeService.structures().find(s => s.courseId === student.courseId);

    let feeSummary: ParentFeeSummary = {
      total: 0,
      paid: 0,
      due: 0,
      nextDueDate: null,
      overdueCount: 0,
      firstOverdueLabel: null,
      firstOverdueAmount: 0,
      firstOverdueDate: null
    };

    if (ledger) {
      const lateFineRate = structure?.lateFinePerDay || 50;
      const evaluatedInsts = ledger.installments.map(inst => {
        const baseNet = Math.max(0, inst.totalAmount - inst.concessionAmount);
        const isSettled = inst.paidAmount >= baseNet + inst.fineAmount;
        const due = new Date(inst.dueDate);
        due.setHours(0, 0, 0, 0);
        const dynamicFine = !isSettled && today > due ? this.financeService.calculateFine(inst.dueDate, lateFineRate) : 0;
        const effectiveFine = Math.max(inst.fineAmount, dynamicFine);
        const balance = Math.max(0, inst.totalAmount + effectiveFine - inst.concessionAmount - inst.paidAmount);
        const isOverdue = balance > 0 && today > due;
        return {
          label: inst.label,
          dueDate: inst.dueDate,
          totalWithFine: inst.totalAmount + effectiveFine - inst.concessionAmount,
          paidAmount: inst.paidAmount,
          balance,
          isOverdue
        };
      });

      const total = evaluatedInsts.reduce((acc, i) => acc + i.totalWithFine, 0);
      const paid = evaluatedInsts.reduce((acc, i) => acc + i.paidAmount, 0);
      const due = Math.max(0, total - paid);

      const unpaidSorted = evaluatedInsts
        .filter(i => i.balance > 0)
        .slice()
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

      const overdueList = unpaidSorted.filter(i => i.isOverdue);

      feeSummary = {
        total,
        paid,
        due,
        nextDueDate: unpaidSorted.length > 0 ? unpaidSorted[0].dueDate : null,
        overdueCount: overdueList.length,
        firstOverdueLabel: overdueList.length > 0 ? overdueList[0].label : null,
        firstOverdueAmount: overdueList.length > 0 ? overdueList[0].balance : 0,
        firstOverdueDate: overdueList.length > 0 ? overdueList[0].dueDate : null
      };
    }

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
    const todayShort = days[new Date().getDay()] || 'Mon';
    const semNum = this.parseSemesterNumber(student.semester);
    let todaysTimetable: ParentTimetablePeriod[] = [];

    if (todayShort !== 'Sun') {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      const slots = this.timetableService
        .slots()
        .filter(
          s =>
            s.courseId === student.courseId &&
            s.semester === semNum &&
            s.sectionId === student.sectionId &&
            s.day === todayShort
        )
        .slice()
        .sort((a, b) => this.parseTimeToMinutes(a.periodId) - this.parseTimeToMinutes(b.periodId));

      const hasCurrent = slots.some(s => {
        const start = this.parseTimeToMinutes(s.periodId);
        return nowMinutes >= start && nowMinutes < start + 60;
      });

      let markedNext = false;
      todaysTimetable = slots.map(s => {
        const start = this.parseTimeToMinutes(s.periodId);
        let status: ParentTimetablePeriod['status'] = 'upcoming';

        if (nowMinutes >= start && nowMinutes < start + 60) status = 'current';
        else if (nowMinutes >= start + 60) status = 'completed';
        else if (!hasCurrent && !markedNext && start > nowMinutes) {
          status = 'next';
          markedNext = true;
        }

        return {
          id: s.id,
          timeRange: this.formatTimeRange(s.periodId),
          subjectName: s.subjectName,
          subjectType: s.subjectType,
          facultyName: s.facultyName,
          room: s.room,
          status
        };
      });
    }

    const notices = this.communicationService
      .notices()
      .filter(
        n =>
          n.status === 'Published' &&
          (n.audience === 'All' || n.audience === 'Parents' || (n.audience === 'Course-wise' && n.courseId === student.courseId))
      )
      .slice()
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return b.publishDate.localeCompare(a.publishDate);
      });

    const alerts: ParentAlertItem[] = [];
    const lowSubjects = subjectAttendances.filter(s => s.isLow);
    if (isLowAttendance) {
      alerts.push({
        id: `alert-att-overall-${student.id}`,
        category: 'Attendance',
        title: `Overall attendance below ${threshold}%`,
        description: `${student.name} currently stands at ${overallAttendancePct}% across ${totalSessions} recorded sessions.`,
        severity: 'Urgent',
        icon: 'warning',
        route: '/parent/attendance'
      });
    } else if (lowSubjects.length > 0) {
      alerts.push({
        id: `alert-att-sub-${student.id}`,
        category: 'Attendance',
        title: `${lowSubjects.length} ${lowSubjects.length === 1 ? 'subject' : 'subjects'} below ${threshold}% attendance`,
        description: `Lowest: ${lowSubjects[0].name} (${lowSubjects[0].percentage}%).`,
        severity: 'High',
        icon: 'warning',
        route: '/parent/attendance'
      });
    }

    if (feeSummary.overdueCount > 0 && feeSummary.firstOverdueDate) {
      alerts.push({
        id: `alert-fee-${student.id}`,
        category: 'Fees',
        title: `Overdue Fee: ${feeSummary.firstOverdueLabel}`,
        description: `${this.formatINR(feeSummary.firstOverdueAmount)} due since ${this.formatShortDate(feeSummary.firstOverdueDate)}. Pay online via Fees & Receipts or at the accounts office.`,
        severity: 'Urgent',
        icon: 'account_balance_wallet',
        route: '/parent/fees'
      });
    }

    if (publishedResults.length > 0) {
      const latest = publishedResults[0];
      alerts.push({
        id: `alert-result-${latest.id}`,
        category: 'Result',
        title: `Published Result: ${latest.examTitle}`,
        description: `${latest.subjectName} — ${latest.marksObtained}/${latest.maxMarks} (${latest.percentage}%, Grade ${latest.grade}).`,
        severity: 'Info',
        icon: 'grade',
        route: '/parent/results'
      });
    }

    const urgentNotice = notices.find(n => n.priority === 'Urgent');
    if (urgentNotice) {
      alerts.push({
        id: `alert-notice-${urgentNotice.id}`,
        category: 'Notice',
        title: urgentNotice.title,
        description: urgentNotice.body.length > 110 ? urgentNotice.body.slice(0, 110) + '...' : urgentNotice.body,
        severity: 'Urgent',
        icon: 'campaign',
        route: '/parent/notices'
      });
    }

    return {
      student,
      overallAttendancePct,
      attendanceThreshold: threshold,
      isLowAttendance,
      subjectAttendances,
      attendanceTrend,
      pendingAssignmentsCount: pendingAssignments.length,
      overdueAssignmentsCount,
      upcomingExams,
      publishedResults,
      averageMarksPct,
      sgpa,
      cgpa,
      feeSummary,
      todaysTimetable,
      notices: notices.slice(0, 5),
      alerts
    };
  }
}
