import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { FinanceService } from '../../../services/finance.service';
import { AcademicService } from '../../../services/academic.service';
import { StudentsService } from '../../../services/students.service';
import { Payment } from '../../../models/finance.model';
import { amountToWords, formatCurrency } from '../../../utils/money.helper';
import { exportReceiptToPdf, exportToExcel, exportToPdf } from '../../../utils/export.helper';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-payment-history-page',
  imports: [CommonModule, MatIconModule, PageHeader, StatStrip, DataToolbar, DataTable],
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans">
      <app-page-header
        title="Payment History Ledger"
        subtitle="Audit all institutional transactions, payment mode breakdowns, and downloadable ledger reports."
        actionLabel="Export Ledger PDF"
        actionIcon="picture_as_pdf"
        (actionClicked)="exportPdf()"
      />

      <div class="flex justify-end -mt-2">
        <button
          type="button"
          (click)="exportExcel()"
          class="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
        >
          <mat-icon class="!text-sm !w-4 !h-4 text-emerald-600">table_view</mat-icon>
          Export Excel
        </button>
      </div>

      <app-stat-strip [items]="stats()" />

      <!-- Mode-wise Split -->
      <div class="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        <div class="px-4 py-2 flex flex-col gap-1">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cash Collection</span>
          <span class="text-sm font-black text-slate-900">{{ formatCurrency(modeSplit().Cash) }}</span>
        </div>
        <div class="px-4 py-2 flex flex-col gap-1">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital (UPI / Card)</span>
          <span class="text-sm font-black text-[#6D42E8]">{{ formatCurrency(modeSplit().Digital) }}</span>
        </div>
        <div class="px-4 py-2 flex flex-col gap-1">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Banking (Transfer / Cheque)</span>
          <span class="text-sm font-black text-emerald-600">{{ formatCurrency(modeSplit().Banking) }}</span>
        </div>
      </div>

      <app-data-toolbar
        [filter1Value]="selectedMode()"
        [filter1Options]="modeOptions"
        (filter1Change)="selectedMode.set($event)"
        [filter2Value]="selectedCourse()"
        [filter2Options]="courseOptions()"
        (filter2Change)="selectedCourse.set($event)"
        searchPlaceholder="Search Receipt No, Student, or Ref ID..."
        [searchValue]="searchQuery()"
        (searchChange)="searchQuery.set($event)"
      />

      <app-data-table
        [columns]="columns"
        [data]="filteredPayments()"
        idKey="id"
        [hideEdit]="true"
        [hideDelete]="true"
        (viewClicked)="downloadReceipt($event)"
      />
    </div>
  `,
})
export class PaymentHistoryPage {
  protected readonly financeService = inject(FinanceService);
  protected readonly academicService = inject(AcademicService);
  private readonly studentsService = inject(StudentsService);

  protected readonly searchQuery = signal('');
  protected readonly selectedMode = signal('All');
  protected readonly selectedCourse = signal('All');

  protected readonly modeOptions: FilterOption[] = [
    { label: 'Mode: All', value: 'All' },
    { label: 'Cash', value: 'Cash' },
    { label: 'UPI', value: 'UPI' },
    { label: 'Card', value: 'Card' },
    { label: 'Cheque', value: 'Cheque' },
    { label: 'Bank Transfer', value: 'Bank Transfer' },
  ];

  protected readonly courseOptions = computed<FilterOption[]>(() => [
    { label: 'Course: All', value: 'All' },
    ...this.academicService.courses().map(c => ({ label: c.name, value: c.name })),
  ]);

  protected readonly stats = computed<StatItem[]>(() => {
    const list = this.financeService.payments().filter(p => p.status === 'Paid');
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.slice(0, 7);
    const todayTotal = list.filter(p => p.date === today).reduce((acc, p) => acc + p.total, 0);
    const monthTotal = list.filter(p => p.date.startsWith(currentMonth)).reduce((acc, p) => acc + p.total, 0);
    const totalVolume = list.reduce((acc, p) => acc + p.total, 0);

    return [
      { label: "Today's Collection", value: formatCurrency(todayTotal), icon: 'today', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' },
      { label: 'This Month', value: formatCurrency(monthTotal), icon: 'calendar_month', iconColorClass: 'text-purple-600', iconBgClass: 'bg-purple-50 border-purple-100' },
      { label: 'Total Volume', value: formatCurrency(totalVolume), icon: 'payments', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Settled Receipts', value: list.length, icon: 'receipt_long', iconColorClass: 'text-amber-600', iconBgClass: 'bg-amber-50 border-amber-100' },
    ];
  });

  protected readonly modeSplit = computed(() => {
    const list = this.financeService.payments().filter(p => p.status === 'Paid');
    return {
      Cash: list.filter(p => p.mode === 'Cash').reduce((acc, p) => acc + p.total, 0),
      Digital: list.filter(p => p.mode === 'UPI' || p.mode === 'Card').reduce((acc, p) => acc + p.total, 0),
      Banking: list.filter(p => p.mode === 'Cheque' || p.mode === 'Bank Transfer').reduce((acc, p) => acc + p.total, 0),
    };
  });

  protected readonly filteredPayments = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const mode = this.selectedMode();
    const course = this.selectedCourse();

    return this.financeService
      .payments()
      .filter(p => {
        if (mode !== 'All' && p.mode !== mode) return false;
        if (course !== 'All' && p.courseName !== course) return false;
        if (
          q &&
          !p.receiptNo.toLowerCase().includes(q) &&
          !p.studentName.toLowerCase().includes(q) &&
          !(p.refNo || '').toLowerCase().includes(q)
        )
          return false;
        return true;
      })
      .map(p => ({
        ...p,
        amountDisplay: formatCurrency(p.total),
      }));
  });

  protected readonly columns: TableColumn[] = [
    { key: 'receiptNo', header: 'Receipt No', isBold: true, isMono: true },
    { key: 'studentName', header: 'Student', isBold: true },
    { key: 'courseName', header: 'Program' },
    { key: 'date', header: 'Date' },
    { key: 'mode', header: 'Mode' },
    { key: 'amountDisplay', header: 'Amount', align: 'right' },
    { key: 'status', header: 'Status', isBadge: true },
  ];

  downloadReceipt(p: Payment) {
    const stu = this.studentsService.students().find(s => s.id === p.studentId);
    exportReceiptToPdf({
      receiptNo: p.receiptNo,
      date: p.date,
      status: p.status,
      studentName: p.studentName,
      enrollmentNo: stu?.enrollmentNo || p.studentId,
      courseName: p.courseName,
      mode: p.mode,
      refNo: p.refNo,
      collectedBy: p.collectedBy,
      items: p.items.map(i => ({
        label: `Installment (${i.installmentId})`,
        amount: formatCurrency(i.amount),
        fine: formatCurrency(i.fine),
      })),
      subtotal: formatCurrency(p.subtotal),
      fine: formatCurrency(p.fine),
      concession: formatCurrency(p.concession),
      total: formatCurrency(p.total),
      amountInWords: amountToWords(p.total),
    });
  }

  exportExcel() {
    exportToExcel(
      this.filteredPayments().map(p => ({
        ReceiptNo: p.receiptNo,
        Student: p.studentName,
        Course: p.courseName,
        Date: p.date,
        Mode: p.mode,
        RefNo: p.refNo || '-',
        Total: p.total,
        Status: p.status,
      })),
      'Payment_History_Ledger'
    );
  }

  exportPdf() {
    exportToPdf(
      'Institutional Fee Payment History Ledger',
      ['Receipt No', 'Student', 'Course', 'Date', 'Mode', 'Amount', 'Status'],
      this.filteredPayments().map(p => [
        p.receiptNo,
        p.studentName,
        p.courseName,
        p.date,
        p.mode,
        p.amountDisplay,
        p.status,
      ]),
      'Payment_History_Ledger'
    );
  }

  formatCurrency(amt: number) {
    return formatCurrency(amt);
  }
}
