import { Injectable, signal, inject } from '@angular/core';
import { FeeStructure, StudentFeeLedger, Payment, FeeStatus } from '../models/finance.model';
import { AcademicService } from './academic.service';
import { StudentsService } from './students.service';

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private readonly academicService = inject(AcademicService);
  private readonly studentsService = inject(StudentsService);

  private readonly _structures = signal<FeeStructure[]>([
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
            { id: 'h-3', name: 'Library Fee', amount: 5000 }
          ]
        },
        {
          id: 'inst-2',
          label: '2nd Installment',
          dueDate: '2026-01-15',
          totalAmount: 60000,
          heads: [
            { id: 'h-4', name: 'Tuition Fee', amount: 40000 },
            { id: 'h-5', name: 'Development Fee', amount: 15000 },
            { id: 'h-6', name: 'Exam Fee', amount: 5000 }
          ]
        }
      ]
    },
    {
      id: 'fs-2',
      courseId: 'course-btech',
      courseName: 'Bachelor of Technology',
      academicYear: '2025-26',
      lateFinePerDay: 50,
      totalFee: 150000,
      status: 'Active',
      installments: [
        { id: 'inst-3', label: 'Annual Fee', dueDate: '2025-09-01', totalAmount: 150000, heads: [{ id: 'h-7', name: 'Academic Fee', amount: 150000 }] }
      ]
    }
  ]);

  private readonly _ledgers = signal<StudentFeeLedger[]>([]);
  private readonly _payments = signal<Payment[]>([]);

  readonly structures = this._structures.asReadonly();
  readonly ledgers = this._ledgers.asReadonly();
  readonly payments = this._payments.asReadonly();

  constructor() {
    this.initializeLedgers();
  }

  private initializeLedgers() {
    const students = this.studentsService.students();
    const structures = this._structures();
    
    const initialLedgers: StudentFeeLedger[] = students.map(student => {
      const structure = structures.find(s => s.courseId === student.courseId) || structures[0];
      return {
        studentId: student.id,
        enrollmentNo: student.enrollmentNo,
        studentName: student.name,
        courseId: student.courseId,
        structureId: structure.id,
        installments: structure.installments.map(inst => ({
          installmentId: inst.id,
          label: inst.label,
          dueDate: inst.dueDate,
          totalAmount: inst.totalAmount,
          paidAmount: 0,
          fineAmount: 0,
          concessionAmount: 0,
          status: 'Unpaid'
        }))
      };
    });
    
    this._ledgers.set(initialLedgers);
  }

  // --- Fee Structure CRUD ---
  saveStructure(data: Omit<FeeStructure, 'id'>, id?: string): void {
    if (id) {
      this._structures.update(list => list.map(s => s.id === id ? { ...data, id } : s));
    } else {
      this._structures.update(list => [{ ...data, id: `fs-${Date.now()}` }, ...list]);
    }
  }

  // --- Fee Collection Logic ---
  getLedgerByStudent(studentId: string): StudentFeeLedger | undefined {
    return this._ledgers().find(l => l.studentId === studentId);
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
      id: `pay-${Date.now()}`,
      receiptNo,
      status: 'Paid'
    };

    // Update Ledger
    this._ledgers.update(ledgers => ledgers.map(l => {
      if (l.studentId === payment.studentId) {
        const updatedInsts = l.installments.map(inst => {
          const item = payment.items.find(i => i.installmentId === inst.installmentId);
          if (item) {
            const newPaid = inst.paidAmount + item.amount;
            return {
              ...inst,
              paidAmount: newPaid,
              fineAmount: inst.fineAmount + item.fine,
              status: (newPaid >= inst.totalAmount ? 'Paid' : 'Partial') as FeeStatus
            };
          }
          return inst;
        });
        return { ...l, installments: updatedInsts };
      }
      return l;
    }));

    this._payments.update(list => [newPayment, ...list]);
    return newPayment;
  }

  cancelReceipt(id: string, reason: string): void {
    const payment = this._payments().find(p => p.id === id);
    if (!payment) return;

    this._payments.update(list => list.map(p => p.id === id ? { ...p, status: 'Cancelled', cancelReason: reason } : p));

    // Reverse Ledger
    this._ledgers.update(ledgers => ledgers.map(l => {
      if (l.studentId === payment.studentId) {
        const updatedInsts = l.installments.map(inst => {
          const item = payment.items.find(i => i.installmentId === inst.installmentId);
          if (item) {
            const newPaid = inst.paidAmount - item.amount;
            return {
              ...inst,
              paidAmount: newPaid,
              fineAmount: inst.fineAmount - item.fine,
              status: (newPaid === 0 ? 'Unpaid' : 'Partial') as FeeStatus
            };
          }
          return inst;
        });
        return { ...l, installments: updatedInsts };
      }
      return l;
    }));
  }
}
