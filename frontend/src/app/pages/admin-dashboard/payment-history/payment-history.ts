import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { FinanceService } from '../../../services/finance.service';
import { AcademicService } from '../../../services/academic.service';
import { formatCurrency } from '../../../utils/money.helper';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-payment-history-page',
  imports: [CommonModule, PageHeader, StatStrip, DataToolbar, DataTable],
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans">
      <app-page-header title="Payment History" subtitle="Audit all financial transactions and receipt distributions across the institution." />
      
      <app-stat-strip [items]="stats()" />

      <!-- Mode-wise Split -->
      <div class="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm flex divide-x divide-slate-100">
         <div class="flex-1 px-4 py-2 flex flex-col gap-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cash Collection</span>
            <span class="text-sm font-black text-slate-900">{{ formatCurrency(modeSplit().Cash) }}</span>
         </div>
         <div class="flex-1 px-4 py-2 flex flex-col gap-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital (UPI/Card)</span>
            <span class="text-sm font-black text-[#6D42E8]">{{ formatCurrency(modeSplit().Digital) }}</span>
         </div>
         <div class="flex-1 px-4 py-2 flex flex-col gap-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Banking (Transfer/Cheque)</span>
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
        searchPlaceholder="Receipt No or Student..."
        [searchValue]="searchQuery()"
        (searchChange)="searchQuery.set($event)"
      />

      <app-data-table 
        [columns]="columns" 
        [data]="filteredPayments()" 
        idKey="id" 
      />
    </div>
  `
})
export class PaymentHistoryPage {
  protected readonly financeService = inject(FinanceService);
  protected readonly academicService = inject(AcademicService);

  protected readonly searchQuery = signal('');
  protected readonly selectedMode = signal('All');
  protected readonly selectedCourse = signal('All');

  protected readonly modeOptions: FilterOption[] = [
    { label: 'Mode: All', value: 'All' },
    { label: 'Cash', value: 'Cash' },
    { label: 'UPI', value: 'UPI' },
    { label: 'Card', value: 'Card' },
    { label: 'Cheque', value: 'Cheque' },
    { label: 'Bank Transfer', value: 'Bank Transfer' }
  ];

  protected readonly courseOptions = computed<FilterOption[]>(() => [
    { label: 'Course: All', value: 'All' },
    ...this.academicService.courses().map(c => ({ label: c.name, value: c.id }))
  ]);

  protected readonly stats = computed<StatItem[]>(() => {
    const list = this.financeService.payments().filter(p => p.status === 'Paid');
    const today = new Date().toISOString().split('T')[0];
    const todayTotal = list.filter(p => p.date === today).reduce((acc, p) => acc + p.total, 0);
    const monthTotal = list.reduce((acc, p) => acc + p.total, 0); // Mocked for simplicity
    
    return [
      { label: 'Today\'s Collection', value: formatCurrency(todayTotal), icon: 'today', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' },
      { label: 'Total Transaction Volume', value: formatCurrency(monthTotal), icon: 'payments', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Transactions', value: list.length, icon: 'receipt_long', iconColorClass: 'text-amber-600', iconBgClass: 'bg-amber-50 border-amber-100' }
    ];
  });

  protected readonly modeSplit = computed(() => {
    const list = this.financeService.payments().filter(p => p.status === 'Paid');
    return {
      Cash: list.filter(p => p.mode === 'Cash').reduce((acc, p) => acc + p.total, 0),
      Digital: list.filter(p => p.mode === 'UPI' || p.mode === 'Card').reduce((acc, p) => acc + p.total, 0),
      Banking: list.filter(p => p.mode === 'Cheque' || p.mode === 'Bank Transfer').reduce((acc, p) => acc + p.total, 0)
    };
  });

  protected readonly filteredPayments = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const mode = this.selectedMode();

    return this.financeService.payments().filter(p => {
      if (mode !== 'All' && p.mode !== mode) return false;
      // In a real app, courseName is already in the payment model
      if (q && !p.receiptNo.toLowerCase().includes(q) && !p.studentName.toLowerCase().includes(q)) return false;
      return true;
    }).map(p => ({
       ...p,
       amountDisplay: formatCurrency(p.total)
    }));
  });

  protected readonly columns: TableColumn[] = [
    { key: 'receiptNo', header: 'Receipt No', isBold: true, isMono: true },
    { key: 'studentName', header: 'Student' },
    { key: 'date', header: 'Date' },
    { key: 'mode', header: 'Mode' },
    { key: 'amountDisplay', header: 'Amount', align: 'right' },
    { key: 'collectedBy', header: 'Collected By' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  formatCurrency(amt: number) { return formatCurrency(amt); }
}
