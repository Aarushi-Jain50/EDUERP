import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn, TableCustomAction } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { FinanceService } from '../../../services/finance.service';
import { StudentsService } from '../../../services/students.service';
import { Payment } from '../../../models/finance.model';
import { amountToWords, formatCurrency } from '../../../utils/money.helper';
import { exportReceiptToPdf, exportToExcel, exportToPdf } from '../../../utils/export.helper';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-receipts-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    PageHeader,
    StatStrip,
    DataToolbar,
    DataTable,
    FormDrawer,
  ],
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans">
      <app-page-header
        title="Fee Receipts & Reversals"
        subtitle="Inspect issued receipts, download signed PDF copies, and reverse cancelled instruments with audit trails."
        actionLabel="Export Register PDF"
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

      <app-data-toolbar
        [filter1Value]="statusFilter()"
        [filter1Options]="statusOptions"
        (filter1Change)="statusFilter.set($event)"
        searchPlaceholder="Search Receipt No or Student..."
        [searchValue]="searchQuery()"
        (searchChange)="searchQuery.set($event)"
      />

      <app-data-table
        [columns]="columns"
        [data]="filteredPayments()"
        idKey="id"
        [customActions]="customActions"
        [hideEdit]="true"
        [hideDelete]="true"
        (viewClicked)="viewReceipt($event)"
        (customActionClicked)="handleCustomAction($event)"
      />

      <!-- Void / Cancel Receipt Drawer -->
      <app-form-drawer
        [isOpen]="isCancelOpen()"
        title="Void & Reverse Fee Receipt"
        subtitle="Reversing this receipt automatically restores the pending dues on the student ledger."
        saveLabel="Confirm Reversal"
        (closed)="isCancelOpen.set(false)"
        (saved)="confirmCancelReceipt()"
      >
        <form [formGroup]="cancelForm" class="space-y-4 pt-2">
          @if (receiptToCancel(); as target) {
            <div class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-1">
              <p class="font-bold text-rose-900">{{ target.receiptNo }} — {{ target.studentName }}</p>
              <p class="text-rose-700">Amount to reverse: {{ formatCurrency(target.total) }} ({{ target.mode }})</p>
            </div>
          }

          <div class="space-y-1.5">
            <label for="cancel-reason-input" class="text-xs font-semibold text-slate-800">Mandatory Reversal Reason <span class="text-red-500">*</span></label>
            <textarea
              id="cancel-reason-input"
              formControlName="reason"
              rows="4"
              placeholder="e.g. Cheque dishonored / Duplicate entry / Incorrect installment mapped"
              class="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-rose-500 resize-none"
            ></textarea>
          </div>
        </form>
      </app-form-drawer>

      <!-- View Receipt Modal -->
      @if (selectedPayment(); as p) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
            <div class="p-4 bg-slate-50 border-b flex justify-between items-center">
              <span class="text-xs font-black text-slate-800 uppercase tracking-widest">Receipt Viewer</span>
              <button type="button" (click)="selectedPayment.set(null)" class="text-slate-400 hover:text-slate-600 cursor-pointer">
                <mat-icon class="!text-lg !w-5 !h-5">close</mat-icon>
              </button>
            </div>
            <div class="p-8 space-y-6">
              <div class="flex justify-between items-start border-b-2 border-slate-900 pb-6">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-[#1A1745] flex items-center justify-center text-white text-xl font-black">E</div>
                  <div class="flex flex-col">
                    <span class="text-lg font-black text-slate-900 uppercase">Apex Institute of Technology</span>
                    <span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Fee Payment Receipt</span>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-[10px] font-bold text-slate-400 uppercase">Receipt No</p>
                  <p class="text-sm font-black text-slate-900">{{ p.receiptNo }}</p>
                  <p class="text-[10px] font-bold text-slate-400 uppercase mt-2">Status</p>
                  <p class="text-[10px] font-bold uppercase" [class.text-emerald-600]="p.status === 'Paid'" [class.text-rose-600]="p.status === 'Cancelled'">{{ p.status }}</p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-8 text-xs">
                <div class="space-y-1.5">
                  <p><span class="font-bold text-slate-400 uppercase mr-2">Student:</span> <span class="font-black">{{ p.studentName }}</span></p>
                  <p><span class="font-bold text-slate-400 uppercase mr-2">Date:</span> <span class="font-bold">{{ p.date }}</span></p>
                </div>
                <div class="space-y-1.5 text-right">
                  <p><span class="font-bold text-slate-400 uppercase mr-2">Course:</span> <span class="font-bold">{{ p.courseName }}</span></p>
                  <p><span class="font-bold text-slate-400 uppercase mr-2">Mode:</span> <span class="font-bold">{{ p.mode }}</span></p>
                </div>
              </div>

              @if (p.status === 'Cancelled' && p.cancelReason) {
                <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  <strong>Cancellation Audit Note:</strong> {{ p.cancelReason }}
                </div>
              }

              <div class="border-y border-slate-200">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="text-left">
                      <th class="py-3 font-bold text-slate-400 uppercase tracking-widest">Description</th>
                      <th class="py-3 text-right font-bold text-slate-400 uppercase tracking-widest">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (item of p.items; track item.installmentId) {
                      <tr>
                        <td class="py-3 font-bold text-slate-800">Fee Installment ({{ item.installmentId }})</td>
                        <td class="py-3 text-right font-bold text-slate-900">{{ formatCurrency(item.amount) }}</td>
                      </tr>
                    }
                    @if (p.fine > 0) {
                      <tr>
                        <td class="py-3 font-bold text-rose-500">Late Payment Fine</td>
                        <td class="py-3 text-right font-bold text-rose-600">+ {{ formatCurrency(p.fine) }}</td>
                      </tr>
                    }
                    @if (p.concession > 0) {
                      <tr>
                        <td class="py-3 font-bold text-emerald-500">Concession / Discount</td>
                        <td class="py-3 text-right font-bold text-emerald-600">- {{ formatCurrency(p.concession) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <div class="flex justify-between items-center bg-slate-900 text-white p-4 rounded-xl">
                <div class="flex flex-col text-left">
                  <span class="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Total Amount</span>
                  <span class="text-[10px] font-medium italic opacity-80">{{ amountToWords(p.total) }}</span>
                </div>
                <span class="text-xl font-black">{{ formatCurrency(p.total) }}</span>
              </div>
            </div>
            <div class="p-6 bg-slate-50 border-t flex justify-end gap-3">
              <button type="button" (click)="selectedPayment.set(null)" class="px-6 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">Close</button>
              <button type="button" (click)="downloadPdf(p)" class="px-8 py-2.5 bg-[#1A1745] text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 cursor-pointer">
                <mat-icon class="!text-sm !w-4 !h-4">picture_as_pdf</mat-icon>
                Download PDF Receipt
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ReceiptsPage {
  protected readonly financeService = inject(FinanceService);
  private readonly studentsService = inject(StudentsService);

  protected readonly searchQuery = signal('');
  protected readonly statusFilter = signal('All');
  protected readonly isCancelOpen = signal(false);
  protected readonly receiptToCancel = signal<Payment | null>(null);
  protected readonly selectedPayment = signal<Payment | null>(null);

  protected readonly cancelForm = new FormGroup({
    reason: new FormControl('', [Validators.required, Validators.minLength(5)]),
  });

  protected readonly statusOptions: FilterOption[] = [
    { label: 'Status: All', value: 'All' },
    { label: 'Paid', value: 'Paid' },
    { label: 'Cancelled', value: 'Cancelled' },
  ];

  protected readonly customActions: TableCustomAction[] = [
    { id: 'pdf', label: 'Download PDF', icon: 'picture_as_pdf' },
    { id: 'void', label: 'Void Receipt', icon: 'cancel', danger: true },
  ];

  protected readonly columns: TableColumn[] = [
    { key: 'receiptNo', header: 'Receipt No', isBold: true, isMono: true },
    { key: 'studentName', header: 'Student', isBold: true },
    { key: 'date', header: 'Date' },
    { key: 'totalDisplay', header: 'Amount', align: 'right' },
    { key: 'mode', header: 'Mode' },
    { key: 'status', header: 'Status', isBadge: true },
  ];

  protected readonly stats = computed<StatItem[]>(() => {
    const list = this.financeService.payments();
    const cancelled = list.filter(p => p.status === 'Cancelled').length;
    const paidSum = list.filter(p => p.status === 'Paid').reduce((acc, p) => acc + p.total, 0);
    return [
      { label: 'Total Receipts', value: list.length, icon: 'receipt', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Active Settled Value', value: formatCurrency(paidSum), icon: 'payments', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' },
      { label: 'Voided / Cancelled', value: cancelled, icon: 'cancel', iconColorClass: 'text-rose-600', iconBgClass: 'bg-rose-50 border-rose-100' },
    ];
  });

  protected readonly filteredPayments = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const status = this.statusFilter();
    return this.financeService
      .payments()
      .filter(p => {
        if (status !== 'All' && p.status !== status) return false;
        if (q && !p.receiptNo.toLowerCase().includes(q) && !p.studentName.toLowerCase().includes(q)) return false;
        return true;
      })
      .map(p => ({
        ...p,
        totalDisplay: formatCurrency(p.total),
      }));
  });

  viewReceipt(p: Payment) {
    this.selectedPayment.set(p);
  }

  handleCustomAction(event: { actionId: string; row: unknown }) {
    const item = event.row as Payment;
    if (event.actionId === 'pdf') {
      this.downloadPdf(item);
    } else if (event.actionId === 'void') {
      this.openCancelDrawer(item);
    }
  }

  openCancelDrawer(p: Payment) {
    if (p.status === 'Cancelled') {
      this.studentsService.showToast('info', 'Receipt is already cancelled.');
      return;
    }
    this.receiptToCancel.set(p);
    this.cancelForm.reset({ reason: '' });
    this.isCancelOpen.set(true);
  }

  confirmCancelReceipt() {
    if (this.cancelForm.invalid || !this.receiptToCancel()) return;
    const target = this.receiptToCancel()!;
    this.financeService.cancelReceipt(target.id, this.cancelForm.controls.reason.value!);
    this.studentsService.showToast('warning', `Receipt ${target.receiptNo} voided and ledger reversed.`);
    this.isCancelOpen.set(false);
  }

  downloadPdf(p: Payment) {
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
        label: `Fee Installment (${i.installmentId})`,
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
        Date: p.date,
        Mode: p.mode,
        Total: p.total,
        Status: p.status,
        CancelReason: p.cancelReason || '-',
      })),
      'Fee_Receipts_Register'
    );
  }

  exportPdf() {
    exportToPdf(
      'Institutional Fee Receipts Register',
      ['Receipt No', 'Student', 'Date', 'Amount', 'Mode', 'Status'],
      this.filteredPayments().map(p => [p.receiptNo, p.studentName, p.date, p.totalDisplay, p.mode, p.status]),
      'Fee_Receipts_Register'
    );
  }

  formatCurrency(amt: number) {
    return formatCurrency(amt);
  }

  amountToWords(amt: number) {
    return amountToWords(amt);
  }
}
