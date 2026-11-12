import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { FinanceService } from '../../../services/finance.service';
import { Payment } from '../../../models/finance.model';
import { formatCurrency, amountToWords } from '../../../utils/money.helper';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-receipts-page',
  imports: [CommonModule, FormsModule, PageHeader, StatStrip, DataToolbar, DataTable, ConfirmDialog],
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans">
      <app-page-header title="Receipts" subtitle="Manage, view, and cancel institutional fee receipts with full audit logs." />
      
      <app-stat-strip [items]="stats()" />

      <app-data-toolbar 
        searchPlaceholder="Receipt No or Student..."
        [searchValue]="searchQuery()"
        (searchChange)="searchQuery.set($event)"
      />

      <app-data-table 
        [columns]="columns" 
        [data]="filteredPayments()" 
        idKey="id" 
        (viewClicked)="viewReceipt($event)"
        (deleteClicked)="openCancelDialog($event)"
      />

      <!-- Cancel Receipt Dialog -->
      <app-confirm-dialog 
        [isOpen]="isCancelOpen()" 
        title="Cancel Receipt" 
        message="Cancelling this receipt will reverse the payments in the student's ledger. This action is recorded."
        confirmLabel="Confirm Cancellation"
        (closed)="isCancelOpen.set(false)" 
        (confirmed)="cancelReceipt()"
      >
        <div class="mt-4 space-y-1.5">
           <label for="cancel-reason-input" class="text-[11px] font-bold text-slate-500 uppercase">Reason for Cancellation</label>
           <textarea id="cancel-reason-input" [(ngModel)]="cancelReason" rows="2" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-red-500 resize-none" placeholder="e.g. Incorrect amount entered"></textarea>
        </div>
      </app-confirm-dialog>

      <!-- View Receipt Modal -->
      @if (selectedPayment(); as p) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
           <div class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
              <div class="p-4 bg-slate-50 border-b flex justify-between items-center">
                 <span class="text-xs font-black text-slate-800 uppercase tracking-widest">Receipt Viewer</span>
                 <button (click)="selectedPayment.set(null)" class="text-slate-400 hover:text-slate-600"><span class="material-icons text-lg">close</span></button>
              </div>
              <div class="p-8 space-y-6" id="printable-receipt-full">
                 <div class="flex justify-between items-start border-b-2 border-slate-900 pb-6">
                    <div class="flex items-center gap-3">
                       <div class="w-10 h-10 rounded-xl bg-[#1A1745] flex items-center justify-center text-white text-xl font-black">E</div>
                       <div class="flex flex-col">
                          <span class="text-lg font-black text-slate-900 uppercase">EduERP Institution</span>
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
                    <div class="space-y-2">
                       <p><span class="font-bold text-slate-400 uppercase tracking-tighter mr-2">Student:</span> <span class="font-black">{{ p.studentName }}</span></p>
                       <p><span class="font-bold text-slate-400 uppercase tracking-tighter mr-2">Date:</span> <span class="font-bold">{{ p.date }}</span></p>
                    </div>
                    <div class="space-y-2 text-right">
                       <p><span class="font-bold text-slate-400 uppercase tracking-tighter mr-2">Course:</span> <span class="font-bold">{{ p.courseName }}</span></p>
                       <p><span class="font-bold text-slate-400 uppercase tracking-tighter mr-2">Mode:</span> <span class="font-bold">{{ p.mode }}</span></p>
                    </div>
                 </div>

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
                                <td class="py-3 font-bold text-slate-800">Fee Installment (ID: {{ item.installmentId }})</td>
                                <td class="py-3 text-right font-bold text-slate-900">{{ formatCurrency(item.amount) }}</td>
                             </tr>
                          }
                          @if (p.fine; as f) {
                             <tr>
                                <td class="py-3 font-bold text-rose-500">Late Payment Fine</td>
                                <td class="py-3 text-right font-bold text-rose-600">+ {{ formatCurrency(f) }}</td>
                             </tr>
                          }
                          @if (p.concession; as c) {
                             <tr>
                                <td class="py-3 font-bold text-emerald-500">Concession / Discount</td>
                                <td class="py-3 text-right font-bold text-emerald-600">- {{ formatCurrency(c) }}</td>
                             </tr>
                          }
                       </tbody>
                    </table>
                 </div>

                 <div class="flex justify-between items-center bg-slate-900 text-white p-4 rounded-xl">
                    <div class="flex flex-col text-left">
                       <span class="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Total Amount Received</span>
                       <span class="text-[10px] font-medium italic opacity-80">{{ amountToWords(p.total) }}</span>
                    </div>
                    <span class="text-xl font-black">{{ formatCurrency(p.total) }}</span>
                 </div>
              </div>
              <div class="p-6 bg-slate-50 border-t flex justify-end gap-3">
                 <button (click)="selectedPayment.set(null)" class="px-6 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">Close</button>
                 <button (click)="printReceipt()" class="px-8 py-2.5 bg-[#1A1745] text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 cursor-pointer">
                    <span class="material-icons text-sm">print</span>
                    Print Receipt
                 </button>
              </div>
           </div>
        </div>
      }
    </div>
  `
})
export class ReceiptsPage {
  protected readonly financeService = inject(FinanceService);

  protected readonly searchQuery = signal('');
  protected readonly isCancelOpen = signal(false);
  protected readonly itemToCancel = signal<string | null>(null);
  protected cancelReason = '';

  protected readonly selectedPayment = signal<Payment | null>(null);

  protected readonly columns: TableColumn[] = [
    { key: 'receiptNo', header: 'Receipt No', isBold: true, isMono: true },
    { key: 'studentName', header: 'Student' },
    { key: 'date', header: 'Date' },
    { key: 'totalDisplay', header: 'Amount', align: 'right' },
    { key: 'mode', header: 'Mode' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  protected readonly stats = computed<StatItem[]>(() => {
    const list = this.financeService.payments();
    const cancelled = list.filter(p => p.status === 'Cancelled').length;
    return [
      { label: 'Total Issued', value: list.length, icon: 'receipt', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Cancelled', value: cancelled, icon: 'cancel', iconColorClass: 'text-rose-600', iconBgClass: 'bg-rose-50 border-rose-100' },
      { label: 'Audit Compliance', value: '100%', icon: 'verified_user', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' }
    ];
  });

  protected readonly filteredPayments = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.financeService.payments().filter(p => 
      !q || p.receiptNo.toLowerCase().includes(q) || p.studentName.toLowerCase().includes(q)
    ).map(p => ({
      ...p,
      totalDisplay: formatCurrency(p.total)
    }));
  });

  viewReceipt(p: Payment) { this.selectedPayment.set(p); }

  openCancelDialog(p: Payment) {
    if (p.status === 'Cancelled') return;
    this.itemToCancel.set(p.id);
    this.cancelReason = '';
    this.isCancelOpen.set(true);
  }

  cancelReceipt() {
    if (this.itemToCancel() && this.cancelReason) {
      this.financeService.cancelReceipt(this.itemToCancel()!, this.cancelReason);
      this.isCancelOpen.set(false);
    }
  }

  printReceipt() {
    const printContent = document.getElementById('printable-receipt-full');
    if (printContent) {
      const win = window.open('', '', 'width=900,height=900');
      if (win) {
        win.document.write('<html><head><title>Fee Receipt</title>');
        win.document.write('<link rel="stylesheet" href="https://cdn.tailwindcss.com">');
        win.document.write('</head><body>');
        win.document.write(printContent.innerHTML);
        win.document.write('</body></html>');
        win.document.close();
        setTimeout(() => win.print(), 500);
      }
    }
  }

  formatCurrency(amt: number) { return formatCurrency(amt); }
  amountToWords(amt: number) { return amountToWords(amt); }
}
