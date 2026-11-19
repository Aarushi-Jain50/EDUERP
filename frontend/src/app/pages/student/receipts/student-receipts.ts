import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { Payment } from '../../../models/finance.model';
import { formatCurrency, amountToWords } from '../../../utils/money.helper';
import { StudentPortalFacade } from '../shared/student-portal.facade';

interface ReceiptRow extends Payment {
  dateDisplay: string;
  amountDisplay: string;
}

@Component({
  selector: 'app-student-receipts',
  imports: [MatIconModule, PageHeader, StatStrip, DataToolbar, DataTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-[#172554] text-[13px] pb-10 min-w-0">
      <div class="space-y-6 print:hidden">
        <app-page-header
          title="Fee Receipts"
          [subtitle]="'Official accounts-office payment receipts issued for ' + facade.currentStudent().name + ' (' + facade.currentStudent().enrollmentNo + ').'"
        />

        <app-stat-strip [items]="stats()" />

        <app-data-toolbar
          searchPlaceholder="Search by receipt no or payment mode..."
          [searchValue]="searchQuery()"
          (searchChange)="searchQuery.set($event)"
          [filter1Value]="statusFilter()"
          [filter1Options]="statusOptions"
          (filter1Change)="statusFilter.set($event)"
          [hasActiveFilters]="hasActiveFilters()"
          (resetClicked)="resetFilters()"
        />

        <app-data-table
          [columns]="columns"
          [data]="filteredRows()"
          idKey="id"
          [hideEdit]="true"
          [hideDelete]="true"
          emptyIcon="receipt_long"
          emptyTitle="No fee receipts found"
          emptyMessage="Receipts recorded by the accounts office for your enrollment will appear here."
          (viewClicked)="openReceipt($event)"
        />
      </div>

      <!-- Printable Receipt Modal Viewer -->
      @if (selectedPayment(); as p) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 overflow-y-auto print:static print:bg-white print:p-0">
          <div class="bg-white w-full max-w-2xl max-h-[92dvh] flex flex-col rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden print:max-h-none print:border-0 print:shadow-none print:max-w-none">
            <div class="px-4 sm:px-5 py-3.5 bg-slate-50 border-b border-[#E2E8F0] flex items-center justify-between shrink-0 print:hidden">
              <span class="text-xs font-bold text-[#172554] uppercase tracking-wider">Receipt Viewer</span>
              <button
                type="button"
                (click)="selectedPayment.set(null)"
                aria-label="Close receipt viewer"
                class="w-9 h-9 rounded-lg text-[#64748B] hover:text-[#172554] hover:bg-slate-200/60 flex items-center justify-center cursor-pointer"
              >
                <mat-icon class="text-lg">close</mat-icon>
              </button>
            </div>

            <div class="p-4 sm:p-8 space-y-5 sm:space-y-6 overflow-y-auto print:overflow-visible" id="printable-receipt-full">
              <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-[#1A1745] pb-5">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-[#1A1745] flex items-center justify-center text-white font-bold shrink-0">
                    <mat-icon class="text-lg">school</mat-icon>
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm sm:text-base font-bold text-[#172554] uppercase">{{ facade.instituteProfile().name }}</p>
                    <p class="text-[11px] text-[#64748B] font-semibold uppercase tracking-wider">Official Fee Payment Receipt</p>
                  </div>
                </div>
                <div class="sm:text-right">
                  <p class="text-[11px] font-semibold uppercase text-[#64748B]">Receipt No</p>
                  <p class="text-sm font-mono font-bold text-[#172554] break-all">{{ p.receiptNo }}</p>
                  <p
                    class="text-xs font-bold uppercase mt-1"
                    [class]="p.status === 'Paid' ? 'text-emerald-700' : 'text-rose-600'"
                  >
                    {{ p.status }}
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div class="space-y-1.5">
                  <p><span class="text-[#64748B] font-semibold mr-2">Student:</span> <strong class="text-[#172554]">{{ p.studentName }}</strong></p>
                  <p><span class="text-[#64748B] font-semibold mr-2">Enrollment No:</span> <span class="font-mono font-semibold text-[#172554]">{{ facade.currentStudent().enrollmentNo }}</span></p>
                  <p><span class="text-[#64748B] font-semibold mr-2">Date:</span> <span class="font-semibold text-[#172554]">{{ facade.formatShortDate(p.date) }}</span></p>
                </div>
                <div class="space-y-1.5 sm:text-right">
                  <p><span class="text-[#64748B] font-semibold mr-2">Course:</span> <span class="font-semibold text-[#172554]">{{ p.courseName }}</span></p>
                  <p><span class="text-[#64748B] font-semibold mr-2">Payment Mode:</span> <span class="font-semibold text-[#172554]">{{ p.mode }}</span></p>
                  @if (p.refNo) {
                    <p><span class="text-[#64748B] font-semibold mr-2">Ref No:</span> <span class="font-mono font-semibold text-[#172554] break-all">{{ p.refNo }}</span></p>
                  }
                </div>
              </div>

              <div class="border-y border-[#E2E8F0]">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="text-left border-b border-[#E2E8F0] text-[#64748B]">
                      <th scope="col" class="py-2.5 font-semibold uppercase tracking-wider">Description</th>
                      <th scope="col" class="py-2.5 text-right font-semibold uppercase tracking-wider whitespace-nowrap">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (item of p.items; track item.installmentId) {
                      <tr>
                        <td class="py-3 font-semibold text-[#172554]">Fee Installment ({{ item.installmentId }})</td>
                        <td class="py-3 text-right font-bold tabular-nums text-[#172554] whitespace-nowrap">{{ formatINR(item.amount) }}</td>
                      </tr>
                    }
                    @if (p.fine > 0) {
                      <tr>
                        <td class="py-3 font-semibold text-rose-600">Late Payment Fine</td>
                        <td class="py-3 text-right font-bold tabular-nums text-rose-600 whitespace-nowrap">+ {{ formatINR(p.fine) }}</td>
                      </tr>
                    }
                    @if (p.concession > 0) {
                      <tr>
                        <td class="py-3 font-semibold text-emerald-700">Concession / Scholarship</td>
                        <td class="py-3 text-right font-bold tabular-nums text-emerald-700 whitespace-nowrap">- {{ formatINR(p.concession) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              @if (p.status === 'Cancelled' && p.cancelReason) {
                <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  <strong>Cancellation Reason:</strong> {{ p.cancelReason }}
                </div>
              }

              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#1A1745] text-white p-4 rounded-xl">
                <div>
                  <p class="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">Total Receipt Amount</p>
                  <p class="text-xs text-slate-200 mt-0.5">{{ toWords(p.total) }}</p>
                </div>
                <span class="text-xl font-bold tabular-nums">{{ formatINR(p.total) }}</span>
              </div>
            </div>

            <div class="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border-t border-[#E2E8F0] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 shrink-0 print:hidden">
              <button
                type="button"
                (click)="selectedPayment.set(null)"
                class="px-4 py-2.5 sm:py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-100 text-xs font-semibold text-[#64748B] cursor-pointer text-center"
              >
                Close
              </button>
              <button
                type="button"
                (click)="printReceipt()"
                class="gradient-accent text-white px-5 py-2.5 sm:py-2 rounded-xl text-xs font-semibold shadow-sm hover:opacity-95 inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <mat-icon class="text-sm">print</mat-icon>
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class StudentReceipts {
  protected readonly facade = inject(StudentPortalFacade);

  protected readonly searchQuery = signal<string>('');
  protected readonly statusFilter = signal<string>('All');
  protected readonly selectedPayment = signal<Payment | null>(null);

  protected readonly statusOptions: FilterOption[] = [
    { label: 'All Statuses', value: 'All' },
    { label: 'Paid', value: 'Paid' },
    { label: 'Cancelled', value: 'Cancelled' }
  ];

  protected readonly columns: TableColumn[] = [
    { key: 'receiptNo', header: 'Receipt No', isBold: true, isMono: true },
    { key: 'dateDisplay', header: 'Date' },
    { key: 'amountDisplay', header: 'Amount', align: 'right', isBold: true },
    { key: 'mode', header: 'Mode' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  protected readonly hasActiveFilters = computed(
    () => this.searchQuery().trim().length > 0 || this.statusFilter() !== 'All'
  );

  protected readonly stats = computed<StatItem[]>(() => {
    const summary = this.facade.studentReceipts();
    return [
      {
        label: 'Receipts',
        value: summary.totalCount,
        subtext: summary.paidCount + ' valid receipts',
        icon: 'receipt_long',
        iconColorClass: 'text-[#6D42E8]',
        iconBgClass: 'bg-purple-50 border-purple-100'
      },
      {
        label: 'Total Paid',
        value: formatCurrency(summary.totalPaid),
        subtext: 'Excludes cancelled receipts',
        icon: 'payments',
        iconColorClass: 'text-emerald-600',
        iconBgClass: 'bg-emerald-50 border-emerald-100'
      },
      {
        label: 'Last Payment',
        value: summary.lastPaymentDate ? this.facade.formatShortDate(summary.lastPaymentDate) : 'None',
        subtext: 'Most recent paid receipt',
        icon: 'event',
        iconColorClass: 'text-indigo-600',
        iconBgClass: 'bg-indigo-50 border-indigo-100'
      }
    ];
  });

  protected readonly filteredRows = computed<ReceiptRow[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const st = this.statusFilter();

    return this.facade
      .studentReceipts()
      .list.filter(p => {
        if (st !== 'All' && p.status !== st) return false;
        if (q) {
          return p.receiptNo.toLowerCase().includes(q) || p.mode.toLowerCase().includes(q);
        }
        return true;
      })
      .map(p => ({
        ...p,
        dateDisplay: this.facade.formatShortDate(p.date),
        amountDisplay: formatCurrency(p.total)
      }));
  });

  protected openReceipt(row: ReceiptRow): void {
    this.selectedPayment.set(row);
  }

  protected printReceipt(): void {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  }

  protected resetFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('All');
  }

  protected formatINR(amount: number): string {
    return formatCurrency(amount);
  }

  protected toWords(amount: number): string {
    return amountToWords(amount);
  }
}
