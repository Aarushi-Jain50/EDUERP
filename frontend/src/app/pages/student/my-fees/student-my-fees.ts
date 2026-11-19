import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatusBadge } from '../../../components/shared/status-badge';
import { EmptyState } from '../../../components/shared/empty-state';
import { StudentPortalFacade, StudentInstallmentRow } from '../shared/student-portal.facade';
import { StudentFirebaseService } from '../../../services/student-firebase.service';

@Component({
  selector: 'app-student-my-fees',
  imports: [ReactiveFormsModule, MatIconModule, PageHeader, StatusBadge, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-[#172554] text-[13px] pb-10 min-w-0">
      <app-page-header
        title="My Fees & Online Payments"
        [subtitle]="'Academic year ' + summary().academicYear + ' fee structure, installments, and secure online payment gateway for ' + facade.currentStudent().enrollmentNo + '.'"
      />

      <!-- Fee Summary Card -->
      <section class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 sm:p-5 space-y-5">
        <div class="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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

        <!-- Paid vs Total Progress Bar -->
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

        <!-- Online Payment Banner -->
        <div class="p-4 rounded-xl bg-purple-50/80 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-[#6D42E8] text-white flex items-center justify-center shrink-0 shadow-sm">
              <mat-icon class="text-lg">verified_user</mat-icon>
            </div>
            <div>
              <p class="font-bold text-[#172554] text-sm">Secure Online Fee Payment Gateway</p>
              <p class="text-xs text-[#64748B]">Pay pending installments instantly via UPI QR, Net Banking, or Credit/Debit Card.</p>
            </div>
          </div>
          @if (summary().dueAmount > 0) {
            <button
              type="button"
              (click)="openPayModal()"
              class="gradient-accent text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:opacity-95 transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              Pay Now ({{ facade.formatINR(summary().dueAmount) }})
            </button>
          }
        </div>

        @if (lastReceiptNo()) {
          <div class="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2.5 min-w-0">
              <mat-icon class="text-emerald-700 text-lg shrink-0">check_circle</mat-icon>
              <p class="text-xs text-emerald-950 font-medium">
                Payment of <span class="font-bold tabular-nums">{{ facade.formatINR(lastPaidAmount() || 0) }}</span> settled.
                Receipt <span class="font-mono font-bold">{{ lastReceiptNo() }}</span> recorded in your ledger.
              </p>
            </div>
            <button
              type="button"
              aria-label="Dismiss receipt notice"
              (click)="lastReceiptNo.set(null)"
              class="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg cursor-pointer shrink-0"
            >
              <mat-icon class="text-sm">close</mat-icon>
            </button>
          </div>
        }
      </section>

      <!-- Fee Structure Breakdown -->
      <section class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 sm:p-5 space-y-4">
        <div>
          <h2 class="text-sm font-bold text-[#172554]">Fee Structure Breakdown</h2>
          <p class="text-xs text-[#64748B] mt-0.5">Component heads prescribed for {{ facade.currentStudent().course }}</p>
        </div>

        @if (summary().feeHeads.length > 0) {
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
        } @else {
          <app-empty-state
            icon="account_balance_wallet"
            title="No fee structure mapped"
            message="Fee heads for your enrolled course will appear here once configured by finance."
          />
        }
      </section>

      <!-- Installment Schedule Table -->
      <section class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div class="px-4 sm:px-5 py-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 class="text-sm font-bold text-[#172554]">Installment Schedule</h2>
            <p class="text-xs text-[#64748B] mt-0.5">Late fine applies at {{ facade.formatINR(summary().lateFinePerDay) }}/day after due date</p>
          </div>
          <span class="text-xs font-semibold text-[#64748B] whitespace-nowrap">{{ summary().installmentRows.length }} Installments</span>
        </div>

        @if (summary().installmentRows.length > 0) {
          <!-- Mobile Installment Cards (< md) -->
          <div class="md:hidden divide-y divide-[#E2E8F0]">
            @for (row of summary().installmentRows; track row.installmentId) {
              <div class="p-4 space-y-3">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="font-semibold text-[13px] text-[#172554]">{{ row.label }}</p>
                    <p class="text-[11px] text-[#64748B] mt-0.5">Due {{ facade.formatShortDate(row.dueDate) }}</p>
                  </div>
                  <app-status-badge [status]="row.displayStatus" />
                </div>

                <div class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Amount</p>
                    <p class="font-semibold text-[#172554] tabular-nums mt-0.5">{{ facade.formatINR(row.amount) }}</p>
                  </div>
                  <div>
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Paid</p>
                    <p class="font-semibold text-emerald-700 tabular-nums mt-0.5">{{ facade.formatINR(row.paid) }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Late Fine</p>
                    <p
                      class="font-semibold tabular-nums mt-0.5"
                      [class]="row.lateFine > 0 ? 'text-rose-600' : 'text-[#64748B]'"
                    >
                      {{ facade.formatINR(row.lateFine) }}
                    </p>
                  </div>
                </div>

                @if (row.balance > 0) {
                  <div class="pt-2">
                    <button
                      type="button"
                      (click)="openPayModal(row)"
                      class="w-full py-2 bg-purple-50 hover:bg-purple-100 text-[#6D42E8] text-xs font-bold rounded-xl border border-purple-200 transition-colors cursor-pointer"
                    >
                      Pay {{ facade.formatINR(row.balance) }}
                    </button>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Tablet & Desktop Table View (>= md) -->
          <div class="hidden md:block overflow-x-auto">
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
                          class="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#6D42E8] text-xs font-bold border border-purple-200 transition-colors cursor-pointer"
                        >
                          Pay Now
                        </button>
                      } @else {
                        <span class="text-xs text-emerald-600 font-semibold">Settled</span>
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
            message="No installment records exist for this student yet."
          />
        }
      </section>

      <!-- Secure Checkout Modal -->
      @if (isPayModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close modal overlay"
            class="fixed inset-0 bg-black/50 backdrop-blur-xs w-full h-full border-0 cursor-default"
            (click)="isPayModalOpen.set(false)"
          ></button>

          <div class="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md z-10 border border-[#E2E8F0] space-y-5">
            <div class="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 class="text-base font-bold text-[#172554]">Secure Fee Payment</h3>
                <p class="text-xs text-[#64748B]">
                  {{ selectedInstallment() ? selectedInstallment()!.label : 'Total Due Balance' }}
                </p>
              </div>
              <button
                type="button"
                (click)="isPayModalOpen.set(false)"
                class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <mat-icon class="text-sm">close</mat-icon>
              </button>
            </div>

            <form [formGroup]="payForm" (ngSubmit)="processPayment()" class="space-y-4">
              <div class="p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between">
                <span class="text-xs font-medium text-purple-900">Amount Payable</span>
                <span class="text-base font-bold text-[#6D42E8] tabular-nums">
                  {{ facade.formatINR(selectedInstallment() ? selectedInstallment()!.balance : summary().dueAmount) }}
                </span>
              </div>

              <!-- Payment Method Selector -->
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  (click)="paymentMethod.set('upi')"
                  class="p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                  [class]="paymentMethod() === 'upi' ? 'border-[#6D42E8] bg-purple-50/70 text-[#6D42E8]' : 'border-slate-200 text-slate-700 bg-white'"
                >
                  <mat-icon class="text-base">qr_code_2</mat-icon>
                  <span>UPI / QR</span>
                </button>
                <button
                  type="button"
                  (click)="paymentMethod.set('card')"
                  class="p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                  [class]="paymentMethod() === 'card' ? 'border-[#6D42E8] bg-purple-50/70 text-[#6D42E8]' : 'border-slate-200 text-slate-700 bg-white'"
                >
                  <mat-icon class="text-base">credit_card</mat-icon>
                  <span>Card / NetBanking</span>
                </button>
              </div>

              @if (paymentMethod() === 'upi') {
                <div class="space-y-1.5">
                  <label for="upi-id" class="text-xs font-semibold text-[#172554]">Virtual Payment Address (UPI ID)</label>
                  <input
                    id="upi-id"
                    formControlName="upiId"
                    placeholder="e.g. username@okhdfcbank"
                    class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                  />
                </div>
              } @else {
                <div class="space-y-3">
                  <div class="space-y-1.5">
                    <label for="card-num" class="text-xs font-semibold text-[#172554]">Card Number</label>
                    <input
                      id="card-num"
                      formControlName="cardNumber"
                      placeholder="4532 •••• •••• 9821"
                      class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                    />
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div class="space-y-1.5">
                      <label for="card-exp" class="text-xs font-semibold text-[#172554]">Expiry (MM/YY)</label>
                      <input
                        id="card-exp"
                        formControlName="cardExpiry"
                        placeholder="08/28"
                        class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                      />
                    </div>
                    <div class="space-y-1.5">
                      <label for="card-cvv" class="text-xs font-semibold text-[#172554]">CVV</label>
                      <input
                        id="card-cvv"
                        formControlName="cardCvv"
                        type="password"
                        maxlength="4"
                        placeholder="•••"
                        class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                      />
                    </div>
                  </div>
                </div>
              }

              @if (paymentError()) {
                <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
                  {{ paymentError() }}
                </div>
              }

              <div class="pt-3 border-t border-[#E2E8F0] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  (click)="isPayModalOpen.set(false)"
                  class="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="payForm.invalid || isSubmitting()"
                  class="gradient-accent text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2 whitespace-nowrap"
                >
                  @if (isSubmitting()) {
                    <span class="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                  }
                  <span>Pay Securely</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class StudentMyFees {
  protected readonly facade = inject(StudentPortalFacade);
  private readonly firebaseService = inject(StudentFirebaseService);
  protected readonly summary = computed(() => this.facade.studentFeeSummary());

  protected readonly isPayModalOpen = signal<boolean>(false);
  protected readonly selectedInstallment = signal<StudentInstallmentRow | null>(null);
  protected readonly paymentMethod = signal<'upi' | 'card'>('upi');
  protected readonly isSubmitting = signal<boolean>(false);
  protected readonly paymentError = signal<string | null>(null);
  protected readonly lastReceiptNo = signal<string | null>(null);
  protected readonly lastPaidAmount = signal<number | null>(null);

  protected readonly payForm = new FormGroup({
    upiId: new FormControl('student@oksbi', Validators.required),
    cardNumber: new FormControl('4532 8821 9091 4410', Validators.required),
    cardExpiry: new FormControl('09/28', Validators.required),
    cardCvv: new FormControl('382', Validators.required)
  });

  protected openPayModal(row?: StudentInstallmentRow): void {
    this.paymentError.set(null);
    this.selectedInstallment.set(row ?? null);
    this.isPayModalOpen.set(true);
  }

  protected async processPayment(): Promise<void> {
    if (this.payForm.invalid || this.isSubmitting()) return;
    this.paymentError.set(null);
    this.isSubmitting.set(true);

    try {
      const inst = this.selectedInstallment();
      const currentSummary = this.summary();
      const amount = inst ? inst.balance : currentSummary.dueAmount;
      if (amount <= 0) {
        this.isSubmitting.set(false);
        this.isPayModalOpen.set(false);
        return;
      }

      const items = inst
        ? [{ installmentId: inst.installmentId, amount: inst.balance, fine: 0 }]
        : currentSummary.installmentRows
            .filter(r => r.balance > 0)
            .map(r => ({ installmentId: r.installmentId, amount: r.balance, fine: 0 }));

      const dueDate = inst
        ? inst.dueDate
        : (currentSummary.nextDueDate ?? new Date().toISOString().split('T')[0]);

      const result = await this.firebaseService.recordFeePayment({
        title: inst ? inst.label : 'Semester Fee Payment',
        amount,
        dueDate,
        ...(inst ? { installmentId: inst.installmentId } : {}),
        paymentMethod: this.paymentMethod() === 'upi' ? 'UPI' : 'Card',
        items
      });

      this.lastReceiptNo.set(result.receiptNo);
      this.lastPaidAmount.set(amount);
      this.isSubmitting.set(false);
      this.selectedInstallment.set(null);
      this.isPayModalOpen.set(false);
    } catch {
      this.isSubmitting.set(false);
      this.paymentError.set('Unable to process payment right now. Please try again.');
    }
  }
}
