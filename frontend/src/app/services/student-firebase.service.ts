import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Unsubscribe, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, testFirestoreConnection } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';
import { CurrentUserService } from './current-user.service';
import { FinanceService } from './finance.service';
import { StudentsService } from './students.service';
import { PaymentMode } from '../models/finance.model';

export type LeaveType = 'Medical' | 'On-Duty (OD)' | 'Academic Event' | 'Personal';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Withdrawn';

export interface LeaveRequestRecord {
  id: string;
  studentId: string;
  enrollmentNo: string;
  studentName: string;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveStatus;
  sessionRef?: string;
  ownerUid?: string;
  createdAt: string;
  updatedAt: string;
}

export type TicketCategory =
  | 'Bonafide Certificate'
  | 'ID Card Replacement'
  | 'Fee / Scholarship Discrepancy'
  | 'Exam / Admit Card'
  | 'Hostel / Transport'
  | 'Technical Support';

export type TicketPriority = 'Normal' | 'High' | 'Urgent';
export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export interface TicketReply {
  id: string;
  sender: string;
  senderRole: 'student' | 'admin';
  message: string;
  timestamp: string;
}

export interface SupportTicketRecord {
  id: string;
  ticketNo: string;
  studentId: string;
  enrollmentNo: string;
  studentName: string;
  category: TicketCategory;
  priority: TicketPriority;
  subject: string;
  description: string;
  status: TicketStatus;
  replies: TicketReply[];
  ownerUid?: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredFeePaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  courseName: string;
  title: string;
  amount: number;
  installmentId?: string;
  dueDate: string;
  paymentMethod: PaymentMode;
  status: 'Paid';
  receiptNo: string;
  refNo: string;
  ownerUid?: string;
  createdAt: string;
}

export interface ExamViolationLog {
  timestamp: string;
  reason: string;
}

export interface ExamAttemptRecord {
  id: string;
  examId: string;
  examTitle: string;
  subjectCode: string;
  mode: 'Online' | 'Offline' | 'Hybrid';
  studentId: string;
  enrollmentNo: string;
  status: 'In Progress' | 'Submitted';
  answersCount: number;
  answers: Record<string, string>;
  violationsCount: number;
  violationLogs: ExamViolationLog[];
  proctorVerified: boolean;
  startedAt: string;
  submittedAt: string;
  updatedAt: string;
  autoSubmitReason?: string;
  verificationHash: string;
  ownerUid?: string;
}

const LEAVE_STORAGE_KEY = 'eduerp_leave_requests_v1';
const TICKET_STORAGE_KEY = 'eduerp_support_tickets_v1';
const PAYMENT_STORAGE_KEY = 'eduerp_fee_payments_v1';
const EXAM_ATTEMPTS_STORAGE_KEY = 'eduerp_exam_attempts_v1';

const SEED_LEAVE_REQUESTS: LeaveRequestRecord[] = [
  {
    id: 'lr-seed-1',
    studentId: 'stu-1',
    enrollmentNo: 'MCA2025001',
    studentName: 'Rahul Verma',
    leaveType: 'Academic Event',
    fromDate: '2026-11-04',
    toDate: '2026-11-04',
    reason: 'Represented the department at the Inter-University Cloud Hackathon finals.',
    status: 'Approved',
    createdAt: '2026-11-03T10:15:00.000Z',
    updatedAt: '2026-11-04T09:30:00.000Z',
  },
];

const SEED_SUPPORT_TICKETS: SupportTicketRecord[] = [
  {
    id: 'tkt-seed-1',
    ticketNo: 'TKT-2026-104',
    studentId: 'stu-1',
    enrollmentNo: 'MCA2025001',
    studentName: 'Rahul Verma',
    category: 'Bonafide Certificate',
    priority: 'Normal',
    subject: 'Bonafide Certificate for Education Loan Renewal',
    description:
      'Requesting an official bonafide and fee-structure letter stamped by the Registrar office for Semester 2 bank loan disbursement.',
    status: 'In Progress',
    replies: [
      {
        id: 'rep-seed-1',
        sender: 'Student Cell Desk',
        senderRole: 'admin',
        message: 'Verified enrollment MCA2025001. Your signed certificate is under Registrar counter-signature and will be ready within 24 hours.',
        timestamp: '2026-11-12T11:20:00.000Z',
      },
    ],
    createdAt: '2026-11-11T14:10:00.000Z',
    updatedAt: '2026-11-12T11:20:00.000Z',
  },
  {
    id: 'tkt-seed-2',
    ticketNo: 'TKT-2026-089',
    studentId: 'stu-1',
    enrollmentNo: 'MCA2025001',
    studentName: 'Rahul Verma',
    category: 'ID Card Replacement',
    priority: 'High',
    subject: 'RFID Library Card Activation Issue',
    description:
      'My smart student ID card scans cleanly at the main gate turnstile but shows Unregistered at the Central Library kiosk.',
    status: 'Resolved',
    replies: [
      {
        id: 'rep-seed-2',
        sender: 'IT Helpdesk',
        senderRole: 'admin',
        message: 'Re-synced your RFID serial with the Koha Library directory. Please tap at the kiosk again.',
        timestamp: '2026-10-28T16:05:00.000Z',
      },
    ],
    createdAt: '2026-10-28T09:40:00.000Z',
    updatedAt: '2026-10-28T16:05:00.000Z',
  },
];

