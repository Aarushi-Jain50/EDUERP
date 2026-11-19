import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Payment } from '../../../models/finance.model';
import { formatCurrency, amountToWords } from '../../../utils/money.helper';

@Component({
  selector: 'app-printable-receipt-modal',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (payment(); as p) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto print:static print:bg-white print:p-0">
        <div class="bg-white w-full max-w-2xl rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden print:border-0 print:shadow-none print:max-w-none">
          <div class="px-5 py-3.5 bg-slate-50 border-b border-[#E2E8F0] flex items-center justify-between print:hidden">
            <span class="text-xs font-bold text-[#172554] uppercase tracking-wider">Official Receipt Viewer</span>
            <button
              type="button"
              (click)="closed.emit()"
              aria-label="Close receipt viewer"
              class="w-8 h-8 rounded-lg text-[#64748B] hover:text-[#172554] hover:bg-slate-200/60 flex items-center justify-center cursor-pointer"
            >
              <mat-icon class="text-lg">close</mat-icon>
            </button>
          </div>

          <div class="p-6 sm:p-8 space-y-6" id="parent-printable-receipt">
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-[#1A1745] pb-5">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-[#1A1745] flex items-center justify-center text-white font-bold shrink-0">
                  <mat-icon class="text-lg">school</mat-icon>
                </div>
                <div>
                  <p class="text-base font-bold text-[#172554] uppercase">{{ instituteName() }}</p>
                  <p class="text-[11px] text-[#64748B] font-semibold uppercase tracking-wider">Official Fee Payment Receipt</p>
                </div>
              </div>
              <div class="sm:text-right">
                <p class="text-[11px] font-semibold uppercase text-[#64748B]">Receipt No</p>
                <p class="text-sm font-mono font-bold text-[#172554]">{{ p.receiptNo }}</p>
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
                <p><span class="text-[#64748B] font-semibold mr-2">Enrollment No:</span> <span class="font-mono font-semibold text-[#172554]">{{ enrollmentNo() }}</span></p>
                <p><span class="text-[#64748B] font-semibold mr-2">Date:</span> <span class="font-semibold text-[#172554]">{{ formatShortDate(p.date) }}</span></p>
              </div>
              <div class="space-y-1.5 sm:text-right">
                <p><span class="text-[#64748B] font-semibold mr-2">Course:</span> <span class="font-semibold text-[#172554]">{{ p.courseName }}</span></p>
                <p><span class="text-[#64748B] font-semibold mr-2">Payment Mode:</span> <span class="font-semibold text-[#172554]">{{ p.mode }}</span></p>
                @if (p.refNo) {
                  <p><span class="text-[#64748B] font-semibold mr-2">Ref No:</span> <span class="font-mono font-semibold text-[#172554]">{{ p.refNo }}</span></p>
                }
              </div>
            </div>

            <div class="border-y border-[#E2E8F0]">
              <table class="w-full text-xs">
                <thead>
                  <tr class="text-left border-b border-[#E2E8F0] text-[#64748B]">
                    <th scope="col" class="py-2.5 font-semibold uppercase tracking-wider">Description</th>
                    <th scope="col" class="py-2.5 text-right font-semibold uppercase tracking-wider">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (item of p.items; track item.installmentId) {
                    <tr>
                      <td class="py-3 font-semibold text-[#172554]">Fee Installment ({{ item.installmentId }})</td>
                      <td class="py-3 text-right font-bold tabular-nums text-[#172554]">{{ formatINR(item.amount) }}</td>
                    </tr>
                  }
                  @if (p.fine > 0) {
                    <tr>
                      <td class="py-3 font-semibold text-rose-600">Late Payment Fine</td>
                      <td class="py-3 text-right font-bold tabular-nums text-rose-600">+ {{ formatINR(p.fine) }}</td>
                    </tr>
                  }
                  @if (p.concession > 0) {
                    <tr>
                      <td class="py-3 font-semibold text-emerald-700">Concession / Scholarship</td>
                      <td class="py-3 text-right font-bold tabular-nums text-emerald-700">- {{ formatINR(p.concession) }}</td>
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

          <div class="px-6 py-4 bg-slate-50 border-t border-[#E2E8F0] flex items-center justify-end gap-3 print:hidden">
            <button
              type="button"
              (click)="closed.emit()"
              class="px-4 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-100 text-xs font-semibold text-[#64748B] cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              (click)="printReceipt()"
              class="gradient-accent text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-sm hover:opacity-95 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <mat-icon class="text-sm">print</mat-icon>
              <span>Print Receipt</span>
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class PrintableReceiptModal {
  readonly payment = input<Payment | null>(null);
  readonly instituteName = input<string>('EduERP Institute');
  readonly enrollmentNo = input<string>('');
  readonly closed = output<void>();

  protected printReceipt(): void {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  }

  protected formatINR(amount: number): string {
    return formatCurrency(amount);
  }

  protected toWords(amount: number): string {
    return amountToWords(amount);
  }

  protected formatShortDate(isoDate: string): string {
    if (!isoDate) return '-';
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return isoDate;
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(d);
  }
}
