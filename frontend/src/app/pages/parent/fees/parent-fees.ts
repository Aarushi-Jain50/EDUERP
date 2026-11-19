import { ChangeDetectionStrategy, Component, inject, signal, computed, effect } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { StatusBadge } from '../../../components/shared/status-badge';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { EmptyState } from '../../../components/shared/empty-state';
import { Payment } from '../../../models/finance.model';
import { formatCurrency } from '../../../utils/money.helper';
import { ParentPortalFacade } from '../shared/parent-portal.facade';
import { PrintableReceiptModal } from '../shared/printable-receipt-modal';

interface ParentReceiptRow extends Payment {
  dateDisplay: string;
  amountDisplay: string;
}

@Component({
  selector: 'app-parent-fees',
  imports: [
    MatIconModule,
    PageHeader,
    StatStrip,
    StatusBadge,
    DataToolbar,
    DataTable,
    EmptyState,
    PrintableReceiptModal
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5 font-sans text-[#172554] text-[13px] pb-8 min-w-0">
      <div class="space-y-5 print:hidden">
        <app-page-header
          title="Fees & Receipts"
          [subtitle]="child() ? 'Academic year ' + summary().academicYear + ' fee ledger, installments, and accounts-office receipts for ' + child()!.name + ' (' + child()!.enrollmentNo + ').' : 'Select a linked child to view fee records.'"
        />

        @if (child(); as c) {
          <!-- Summary Card -->
          <section class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 space-y-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div class="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0]">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Total Fee</p>
                <p class="text-xl font-bold text-[#172554] mt-1 tabular-nums">{{ facade.formatINR(summary().totalFee) }}</p>
              </div>
              <div class="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0]">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Paid</p>
                <p class="text-xl font-bold text-emerald-700 mt-1 tabular-nums">{{ facade.formatINR(summary().paidAmount) }}</p>
              </div>
              <div class="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0]">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Due</p>
                <p
                  class="text-xl font-bold mt-1 tabular-nums"
                  [class]="summary().dueAmount > 0 ? 'text-rose-600' : 'text-emerald-700'"
                >
                  {{ facade.formatINR(summary().dueAmount) }}
                </p>
              </div>
              <div class="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0]">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Next Due Date</p>
                <p class="text-xl font-bold text-[#172554] mt-1">
                  {{ summary().nextDueDate ? facade.formatShortDate(summary().nextDueDate!) : 'All Cleared' }}
                </p>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-[#172554]">Fee Payment Progress</span>
                <span class="font-bold text-[#6D42E8] tabular-nums">{{ summary().paidPercent }}% Paid</span>
              </div>
              <div class="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-[#6D42E8] to-[#D946EF] transition-all"
                  [style.width.%]="summary().paidPercent"
                ></div>
              </div>
            </div>

            <!-- Calm Accounts Office Note (No Pay Button) -->
            <div class="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] flex items-center gap-2.5 text-xs text-[#172554]">
              <mat-icon class="text-base text-[#6D42E8] shrink-0">info</mat-icon>
              <span class="font-medium">Pay at the accounts office. Online payment is not available.</span>
            </div>
          </section>

          <!-- Tabs: Installments & Receipts -->
          <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div class="px-5 pt-3 border-b border-[#E2E8F0] flex items-center gap-6">
              <button
                type="button"
                (click)="activeTab.set('installments')"
                class="pb-3 text-[13px] font-semibold border-b-2 transition-colors cursor-pointer"
                [class]="activeTab() === 'installments' ? 'border-[#6D42E8] text-[#6D42E8]' : 'border-transparent text-[#64748B] hover:text-[#172554]'"
              >
                Installments ({{ summary().installmentRows.length }})
              </button>
              <button
                type="button"
                (click)="activeTab.set('receipts')"
                class="pb-3 text-[13px] font-semibold border-b-2 transition-colors cursor-pointer"
                [class]="activeTab() === 'receipts' ? 'border-[#6D42E8] text-[#6D42E8]' : 'border-transparent text-[#64748B] hover:text-[#172554]'"
              >
                Receipts ({{ receiptsSummary().totalCount }})
              </button>
            </div>

            @if (activeTab() === 'installments') {
              <div class="space-y-5 p-5">
                @if (summary().installmentRows.length > 0) {
                  <div class="overflow-x-auto border border-[#E2E8F0] rounded-xl">
                    <table class="w-full text-left border-collapse">
                      <thead class="bg-slate-50 border-b border-[#E2E8F0]">
                        <tr class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                          <th scope="col" class="px-4 py-3">Installment</th>
                          <th scope="col" class="px-4 py-3">Due Date</th>
                          <th scope="col" class="px-4 py-3 text-right">Amount</th>
                          <th scope="col" class="px-4 py-3 text-right">Paid</th>
                          <th scope="col" class="px-4 py-3 text-right">Late Fine</th>
                          <th scope="col" class="px-4 py-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-[#E2E8F0] text-[13px]">
                        @for (row of summary().installmentRows; track row.installmentId) {
                          <tr class="hover:bg-slate-50/70 transition-colors">
                            <td class="px-4 py-3.5 font-semibold text-[#172554]">{{ row.label }}</td>
                            <td class="px-4 py-3.5 text-[#64748B]">{{ facade.formatShortDate(row.dueDate) }}</td>
                            <td class="px-4 py-3.5 text-right tabular-nums font-medium text-[#172554]">{{ facade.formatINR(row.amount) }}</td>
                            <td class="px-4 py-3.5 text-right tabular-nums font-semibold text-emerald-700">{{ facade.formatINR(row.paid) }}</td>
                            <td
                              class="px-4 py-3.5 text-right tabular-nums font-medium"
                              [class]="row.lateFine > 0 ? 'text-rose-600' : 'text-[#64748B]'"
                            >
                              {{ facade.formatINR(row.lateFine) }}
                            </td>
                            <td class="px-4 py-3.5 text-right">
                              <app-status-badge [status]="row.displayStatus" />
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                } @else {
                  <app-empty-state
                    icon="payments"
                    title="No fee installments found"
                    message="No installment schedule exists for this student yet."
                  />
                }

                @if (summary().feeHeads.length > 0) {
                  <div class="space-y-3 pt-2">
                    <div>
                      <h2 class="text-sm font-bold text-[#172554]">Fee Head Breakdown</h2>
                      <p class="text-xs text-[#64748B] mt-0.5">Prescribed fee heads for {{ c.course }}</p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      @for (head of summary().feeHeads; track head.id) {
                        <div class="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] flex items-center justify-between gap-3">
                          <div class="min-w-0">
                            <p class="font-semibold text-[#172554] truncate">{{ head.name }}</p>
                            <p class="text-[11px] text-[#64748B]">{{ head.installmentLabel }}</p>
                          </div>
                          <span class="font-bold text-[#172554] tabular-nums shrink-0">{{ facade.formatINR(head.amount) }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }

            @if (activeTab() === 'receipts') {
              <div class="p-5 space-y-5">
                <app-stat-strip [items]="receiptStats()" />

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
                  [data]="filteredReceiptRows()"
                  idKey="id"
                  [hideEdit]="true"
                  [hideDelete]="true"
                  emptyIcon="receipt_long"
                  emptyTitle="No fee receipts found"
                  emptyMessage="Official receipts issued by the accounts office for this child will appear here."
                  (viewClicked)="openReceipt($event)"
                />
              </div>
            }
          </div>
        } @else {
          <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
            <app-empty-state
              icon="family_restroom"
              title="No linked child selected"
              message="Select a linked student to view fees and official receipts."
            />
          </div>
        }
      </div>

      <!-- Reusable Printable Receipt Modal -->
      <app-printable-receipt-modal
        [payment]="selectedPayment()"
        [instituteName]="facade.instituteProfile().name"
        [enrollmentNo]="child()?.enrollmentNo || ''"
        (closed)="selectedPayment.set(null)"
      />
    </div>
  `
})
export class ParentFees {
  protected readonly facade = inject(ParentPortalFacade);

  protected readonly child = this.facade.selectedChild;
  protected readonly summary = this.facade.selectedFeeDetail;
  protected readonly receiptsSummary = this.facade.selectedReceipts;

  protected readonly activeTab = signal<'installments' | 'receipts'>('installments');
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

  constructor() {
    effect(() => {
      this.child();
      this.selectedPayment.set(null);
      this.searchQuery.set('');
      this.statusFilter.set('All');
    });
  }

  protected readonly hasActiveFilters = computed(
    () => this.searchQuery().trim().length > 0 || this.statusFilter() !== 'All'
  );

  protected readonly receiptStats = computed<StatItem[]>(() => {
    const s = this.receiptsSummary();
    return [
      {
        label: 'Receipts',
        value: s.totalCount,
        subtext: s.paidCount + ' valid receipts',
        icon: 'receipt_long',
        iconColorClass: 'text-[#6D42E8]',
        iconBgClass: 'bg-purple-50 border-purple-100'
      },
      {
        label: 'Total Paid',
        value: formatCurrency(s.totalPaid),
        subtext: 'Excludes cancelled receipts',
        icon: 'payments',
        iconColorClass: 'text-emerald-600',
        iconBgClass: 'bg-emerald-50 border-emerald-100'
      },
      {
        label: 'Last Payment',
        value: s.lastPaymentDate ? this.facade.formatShortDate(s.lastPaymentDate) : 'None',
        subtext: 'Most recent paid receipt',
        icon: 'event',
        iconColorClass: 'text-indigo-600',
        iconBgClass: 'bg-indigo-50 border-indigo-100'
      }
    ];
  });

  protected readonly filteredReceiptRows = computed<ParentReceiptRow[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const st = this.statusFilter();

    return this.receiptsSummary()
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

  protected openReceipt(row: ParentReceiptRow): void {
    this.selectedPayment.set(row);
  }

  protected resetFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('All');
  }
}
