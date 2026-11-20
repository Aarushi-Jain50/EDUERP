import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  FeeStatus,
  FeeStructure,
  Payment,
  Scholarship,
  StudentFeeLedger,
} from '../models/finance.model';
import { StudentsService } from './students.service';
import { ActivityService } from './activity.service';
import { AuditService } from './audit.service';
import { FirestoreCollectionSync } from '../lib/firestore-collection-sync';

const SEED_STRUCTURES: FeeStructure[] = [
  {
    id: 'fs-1',
    courseId: 'course-mca',
    courseName: 'Master of Computer Applications',
    academicYear: '2025-26',
    lateFinePerDay: 50,
    totalFee: 120000,
    status: 'Active',
    installments: [
      {
        id: 'inst-1',
        label: '1st Installment',
        dueDate: '2025-08-15',
        totalAmount: 60000,
        heads: [
          { id: 'h-1', name: 'Tuition Fee', amount: 40000 },
          { id: 'h-2', name: 'Admission Fee', amount: 15000 },
          { id: 'h-3', name: 'Library Fee', amount: 5000 },
        ],
      },
      {
        id: 'inst-2',
        label: '2nd Installment',
        dueDate: '2026-12-15',
        totalAmount: 60000,
        heads: [
          { id: 'h-4', name: 'Tuition Fee', amount: 40000 },
          { id: 'h-5', name: 'Development Fee', amount: 15000 },
          { id: 'h-6', name: 'Exam Fee', amount: 5000 },
        ],
      },
    ],
  },
  {
    id: 'fs-2',
    courseId: 'course-btech-cse',
    courseName: 'B.Tech Computer Science & Engineering',
    academicYear: '2025-26',
    lateFinePerDay: 50,
    totalFee: 150000,
    status: 'Active',
    installments: [
      {
        id: 'inst-3',
        label: '1st Installment',
        dueDate: '2025-09-01',
        totalAmount: 90000,
        heads: [{ id: 'h-7', name: 'Tuition & Lab Fee', amount: 90000 }],
      },
      {
        id: 'inst-4',
        label: '2nd Installment',
        dueDate: '2026-12-20',
        totalAmount: 60000,
        heads: [{ id: 'h-8', name: 'Semester II Fee', amount: 60000 }],
      },
    ],
  },
  {
    id: 'fs-3',
    courseId: 'course-bca',
    courseName: 'Bachelor of Computer Applications',
    academicYear: '2025-26',
    lateFinePerDay: 50,
    totalFee: 80000,
    status: 'Active',
    installments: [
      {
        id: 'inst-5',
        label: '1st Installment',
        dueDate: '2025-08-20',
        totalAmount: 45000,
        heads: [{ id: 'h-9', name: 'Tuition Fee', amount: 45000 }],
      },
      {
        id: 'inst-6',
        label: '2nd Installment',
        dueDate: '2026-12-18',
        totalAmount: 35000,
        heads: [{ id: 'h-10', name: 'Semester II Fee', amount: 35000 }],
      },
    ],
  },
];

const SEED_SCHOLARSHIPS: Scholarship[] = [
  {
    id: 'sch-1',
    name: 'Chancellor Merit Scholarship',
    code: 'MERIT-25',
    type: 'Percentage',
    value: 25,
    courseId: 'All',
    courseName: 'All Programs',
    eligibility: 'CGPA >= 9.0 or Entrance Rank Top 5%',
    maxRecipients: 50,
    status: 'Active',
  },
  {
    id: 'sch-2',
    name: 'EWS & Financial Assistance Waiver',
    code: 'EWS-15K',
    type: 'Fixed',
    value: 15000,
    courseId: 'All',
    courseName: 'All Programs',
    eligibility: 'Verified family income certificate under ₹3L/annum',
    maxRecipients: 75,
    status: 'Active',
  },
  {
    id: 'sch-3',
    name: 'MCA Research & Innovation Grant',
    code: 'MCA-10K',
    type: 'Fixed',
    value: 10000,
    courseId: 'course-mca',
    courseName: 'Master of Computer Applications',
    eligibility: 'Published IEEE/ACM paper or Hackathon Winner',
    maxRecipients: 20,
    status: 'Active',
  },
];