@Injectable({ providedIn: 'root' })
export class StudentFirebaseService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly userService = inject(CurrentUserService);
  private readonly financeService = inject(FinanceService);
  private readonly studentsService = inject(StudentsService);

  private readonly _leaveRequests = signal<LeaveRequestRecord[]>(this.loadInitialLeaves());
  private readonly _supportTickets = signal<SupportTicketRecord[]>(this.loadInitialTickets());
  private readonly _examAttempts = signal<ExamAttemptRecord[]>(this.loadInitialExamAttempts());
  private readonly _authUid = signal<string | null>(auth.currentUser?.uid ?? null);
  private readonly _isCloudSynced = signal<boolean>(false);

  private leaveUnsub: Unsubscribe | null = null;
  private ticketUnsub: Unsubscribe | null = null;
  private paymentUnsub: Unsubscribe | null = null;
  private examAttemptUnsub: Unsubscribe | null = null;
  private appliedPaymentIds = new Set<string>();

  readonly leaveRequests = this._leaveRequests.asReadonly();
  readonly supportTickets = this._supportTickets.asReadonly();
  readonly examAttempts = this._examAttempts.asReadonly();
  readonly isCloudSynced = this._isCloudSynced.asReadonly();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void testFirestoreConnection();
      this.rehydrateStoredPayments();

      onAuthStateChanged(auth, user => {
        this._authUid.set(user?.uid ?? null);
      });

      effect(() => {
        const uid = this._authUid();
        this.teardownListeners();
        if (uid) {
          this.attachListeners(uid);
        } else {
          this._isCloudSynced.set(false);
        }
      });
    }
  }

  private loadInitialLeaves(): LeaveRequestRecord[] {
    if (!isPlatformBrowser(this.platformId)) return SEED_LEAVE_REQUESTS;
    try {
      const raw = localStorage.getItem(LEAVE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LeaveRequestRecord[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore corrupted localStorage
    }
    return SEED_LEAVE_REQUESTS;
  }

  private loadInitialTickets(): SupportTicketRecord[] {
    if (!isPlatformBrowser(this.platformId)) return SEED_SUPPORT_TICKETS;
    try {
      const raw = localStorage.getItem(TICKET_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SupportTicketRecord[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore corrupted localStorage
    }
    return SEED_SUPPORT_TICKETS;
  }

  private saveLocalLeaves(list: LeaveRequestRecord[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(LEAVE_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ignore storage quota errors
    }
  }

  private saveLocalTickets(list: SupportTicketRecord[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(TICKET_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ignore storage quota errors
    }
  }

  private loadInitialExamAttempts(): ExamAttemptRecord[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const raw = localStorage.getItem(EXAM_ATTEMPTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ExamAttemptRecord[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore corrupted localStorage
    }
    return [];
  }

  private saveLocalExamAttempts(list: ExamAttemptRecord[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(EXAM_ATTEMPTS_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ignore storage quota errors
    }
  }

  private rehydrateStoredPayments(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const raw = localStorage.getItem(PAYMENT_STORAGE_KEY);
      if (!raw) return;
      const list = JSON.parse(raw) as StoredFeePaymentRecord[];
      for (const rec of list) {
        this.applyPaymentToFinanceLedger(rec);
      }
    } catch {
      // ignore storage parse issues
    }
  }

  private applyPaymentToFinanceLedger(rec: StoredFeePaymentRecord): void {
    if (this.appliedPaymentIds.has(rec.id)) return;
    this.appliedPaymentIds.add(rec.id);

    const alreadyRecorded = this.financeService
      .payments()
      .some(p => p.refNo === rec.refNo && p.studentId === rec.studentId);
    if (alreadyRecorded) return;

    const ledger = this.financeService.getLedgerByStudent(rec.studentId);
    if (!ledger) return;

    const items = rec.installmentId
      ? [{ installmentId: rec.installmentId, amount: rec.amount, fine: 0 }]
      : ledger.installments
          .filter(i => i.totalAmount + i.fineAmount - i.concessionAmount - i.paidAmount > 0)
          .map(i => ({
            installmentId: i.installmentId,
            amount: Math.max(0, i.totalAmount + i.fineAmount - i.concessionAmount - i.paidAmount),
            fine: 0,
          }));

    if (items.length === 0) return;

    this.financeService.collectPayment({
      studentId: rec.studentId,
      studentName: rec.studentName,
      courseName: rec.courseName,
      date: rec.createdAt.split('T')[0],
      subtotal: rec.amount,
      concession: 0,
      fine: 0,
      total: rec.amount,
      mode: rec.paymentMethod,
      refNo: rec.refNo,
      items,
      collectedBy: 'Online Payment Gateway',
    });
  }

  private teardownListeners(): void {
    this.leaveUnsub?.();
    this.ticketUnsub?.();
    this.paymentUnsub?.();
    this.examAttemptUnsub?.();
    this.leaveUnsub = null;
    this.ticketUnsub = null;
    this.paymentUnsub = null;
    this.examAttemptUnsub = null;
  }

  private attachListeners(uid: string): void {
    this._isCloudSynced.set(true);

    const leaveQ = query(collection(db, 'leaveRequests'), where('ownerUid', '==', uid));
    this.leaveUnsub = onSnapshot(
      leaveQ,
      snapshot => {
        const cloudRows = snapshot.docs.map(d => d.data() as LeaveRequestRecord);
        if (cloudRows.length > 0) {
          this._leaveRequests.update(local => {
            const byId = new Map(local.map(item => [item.id, item]));
            for (const row of cloudRows) {
              byId.set(row.id, row);
            }
            const merged = Array.from(byId.values()).sort((a, b) =>
              b.createdAt.localeCompare(a.createdAt)
            );
            this.saveLocalLeaves(merged);
            return merged;
          });
        }
      },
      error => handleFirestoreError(error, OperationType.LIST, 'leaveRequests')
    );

    const ticketQ = query(collection(db, 'supportTickets'), where('ownerUid', '==', uid));
    this.ticketUnsub = onSnapshot(
      ticketQ,
      snapshot => {
        const cloudRows = snapshot.docs.map(d => d.data() as SupportTicketRecord);
        if (cloudRows.length > 0) {
          this._supportTickets.update(local => {
            const byId = new Map(local.map(item => [item.id, item]));
            for (const row of cloudRows) {
              byId.set(row.id, row);
            }
            const merged = Array.from(byId.values()).sort((a, b) =>
              b.updatedAt.localeCompare(a.updatedAt)
            );
            this.saveLocalTickets(merged);
            return merged;
          });
        }
      },
      error => handleFirestoreError(error, OperationType.LIST, 'supportTickets')
    );

    const paymentQ = query(collection(db, 'feePayments'), where('ownerUid', '==', uid));
    this.paymentUnsub = onSnapshot(
      paymentQ,
      snapshot => {
        for (const d of snapshot.docs) {
          this.applyPaymentToFinanceLedger(d.data() as StoredFeePaymentRecord);
        }
      },
      error => handleFirestoreError(error, OperationType.LIST, 'feePayments')
    );

    const attemptQ = query(collection(db, 'examAttempts'), where('ownerUid', '==', uid));
    this.examAttemptUnsub = onSnapshot(
      attemptQ,
      snapshot => {
        const cloudRows = snapshot.docs.map(d => d.data() as ExamAttemptRecord);
        if (cloudRows.length > 0) {
          this._examAttempts.update(local => {
            const byId = new Map(local.map(item => [item.id, item]));
            for (const row of cloudRows) {
              byId.set(row.id, row);
            }
            const merged = Array.from(byId.values());
            this.saveLocalExamAttempts(merged);
            return merged;
          });
        }
      },
      error => handleFirestoreError(error, OperationType.LIST, 'examAttempts')
    );
  }

  async submitLeaveRequest(payload: {
    leaveType: LeaveType;
    fromDate: string;
    toDate: string;
    reason: string;
    sessionRef?: string;
  }): Promise<{ success: boolean; record?: LeaveRequestRecord; error?: string }> {
    const student = this.userService.currentStudent();
    const nowIso = new Date().toISOString();
    const id = `lr-${Date.now()}`;
    const uid = auth.currentUser?.uid;

    const record: LeaveRequestRecord = {
      id,
      studentId: student.id,
      enrollmentNo: student.enrollmentNo.slice(0, 64),
      studentName: student.name.slice(0, 120),
      leaveType: payload.leaveType,
      fromDate: payload.fromDate.slice(0, 50),
      toDate: payload.toDate.slice(0, 50),
      reason: payload.reason.trim().slice(0, 500),
      status: 'Pending',
      ...(payload.sessionRef ? { sessionRef: payload.sessionRef.slice(0, 100) } : {}),
      ...(uid ? { ownerUid: uid } : {}),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this._leaveRequests.update(list => {
      const updated = [record, ...list];
      this.saveLocalLeaves(updated);
      return updated;
    });

    if (uid) {
      try {
        await setDoc(doc(db, 'leaveRequests', id), record);
      } catch (error) {
        this.studentsService.showToast('warning', 'Leave saved locally; cloud sync requires verified sign-in.');
        handleFirestoreError(error, OperationType.CREATE, `leaveRequests/${id}`);
      }
    }

    this.studentsService.showToast(
      'success',
      `Leave / regularization request submitted for ${payload.fromDate}.`
    );
    return { success: true, record };
  }

  async withdrawLeaveRequest(requestId: string): Promise<void> {
    const target = this._leaveRequests().find(r => r.id === requestId);
    if (!target || target.status !== 'Pending') return;

    const updatedAt = new Date().toISOString();
    this._leaveRequests.update(list => {
      const next = list.map(r =>
        r.id === requestId ? { ...r, status: 'Withdrawn' as LeaveStatus, updatedAt } : r
      );
      this.saveLocalLeaves(next);
      return next;
    });

    const uid = auth.currentUser?.uid;
    if (uid && target.ownerUid === uid) {
      try {
        await updateDoc(doc(db, 'leaveRequests', requestId), {
          status: 'Withdrawn',
          updatedAt,
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `leaveRequests/${requestId}`);
      }
    }

    this.studentsService.showToast('info', 'Pending leave request withdrawn.');
  }

  async createSupportTicket(payload: {
    category: TicketCategory;
    priority: TicketPriority;
    subject: string;
    description: string;
  }): Promise<SupportTicketRecord> {
    const student = this.userService.currentStudent();
    const nowIso = new Date().toISOString();
    const id = `tkt-${Date.now()}`;
    const ticketNo = `TKT-2026-${String(Math.floor(200 + Math.random() * 799))}`;
    const uid = auth.currentUser?.uid;

    const record: SupportTicketRecord = {
      id,
      ticketNo,
      studentId: student.id,
      enrollmentNo: student.enrollmentNo.slice(0, 64),
      studentName: student.name.slice(0, 120),
      category: payload.category,
      priority: payload.priority,
      subject: payload.subject.trim().slice(0, 200),
      description: payload.description.trim().slice(0, 1000),
      status: 'Open',
      replies: [],
      ...(uid ? { ownerUid: uid } : {}),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this._supportTickets.update(list => {
      const next = [record, ...list];
      this.saveLocalTickets(next);
      return next;
    });

    if (uid) {
      try {
        await setDoc(doc(db, 'supportTickets', id), record);
      } catch (error) {
        this.studentsService.showToast('warning', 'Ticket saved locally; cloud sync requires verified sign-in.');
        handleFirestoreError(error, OperationType.CREATE, `supportTickets/${id}`);
      }
    }

    this.studentsService.showToast('success', `Support ticket ${ticketNo} created.`);
    return record;
  }

  async replyToSupportTicket(ticketId: string, message: string): Promise<void> {
    const cleanMsg = message.trim().slice(0, 1000);
    if (!cleanMsg) return;

    const student = this.userService.currentStudent();
    const target = this._supportTickets().find(t => t.id === ticketId);
    if (!target || target.status === 'Closed') return;

    const nowIso = new Date().toISOString();
    const newReply: TicketReply = {
      id: `rep-${Date.now()}`,
      sender: student.name,
      senderRole: 'student',
      message: cleanMsg,
      timestamp: nowIso,
    };
    const nextReplies = [...target.replies, newReply].slice(0, 50);

    this._supportTickets.update(list => {
      const next = list.map(t =>
        t.id === ticketId ? { ...t, replies: nextReplies, updatedAt: nowIso } : t
      );
      this.saveLocalTickets(next);
      return next;
    });

    const uid = auth.currentUser?.uid;
    if (uid && target.ownerUid === uid) {
      try {
        await updateDoc(doc(db, 'supportTickets', ticketId), {
          replies: nextReplies,
          updatedAt: nowIso,
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `supportTickets/${ticketId}`);
      }
    }

    this.studentsService.showToast('success', 'Follow-up reply posted.');
  }

  async recordFeePayment(payload: {
    title: string;
    amount: number;
    dueDate: string;
    installmentId?: string;
    paymentMethod: PaymentMode;
    items: { installmentId: string; amount: number; fine: number }[];
  }): Promise<{ receiptNo: string; refNo: string }> {
    const student = this.userService.currentStudent();
    const nowIso = new Date().toISOString();
    const id = `pay-${Date.now()}`;
    const refNo = `${payload.paymentMethod.toUpperCase()}-${Math.floor(10000000 + Math.random() * 89999999)}`;
    const uid = auth.currentUser?.uid;

    const payment = this.financeService.collectPayment({
      studentId: student.id,
      studentName: student.name,
      courseName: student.course,
      date: nowIso.split('T')[0],
      subtotal: payload.amount,
      concession: 0,
      fine: 0,
      total: payload.amount,
      mode: payload.paymentMethod,
      refNo,
      items: payload.items,
      collectedBy: 'Online Payment Gateway',
    });

    const stored: StoredFeePaymentRecord = {
      id,
      studentId: student.id,
      studentName: student.name.slice(0, 120),
      courseName: student.course.slice(0, 100),
      title: payload.title.slice(0, 150),
      amount: payload.amount,
      ...(payload.installmentId ? { installmentId: payload.installmentId } : {}),
      dueDate: payload.dueDate.slice(0, 50),
      paymentMethod: payload.paymentMethod,
      status: 'Paid',
      receiptNo: payment.receiptNo.slice(0, 60),
      refNo,
      ...(uid ? { ownerUid: uid } : {}),
      createdAt: nowIso,
    };

    this.appliedPaymentIds.add(id);

    if (isPlatformBrowser(this.platformId)) {
      try {
        const raw = localStorage.getItem(PAYMENT_STORAGE_KEY);
        const existing: StoredFeePaymentRecord[] = raw ? JSON.parse(raw) : [];
        localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify([stored, ...existing]));
      } catch {
        // ignore storage error
      }
    }

    if (uid) {
      try {
        await setDoc(doc(db, 'feePayments', id), stored);
      } catch (error) {
        this.studentsService.showToast('warning', 'Payment recorded locally; cloud sync requires verified sign-in.');
        handleFirestoreError(error, OperationType.CREATE, `feePayments/${id}`);
      }
    }

    this.studentsService.showToast(
      'success',
      `Payment successful! Receipt ${payment.receiptNo} generated.`
    );
    return { receiptNo: payment.receiptNo, refNo };
  }

  getExamAttempt(examId: string, studentId?: string): ExamAttemptRecord | null {
    const sid = studentId || this.userService.currentStudent().id;
    return this._examAttempts().find(a => a.examId === examId && a.studentId === sid) ?? null;
  }

  async startOnlineExam(payload: {
    examId: string;
    examTitle: string;
    subjectCode: string;
    mode: 'Online' | 'Offline' | 'Hybrid';
  }): Promise<ExamAttemptRecord> {
    const student = this.userService.currentStudent();
    const attemptId = `${payload.examId}_${student.id}`;
    const existing = this._examAttempts().find(a => a.id === attemptId);
    if (existing) return existing;

    const nowIso = new Date().toISOString();
    const uid = auth.currentUser?.uid;
    const verificationHash = `EX-${payload.subjectCode.replace(/[^a-zA-Z0-9]/g, '')}-${student.enrollmentNo.slice(-4)}-${Date.now().toString(36).toUpperCase()}`.slice(0, 60);

    const record: ExamAttemptRecord = {
      id: attemptId,
      examId: payload.examId,
      examTitle: payload.examTitle.slice(0, 200),
      subjectCode: payload.subjectCode.slice(0, 30),
      mode: payload.mode,
      studentId: student.id,
      enrollmentNo: student.enrollmentNo.slice(0, 64),
      status: 'In Progress',
      answersCount: 0,
      answers: {},
      violationsCount: 0,
      violationLogs: [],
      proctorVerified: true,
      startedAt: nowIso,
      submittedAt: '',
      updatedAt: nowIso,
      verificationHash,
      ...(uid ? { ownerUid: uid } : {}),
    };

    this._examAttempts.update(list => {
      const next = [record, ...list];
      this.saveLocalExamAttempts(next);
      return next;
    });

    if (uid) {
      try {
        await setDoc(doc(db, 'examAttempts', attemptId), record);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `examAttempts/${attemptId}`);
      }
    }

    return record;
  }

  private sanitizeAnswers(answers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    for (const [k, v] of Object.entries(answers).slice(0, 40)) {
      if (typeof v === 'string' && v.trim().length > 0) {
        sanitized[k.slice(0, 64)] = v.trim().slice(0, 1500);
      }
    }
    return sanitized;
  }

  async saveOnlineExamProgress(attemptId: string, rawAnswers: Record<string, string>): Promise<void> {
    const target = this._examAttempts().find(a => a.id === attemptId);
    if (!target || target.status === 'Submitted') return;

    const answers = this.sanitizeAnswers(rawAnswers);
    const answersCount = Object.keys(answers).length;
    const updatedAt = new Date().toISOString();

    this._examAttempts.update(list => {
      const next = list.map(a =>
        a.id === attemptId ? { ...a, answers, answersCount, updatedAt } : a
      );
      this.saveLocalExamAttempts(next);
      return next;
    });

    const uid = auth.currentUser?.uid;
    if (uid && target.ownerUid === uid) {
      try {
        await updateDoc(doc(db, 'examAttempts', attemptId), {
          answers,
          answersCount,
          updatedAt,
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `examAttempts/${attemptId}`);
      }
    }
  }

  async recordOnlineExamViolation(attemptId: string, reason: string): Promise<number> {
    const target = this._examAttempts().find(a => a.id === attemptId);
    if (!target || target.status === 'Submitted') return target?.violationsCount ?? 0;

    const updatedAt = new Date().toISOString();
    const nextCount = Math.min(10, target.violationsCount + 1);
    const nextLogs = [
      ...target.violationLogs,
      { timestamp: updatedAt, reason: reason.slice(0, 160) },
    ].slice(0, 20);

    this._examAttempts.update(list => {
      const next = list.map(a =>
        a.id === attemptId ? { ...a, violationsCount: nextCount, violationLogs: nextLogs, updatedAt } : a
      );
      this.saveLocalExamAttempts(next);
      return next;
    });

    const uid = auth.currentUser?.uid;
    if (uid && target.ownerUid === uid) {
      try {
        await updateDoc(doc(db, 'examAttempts', attemptId), {
          violationsCount: nextCount,
          violationLogs: nextLogs,
          updatedAt,
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `examAttempts/${attemptId}`);
      }
    }

    return nextCount;
  }

  async submitOnlineExam(
    attemptId: string,
    rawAnswers: Record<string, string>,
    autoSubmitReason?: string
  ): Promise<ExamAttemptRecord | null> {
    const target = this._examAttempts().find(a => a.id === attemptId);
    if (!target) return null;
    if (target.status === 'Submitted') return target;

    const answers = this.sanitizeAnswers(rawAnswers);
    const answersCount = Object.keys(answers).length;
    const nowIso = new Date().toISOString();
    const reasonClean = autoSubmitReason ? autoSubmitReason.slice(0, 160) : undefined;

    let finalized: ExamAttemptRecord | null = null;
    this._examAttempts.update(list => {
      const next = list.map(a => {
        if (a.id !== attemptId) return a;
        finalized = {
          ...a,
          status: 'Submitted',
          answers,
          answersCount,
          submittedAt: nowIso,
          updatedAt: nowIso,
          ...(reasonClean ? { autoSubmitReason: reasonClean } : {}),
        };
        return finalized;
      });
      this.saveLocalExamAttempts(next);
      return next;
    });

    const uid = auth.currentUser?.uid;
    if (uid && target.ownerUid === uid) {
      try {
        await updateDoc(doc(db, 'examAttempts', attemptId), {
          status: 'Submitted',
          answers,
          answersCount,
          submittedAt: nowIso,
          updatedAt: nowIso,
          ...(reasonClean ? { autoSubmitReason: reasonClean } : {}),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `examAttempts/${attemptId}`);
      }
    }

    this.studentsService.showToast(
      autoSubmitReason ? 'warning' : 'success',
      autoSubmitReason
        ? `Exam auto-submitted (${autoSubmitReason}).`
        : `Online exam submitted (${answersCount} responses locked).`
    );
    return finalized;
  }
}
