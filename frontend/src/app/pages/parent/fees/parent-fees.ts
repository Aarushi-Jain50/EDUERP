import { ChangeDetectionStrategy, Component, inject, signal, computed, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { StatusBadge } from '../../../components/shared/status-badge';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { EmptyState } from '../../../components/shared/empty-state';
import { Payment } from '../../../models/finance.model';
import { formatCurrency } from '../../../utils/money.helper';
import { ParentInstallmentRow, ParentPortalFacade } from '../shared/parent-portal.facade';
import { PrintableReceiptModal } from '../shared/printable-receipt-modal';

interface ParentReceiptRow extends Payment {
  dateDisplay: string;
  amountDisplay: string;
}

@Component({
  selector: 'app-parent-fees',
  imports: [
    ReactiveFormsModule,
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
          [subtitle]="child() ? 'Academic year ' + summary().academicYear + ' fee ledger, installments, online payment, and official receipts for ' + child()!.name + ' (' + child()!.enrollmentNo + ').' : 'Select a linked child to view fee records.'"
          [actionLabel]="child() && summary().dueAmount > 0 ? 'Pay Fee Online' : ''"
          actionIcon="payments"
          (actionClicked)="openPayModal()"
        />

        @if (child(); as c) {
          <!-- Summary Card -->
          <section class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 space-y-5">
            <div class="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div class="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] min-w-0">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Total Fee</p>
                <p class="text-lg sm:text-xl font-bold text-[#172554] mt-1 tabular-nums break-words">{{ facade.formatINR(summary().totalFee) }}</p>
              </div>
              <div class="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] min-w-0">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Paid</p>
                <p class="text-lg sm:text-xl font-bold text-emerald-700 mt-1 tabular-nums break-words">{{ facade.formatINR(summary().paidAmount) }}</p>
              </div>
              <div class="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] min-w-0">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Due</p>
                <p
                  class="text-lg sm:text-xl font-bold mt-1 tabular-nums break-words"
                  [class]="summary().dueAmount > 0 ? 'text-rose-600' : 'text-emerald-700'"
                >
                  {{ facade.formatINR(summary().dueAmount) }}
                </p>
              </div>
              <div class="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] min-w-0">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Next Due Date</p>
                <p class="text-lg sm:text-xl font-bold text-[#172554] mt-1">
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

            <!-- Online Payment CTA Banner -->
            @if (summary().dueAmount > 0) {
              <div class="p-4 rounded-xl bg-purple-50/70 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-start sm:items-center gap-2.5 text-xs text-[#172554]">
                  <mat-icon class="text-base text-[#6D42E8] shrink-0">verified_user</mat-icon>
                  <span class="font-medium">
                    Pending balance of <strong class="font-bold">{{ facade.formatINR(summary().dueAmount) }}</strong> can be paid online via UPI, Card, or Net Banking for instant receipt generation.
                  </span>
                </div>
                <button
                  type="button"
                  (click)="openPayModal()"
                  class="gradient-accent text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:opacity-95 transition-opacity inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <mat-icon class="text-sm">lock</mat-icon>
                  <span>Pay {{ facade.formatINR(summary().dueAmount) }}</span>
                </button>
              </div>
            } @else {
              <div class="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900">
                <mat-icon class="text-base text-emerald-600 shrink-0">check_circle</mat-icon>
                <span class="font-medium">All prescribed fee installments for {{ summary().academicYear }} are fully paid.</span>
              </div>
            }
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
                  <!-- Mobile Card View (< md) -->
                  <div class="md:hidden divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl overflow-hidden">
                    @for (row of summary().installmentRows; track row.installmentId) {
                      <div class="p-4 space-y-2.5 bg-white">
                        <div class="flex items-start justify-between gap-2">
                          <div class="min-w-0">
                            <p class="font-semibold text-[#172554]">{{ row.label }}</p>
                            <p class="text-[11px] text-[#64748B] mt-0.5">Due {{ facade.formatShortDate(row.dueDate) }}</p>
                          </div>
                          <app-status-badge [status]="row.displayStatus" />
                        </div>
                        <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                          <div class="grid grid-cols-3 gap-2 flex-1">
                            <div>
                              <p class="text-[10px] uppercase text-[#64748B] font-semibold">Amount</p>
                              <p class="font-semibold text-[#172554] tabular-nums mt-0.5">{{ facade.formatINR(row.amount) }}</p>
                            </div>
                            <div>
                              <p class="text-[10px] uppercase text-[#64748B] font-semibold">Paid</p>
                              <p class="font-semibold text-emerald-700 tabular-nums mt-0.5">{{ facade.formatINR(row.paid) }}</p>
                            </div>
                            <div>
                              <p class="text-[10px] uppercase text-[#64748B] font-semibold">Late Fine</p>
                              <p class="font-semibold tabular-nums mt-0.5" [class]="row.lateFine > 0 ? 'text-rose-600' : 'text-[#64748B]'">
                                {{ facade.formatINR(row.lateFine) }}
                              </p>
                            </div>
                          </div>
                          @if (row.balance > 0) {
                            <button
                              type="button"
                              (click)="openPayModal(row)"
                              class="px-3 py-1.5 rounded-lg bg-[#6D42E8] text-white text-[11px] font-bold cursor-pointer shrink-0"
                            >
                              Pay
                            </button>
                          }
                        </div>
                      </div>
                    }
                  </div>

                  <!-- Desktop Table View (>= md) -->
                  <div class="hidden md:block overflow-x-auto border border-[#E2E8F0] rounded-xl">
                    <table class="w-full text-left border-collapse">
                      <thead class="bg-slate-50 border-b border-[#E2E8F0]">
                        <tr class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                          <th scope="col" class="px-4 py-3 whitespace-nowrap">Installment</th>
                          <th scope="col" class="px-4 py-3 whitespace-nowrap">Due Date</th>
                          <th scope="col" class="px-4 py-3 text-right whitespace-nowrap">Amount</th>
                          <th scope="col" class="px-4 py-3 text-right whitespace-nowrap">Paid</th>
                          <th scope="col" class="px-4 py-3 text-right whitespace-nowrap">Late Fine</th>
                          <th scope="col" class="px-4 py-3 text-right whitespace-nowrap">Status</th>
                          <th scope="col" class="px-4 py-3 text-right whitespace-nowrap">Action</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-[#E2E8F0] text-[13px]">
                        @for (row of summary().installmentRows; track row.installmentId) {
                          <tr class="hover:bg-slate-50/70 transition-colors">
                            <td class="px-4 py-3.5 font-semibold text-[#172554]">{{ row.label }}</td>
                            <td class="px-4 py-3.5 text-[#64748B] whitespace-nowrap">{{ facade.formatShortDate(row.dueDate) }}</td>
                            <td class="px-4 py-3.5 text-right tabular-nums font-medium text-[#172554] whitespace-nowrap">{{ facade.formatINR(row.amount) }}</td>
                            <td class="px-4 py-3.5 text-right tabular-nums font-semibold text-emerald-700 whitespace-nowrap">{{ facade.formatINR(row.paid) }}</td>
                            <td
                              class="px-4 py-3.5 text-right tabular-nums font-medium whitespace-nowrap"
                              [class]="row.lateFine > 0 ? 'text-rose-600' : 'text-[#64748B]'"
                            >
                              {{ facade.formatINR(row.lateFine) }}
                            </td>
                            <td class="px-4 py-3.5 text-right whitespace-nowrap">
                              <app-status-badge [status]="row.displayStatus" />
                            </td>
                            <td class="px-4 py-3.5 text-right whitespace-nowrap">
                              @if (row.balance > 0) {
                                <button
                                  type="button"
                                  (click)="openPayModal(row)"
                                  class="px-3 py-1 rounded-lg bg-purple-50 hover:bg-[#6D42E8] text-[#6D42E8] hover:text-white border border-purple-200 text-xs font-bold transition-colors cursor-pointer"
                                >
                                  Pay {{ facade.formatINR(row.balance) }}
                                </button>
                              } @else {
                                <span class="text-[11px] font-medium text-[#64748B]">Settled</span>
                              }
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

      <!-- Online Fee Payment Modal -->
      @if (isPayModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs print:hidden">
          <div class="bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] max-w-md w-full overflow-hidden">
            <div class="px-5 py-4 bg-slate-50 border-b border-[#E2E8F0] flex items-center justify-between">
              <div class="flex items-center gap-2">
                <mat-icon class="text-lg text-[#6D42E8]">payments</mat-icon>
                <h2 class="text-sm font-bold text-[#172554]">Online Fee Payment</h2>
              </div>
              <button
                type="button"
                (click)="isPayModalOpen.set(false)"
                aria-label="Close payment modal"
                class="w-8 h-8 rounded-lg text-[#64748B] hover:text-[#172554] hover:bg-slate-200/60 flex items-center justify-center cursor-pointer"
              >
                <mat-icon class="text-lg">close</mat-icon>
              </button>
            </div>

            <form [formGroup]="payForm" (ngSubmit)="confirmOnlinePayment()" class="p-5 space-y-4">
              <div class="space-y-1.5">
                <label for="pay-inst-select" class="text-xs font-semibold text-[#172554]">Select Installment(s)</label>
                <select
                  id="pay-inst-select"
                  formControlName="targetScope"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                >
                  @for (row of unpaidInstallments(); track row.installmentId) {
                    <option [value]="row.installmentId">
                      {{ row.label }} — {{ facade.formatINR(row.balance) }} (Due {{ facade.formatShortDate(row.dueDate) }})
                    </option>
                  }
                  @if (unpaidInstallments().length > 1) {
                    <option value="ALL">Pay Full Pending Balance — {{ facade.formatINR(summary().dueAmount) }}</option>
                  }
                </select>
              </div>

              <div class="space-y-1.5">
                <label for="pay-mode-select" class="text-xs font-semibold text-[#172554]">Payment Method</label>
                <select
                  id="pay-mode-select"
                  formControlName="mode"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                >
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Card">Debit / Credit Card</option>
                  <option value="Bank Transfer">Net Banking / NEFT</option>
                </select>
              </div>

              <div class="space-y-1.5">
                <label for="pay-ref-input" class="text-xs font-semibold text-[#172554]">UPI ID / Transaction Note (Optional)</label>
                <input
                  id="pay-ref-input"
                  type="text"
                  formControlName="referenceNote"
                  placeholder="Auto-generated if left blank"
                  class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                />
              </div>

              <div class="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] flex items-center justify-between">
                <span class="text-xs font-semibold text-[#64748B]">Payable Amount</span>
                <span class="text-lg font-extrabold text-[#172554] tabular-nums">{{ facade.formatINR(payablePreview()) }}</span>
              </div>

              <div class="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  (click)="isPayModalOpen.set(false)"
                  class="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="payForm.invalid || payablePreview() <= 0"
                  class="gradient-accent text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:opacity-95 disabled:opacity-40 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <mat-icon class="text-sm">check_circle</mat-icon>
                  <span>Confirm & Pay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      }

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
  protected readonly isPayModalOpen = signal<boolean>(false);

  protected readonly payForm = new FormGroup({
    targetScope: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    mode: new FormControl<'UPI' | 'Card' | 'Bank Transfer'>('UPI', { nonNullable: true, validators: [Validators.required] }),
    referenceNote: new FormControl<string>('', { nonNullable: true })
  });

  protected readonly unpaidInstallments = computed(() =>
    this.summary().installmentRows.filter(r => r.balance > 0)
  );

  private readonly targetScopeValue = toSignal(this.payForm.controls.targetScope.valueChanges, {
    initialValue: this.payForm.controls.targetScope.value
  });

  protected readonly payablePreview = computed(() => {
    const scope = this.targetScopeValue() || (this.unpaidInstallments()[0]?.installmentId ?? '');
    if (scope === 'ALL') return this.summary().dueAmount;
    const match = this.unpaidInstallments().find(r => r.installmentId === scope);
    return match ? match.balance : this.summary().dueAmount;
  });

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

  protected openPayModal(row?: ParentInstallmentRow): void {
    const firstUnpaid = row || this.unpaidInstallments()[0];
    if (!firstUnpaid) return;
    this.payForm.reset({
      targetScope: row ? row.installmentId : (this.unpaidInstallments().length > 1 ? 'ALL' : firstUnpaid.installmentId),
      mode: 'UPI',
      referenceNote: ''
    });
    this.isPayModalOpen.set(true);
  }

  protected confirmOnlinePayment(): void {
    if (this.payForm.invalid) return;
    const val = this.payForm.getRawValue();
    const targetIds =
      val.targetScope === 'ALL'
        ? this.unpaidInstallments().map(r => r.installmentId)
        : [val.targetScope];
    const receipt = this.facade.payInstallmentsOnline(targetIds, val.mode, val.referenceNote);
    this.isPayModalOpen.set(false);
    if (receipt) {
      this.activeTab.set('receipts');
      this.selectedPayment.set(receipt);
    }
  }

  protected openReceipt(row: ParentReceiptRow): void {
    this.selectedPayment.set(row);
  }

  protected resetFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('All');
  }
}