const SEED_PAYMENTS: Payment[] = [
  {
    id: 'pay-seed-1',
    receiptNo: 'EDU/2025-26/00001',
    studentId: 'stu-1',
    studentName: 'Rahul Verma',
    courseName: 'Master of Computer Applications',
    date: '2025-08-10',
    subtotal: 60000,
    concession: 0,
    fine: 0,
    total: 60000,
    mode: 'UPI',
    refNo: 'UPI-50284910',
    items: [{ installmentId: 'inst-1', amount: 60000, fine: 0 }],
    collectedBy: 'Accounts Office',
    status: 'Paid',
  },
  {
    id: 'pay-seed-2',
    receiptNo: 'EDU/2025-26/00002',
    studentId: 'stu-2',
    studentName: 'Ananya Sharma',
    courseName: 'Master of Computer Applications',
    date: '2025-08-12',
    subtotal: 120000,
    concession: 0,
    fine: 0,
    total: 120000,
    mode: 'Card',
    refNo: 'CARD-7741209',
    items: [
      { installmentId: 'inst-1', amount: 60000, fine: 0 },
      { installmentId: 'inst-2', amount: 60000, fine: 0 },
    ],
    collectedBy: 'Accounts Office',
    status: 'Paid',
  },
  {
    id: 'pay-seed-3',
    receiptNo: 'EDU/2025-26/00003',
    studentId: 'stu-3',
    studentName: 'Priyanshu Das',
    courseName: 'Bachelor of Computer Applications',
    date: '2025-08-18',
    subtotal: 45000,
    concession: 0,
    fine: 0,
    total: 45000,
    mode: 'Cash',
    items: [{ installmentId: 'inst-5', amount: 45000, fine: 0 }],
    collectedBy: 'Accounts Office',
    status: 'Paid',
  },
  {
    id: 'pay-seed-4',
    receiptNo: 'EDU/2025-26/00004',
    studentId: 'stu-4',
    studentName: 'Meera Patel',
    courseName: 'B.Tech Computer Science & Engineering',
    date: '2025-08-29',
    subtotal: 90000,
    concession: 0,
    fine: 0,
    total: 90000,
    mode: 'Bank Transfer',
    refNo: 'NEFT-903412',
    items: [{ installmentId: 'inst-3', amount: 90000, fine: 0 }],
    collectedBy: 'Accounts Office',
    status: 'Paid',
  },
  {
    id: 'pay-seed-5',
    receiptNo: 'EDU/2025-26/00005',
    studentId: 'stu-1',
    studentName: 'Rahul Verma',
    courseName: 'Master of Computer Applications',
    date: '2025-08-08',
    subtotal: 60000,
    concession: 0,
    fine: 0,
    total: 60000,
    mode: 'Cheque',
    refNo: 'CHQ-114082',
    items: [{ installmentId: 'inst-2', amount: 60000, fine: 0 }],
    collectedBy: 'Accounts Office',
    status: 'Cancelled',
    cancelReason: 'Incorrect installment mapped; re-issued via UPI.',
    cancelledAt: '2025-08-09',
  },
];

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly studentsService = inject(StudentsService);
  private readonly activityService = inject(ActivityService);
  private readonly auditService = inject(AuditService);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _structures = signal<FeeStructure[]>([]);
  private readonly _scholarships = signal<Scholarship[]>([]);
  private readonly _payments = signal<Payment[]>([]);

  private readonly structuresSync = new FirestoreCollectionSync<FeeStructure>(
    'feeStructures',
    'eduerp_fee_structures_v2',
    this._structures,
    this.isBrowser
  );
  private readonly scholarshipsSync = new FirestoreCollectionSync<Scholarship>(
    'scholarships',
    'eduerp_scholarships_v2',
    this._scholarships,
    this.isBrowser
  );
  private readonly paymentsSync = new FirestoreCollectionSync<Payment>(
    'feeReceipts',
    'eduerp_fee_receipts_v2',
    this._payments,
    this.isBrowser
  );

  readonly structures = this._structures.asReadonly();
  readonly scholarships = this._scholarships.asReadonly();
  readonly payments = this._payments.asReadonly();

  readonly ledgers = computed<StudentFeeLedger[]>(() => {
    const students = this.studentsService.students();
    const structures = this._structures();
    const payments = this._payments().filter(p => p.status === 'Paid');
    const todayIso = new Date().toISOString().split('T')[0];

    if (structures.length === 0) return [];

    return students.map(student => {
      const structure =
        structures.find(s => s.courseId === student.courseId && s.status === 'Active') ||
        structures.find(s => s.courseId === student.courseId) ||
        structures[0];

      const studentPayments = payments.filter(p => p.studentId === student.id);

      const installments = structure.installments.map(inst => {
        let paidAmount = 0;
        let fineAmount = 0;
        let concessionAmount = 0;

        for (const pay of studentPayments) {
          const item = pay.items.find(i => i.installmentId === inst.id);
          if (!item) continue;
          paidAmount += item.amount;
          fineAmount += item.fine || 0;
          if (typeof item.concession === 'number') {
            concessionAmount += item.concession;
          } else if (pay.concession > 0 && pay.items.length > 0 && pay.items[0].installmentId === inst.id) {
            concessionAmount += pay.concession;
          }
        }

        const settled = paidAmount + concessionAmount;
        let status: FeeStatus = 'Unpaid';
        if (settled >= inst.totalAmount) {
          status = 'Paid';
        } else if (settled > 0) {
          status = 'Partial';
        } else if (inst.dueDate < todayIso) {
          status = 'Overdue';
        }

        return {
          installmentId: inst.id,
          label: inst.label,
          dueDate: inst.dueDate,
          totalAmount: inst.totalAmount,
          paidAmount,
          fineAmount,
          concessionAmount,
          status,
        };
      });

      return {
        studentId: student.id,
        enrollmentNo: student.enrollmentNo,
        studentName: student.name,
        courseId: student.courseId,
        structureId: structure.id,
        installments,
      };
    });
  });

  constructor() {
    this._structures.set(this.structuresSync.loadInitial(SEED_STRUCTURES));
    this._scholarships.set(this.scholarshipsSync.loadInitial(SEED_SCHOLARSHIPS));
    this._payments.set(this.paymentsSync.loadInitial(SEED_PAYMENTS));

    this.structuresSync.startSync();
    this.scholarshipsSync.startSync();
    this.paymentsSync.startSync();
  }

  // --- Fee Structure CRUD ---
  saveStructure(data: Omit<FeeStructure, 'id'>, id?: string): FeeStructure {
    const isEdit = Boolean(id);
    const saved: FeeStructure = {
      ...data,
      id: id || `fs-${Date.now()}`,
    };

    if (isEdit) {
      this._structures.update(list => list.map(s => (s.id === id ? saved : s)));
    } else {
      this._structures.update(list => [saved, ...list]);
    }
    this.structuresSync.syncUpsert(saved);

    this.activityService.logActivity({
      user: 'Administrator',
      role: 'Super Admin',
      operationType: isEdit ? 'Update' : 'Create',
      action: isEdit ? 'Updated Fee Structure' : 'Created Fee Structure',
      target: `${saved.courseName} (${saved.academicYear})`,
      recordId: saved.id,
      module: 'Fee Structure',
      category: 'Fees',
      icon: 'account_balance_wallet',
      details: `Annual Fee ₹${saved.totalFee.toLocaleString('en-IN')} across ${saved.installments.length} installments`,
    });

    this.auditService.log({
      userId: 'admin',
      userName: 'Administrator',
      role: 'Super Admin',
      module: 'Fee Structure',
      action: isEdit ? 'Update' : 'Create',
      target: `${saved.courseName} (${saved.academicYear})`,
      status: 'Success',
      newValue: `₹${saved.totalFee}`,
    });

    return saved;
  }

  deleteStructure(id: string): void {
    const existing = this._structures().find(s => s.id === id);
    if (!existing) return;

    this._structures.update(list => list.filter(s => s.id !== id));
    this.structuresSync.syncDelete(id);

    this.activityService.logActivity({
      user: 'Administrator',
      role: 'Super Admin',
      operationType: 'Delete',
      action: 'Deleted Fee Structure',
      target: `${existing.courseName} (${existing.academicYear})`,
      recordId: id,
      module: 'Fee Structure',
      category: 'Fees',
      icon: 'delete_outline',
    });

    this.auditService.log({
      userId: 'admin',
      userName: 'Administrator',
      role: 'Super Admin',
      module: 'Fee Structure',
      action: 'Delete',
      target: `${existing.courseName} (${existing.academicYear})`,
      status: 'Success',
      oldValue: `₹${existing.totalFee}`,
    });
  }

  // --- Scholarships & Waivers ---
  saveScholarship(data: Omit<Scholarship, 'id'>, id?: string): Scholarship {
    const isEdit = Boolean(id);
    const saved: Scholarship = {
      ...data,
      id: id || `sch-${Date.now()}`,
    };

    if (isEdit) {
      this._scholarships.update(list => list.map(s => (s.id === id ? saved : s)));
    } else {
      this._scholarships.update(list => [saved, ...list]);
    }
    this.scholarshipsSync.syncUpsert(saved);

    this.activityService.logActivity({
      user: 'Administrator',
      role: 'Super Admin',
      operationType: isEdit ? 'Update' : 'Create',
      action: isEdit ? 'Updated Scholarship Scheme' : 'Created Scholarship Scheme',
      target: `${saved.name} (${saved.code})`,
      recordId: saved.id,
      module: 'Scholarships',
      category: 'Fees',
      icon: 'school',
      details: `${saved.type === 'Percentage' ? saved.value + '%' : '₹' + saved.value} waiver`,
    });

    return saved;
  }

  deleteScholarship(id: string): void {
    const existing = this._scholarships().find(s => s.id === id);
    if (!existing) return;
    this._scholarships.update(list => list.filter(s => s.id !== id));
    this.scholarshipsSync.syncDelete(id);

    this.activityService.logActivity({
      user: 'Administrator',
      role: 'Super Admin',
      operationType: 'Delete',
      action: 'Deleted Scholarship Scheme',
      target: `${existing.name} (${existing.code})`,
      recordId: id,
      module: 'Scholarships',
      category: 'Fees',
      icon: 'delete_outline',
    });
  }

  // --- Fee Collection Logic ---
  getLedgerByStudent(studentId: string): StudentFeeLedger | undefined {
    return this.ledgers().find(l => l.studentId === studentId);
  }

  getLastPaymentByStudent(studentId: string): Payment | undefined {
    return this._payments().find(p => p.studentId === studentId && p.status === 'Paid');
  }

  calculateFine(dueDate: string, finePerDay: number): number {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (today <= due) return 0;
    const diffTime = Math.abs(today.getTime() - due.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays * finePerDay;
  }

  collectPayment(payment: Omit<Payment, 'id' | 'receiptNo' | 'status'>): Payment {
    const nextNo = this._payments().length + 1;
    const receiptNo = `EDU/2025-26/${String(nextNo).padStart(5, '0')}`;

    const newPayment: Payment = {
      ...payment,
      id: `pay-${Date.now()}-${nextNo}`,
      receiptNo,
      status: 'Paid',
    };

    this._payments.update(list => [newPayment, ...list]);
    this.paymentsSync.syncUpsert(newPayment);

    this.activityService.logActivity({
      user: payment.collectedBy || 'Administrator',
      role: 'Accounts Admin',
      operationType: 'Create',
      action: 'Collected Fee Payment',
      target: `${payment.studentName} (${receiptNo})`,
      recordId: newPayment.id,
      module: 'Fee Collection',
      category: 'Fees',
      icon: 'payments',
      details: `Received ₹${payment.total.toLocaleString('en-IN')} via ${payment.mode}`,
    });

    this.auditService.log({
      userId: 'admin',
      userName: payment.collectedBy || 'Administrator',
      role: 'Accounts Admin',
      module: 'Fee Collection',
      action: 'Create',
      target: `${receiptNo} — ${payment.studentName}`,
      status: 'Success',
      newValue: `₹${payment.total} (${payment.mode})`,
    });

    return newPayment;
  }

  cancelReceipt(id: string, reason: string): void {
    const payment = this._payments().find(p => p.id === id);
    if (!payment || payment.status === 'Cancelled') return;

    const cancelled: Payment = {
      ...payment,
      status: 'Cancelled',
      cancelReason: reason.trim(),
      cancelledAt: new Date().toISOString().split('T')[0],
    };

    this._payments.update(list => list.map(p => (p.id === id ? cancelled : p)));
    this.paymentsSync.syncUpsert(cancelled);

    this.activityService.logActivity({
      user: 'Administrator',
      role: 'Super Admin',
      operationType: 'Update',
      action: 'Cancelled Fee Receipt',
      target: `${payment.receiptNo} (${payment.studentName})`,
      recordId: payment.id,
      module: 'Receipts',
      category: 'Fees',
      icon: 'cancel',
      details: reason.trim(),
    });

    this.auditService.log({
      userId: 'admin',
      userName: 'Administrator',
      role: 'Super Admin',
      module: 'Receipts',
      action: 'Update',
      target: `${payment.receiptNo} (${payment.studentName})`,
      status: 'Success',
      oldValue: `Paid ₹${payment.total}`,
      newValue: `Cancelled: ${reason.trim()}`,
    });
  }
}
