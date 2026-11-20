export type FeeStatus = 'Paid' | 'Unpaid' | 'Partial' | 'Overdue' | 'Cancelled';
export type PaymentMode = 'Cash' | 'UPI' | 'Cheque' | 'Card' | 'Bank Transfer';

export interface FeeHead {
  id: string;
  name: string;
  amount: number;
}

export interface FeeInstallment {
  id: string;
  label: string;
  dueDate: string;
  heads: FeeHead[];
  totalAmount: number;
}

export interface FeeStructure {
  id: string;
  courseId: string;
  courseName: string;
  academicYear: string;
  installments: FeeInstallment[];
  lateFinePerDay: number;
  totalFee: number;
  status: 'Active' | 'Inactive';
}

export interface Scholarship {
  id: string;
  name: string;
  code: string;
  type: 'Percentage' | 'Fixed';
  value: number;
  courseId: string; // 'All' or specific course id
  courseName: string;
  eligibility: string;
  maxRecipients: number;
  status: 'Active' | 'Inactive';
}

export interface StudentInstallmentLedger {
  installmentId: string;
  label: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  fineAmount: number;
  concessionAmount: number;
  status: FeeStatus;
}

export interface StudentFeeLedger {
  studentId: string;
  enrollmentNo: string;
  studentName: string;
  courseId: string;
  structureId: string;
  installments: StudentInstallmentLedger[];
}

export interface PaymentItem {
  installmentId: string;
  amount: number;
  fine: number;
  concession?: number;
}

export interface Payment {
  id: string;
  receiptNo: string;
  studentId: string;
  studentName: string;
  courseName: string;
  items: PaymentItem[];
  subtotal: number;
  concession: number;
  concessionReason?: string;
  scholarshipCode?: string;
  fine: number;
  total: number;
  mode: PaymentMode;
  refNo?: string;
  date: string;
  collectedBy: string;
  status: 'Paid' | 'Cancelled';
  cancelReason?: string;
  cancelledAt?: string;
}
