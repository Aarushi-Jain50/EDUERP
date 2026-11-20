import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { FinanceService } from '../../../services/finance.service';
import { StudentsService } from '../../../services/students.service';
import { AcademicService } from '../../../services/academic.service';
import { Payment, PaymentMode, StudentInstallmentLedger } from '../../../models/finance.model';
import { amountToWords, formatCurrency } from '../../../utils/money.helper';
import { exportReceiptToPdf } from '../../../utils/export.helper';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-fee-collection-page',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, PageHeader],
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans">
      <app-page-header
        title="Fee Collection Desk"
        subtitle="Search student ledgers, apply scholarships or partial payments, compute late fines, and issue official PDF receipts."
      />

      <div class="flex flex-col lg:flex-row gap-6 min-h-[600px]">
        <!-- Left: Student Directory Search -->
        <div class="w-full lg:w-[350px] flex flex-col gap-4 shrink-0">
          <div class="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <mat-icon class="!text-base !w-4 !h-4">search</mat-icon>
              </span>
              <input
                type="text"
                [formControl]="searchControl"
                (input)="searchQuery.set(searchControl.value || '')"
                placeholder="Search student name or roll no..."
                class="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
              />
            </div>

            <div class="flex flex-col divide-y divide-slate-100 max-h-[520px] overflow-y-auto custom-scrollbar">
              @for (s of filteredStudents(); track s.id) {
                <button
                  type="button"
                  (click)="selectStudent(s.id)"
                  [class.bg-purple-50]="selectedStudentId() === s.id"
                  class="p-3 text-left hover:bg-slate-50 transition-colors flex flex-col gap-1 cursor-pointer group rounded-xl"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-[13px] font-bold text-slate-900 group-hover:text-[#6D42E8] truncate">{{ s.name }}</span>
                    <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{{ s.semester }}</span>
                  </div>
                  <div class="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                    <span class="font-mono">{{ s.enrollmentNo }}</span>
                    <span class="truncate max-w-[160px]">{{ s.course }}</span>
                  </div>
                </button>
              } @empty {
                <div class="p-8 text-center text-slate-400">
                  <mat-icon class="!text-3xl !w-8 !h-8 block mx-auto mb-2 opacity-30">person_search</mat-icon>
                  <p class="text-xs italic">No matching students found.</p>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Right: Ledger & Payment Interface -->
        <div class="flex-1 flex flex-col gap-6 min-w-0">
          @if (ledger(); as l) {
            <!-- Student Summary Card -->
            <div class="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row gap-6 items-center">
              <div class="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#6D42E8] text-2xl font-black shrink-0">
                {{ getInitials(l.studentName) }}
              </div>
              <div class="flex-1 text-center sm:text-left min-w-0">
                <h3 class="text-lg font-black text-slate-900 leading-none truncate">{{ l.studentName }}</h3>
                <p class="text-xs text-slate-500 font-semibold mt-1.5">
                  {{ l.enrollmentNo }} • {{ studentCourseName() }} • {{ studentSemester() }}
                </p>
              </div>
              <div class="flex flex-wrap gap-3 justify-center">
                <div class="px-4 py-2 bg-rose-50/70 rounded-xl border border-rose-100 text-center">
                  <span class="text-[10px] font-bold text-rose-500 uppercase tracking-widest block">Total Due</span>
                  <span class="text-sm font-black text-rose-600">{{ formatCurrency(totalOutstanding()) }}</span>
                </div>
                <div class="px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                  <span class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block">Settled</span>
                  <span class="text-sm font-black text-emerald-700">{{ formatCurrency(totalPaid()) }}</span>
                </div>
              </div>
            </div>

            <!-- Installment Breakdown Table -->
            <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div class="p-4 border-b border-[#E2E8F0] bg-slate-50/50 flex items-center justify-between">
                <h4 class="text-xs font-bold text-slate-700">Installment Ledger (Supports Partial Payments)</h4>
                <span class="text-[11px] font-semibold text-slate-500">{{ selectedInstallmentIds().size }} selected</span>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th class="px-4 py-3 border-b border-[#E2E8F0] w-12 text-center">Pay</th>
                      <th class="px-4 py-3 border-b border-[#E2E8F0]">Installment</th>
                      <th class="px-4 py-3 border-b border-[#E2E8F0]">Due Date</th>
                      <th class="px-4 py-3 border-b border-[#E2E8F0] text-right">Fee</th>
                      <th class="px-4 py-3 border-b border-[#E2E8F0] text-right">Fine</th>
                      <th class="px-4 py-3 border-b border-[#E2E8F0] text-right">Balance</th>
                      <th class="px-4 py-3 border-b border-[#E2E8F0] text-right">Pay Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (inst of l.installments; track inst.installmentId) {
                      @let balance = getBalance(inst);
                      <tr class="hover:bg-slate-50/40 transition-colors">
                        <td class="px-4 py-4 text-center">
                          @if (balance > 0) {
                            <input
                              type="checkbox"
                              [checked]="isSelected(inst.installmentId)"
                              (change)="toggleSelection(inst)"
                              class="w-4 h-4 rounded border-slate-300 text-[#6D42E8] focus:ring-[#6D42E8] cursor-pointer"
                            />
                          } @else {
                            <mat-icon class="!text-base !w-4 !h-4 text-emerald-500">check_circle</mat-icon>
                          }
                        </td>
                        <td class="px-4 py-4">
                          <div class="flex flex-col">
                            <span class="text-xs font-bold text-slate-800">{{ inst.label }}</span>
                            <span class="text-[10px] font-semibold" [class.text-emerald-600]="inst.status === 'Paid'" [class.text-amber-600]="inst.status === 'Partial'" [class.text-rose-600]="inst.status === 'Overdue'" [class.text-slate-400]="inst.status === 'Unpaid'">
                              {{ inst.status }}
                            </span>
                          </div>
                        </td>
                        <td class="px-4 py-4 text-xs font-medium" [class.text-rose-600]="isOverdue(inst.dueDate) && balance > 0">
                          {{ inst.dueDate }}
                        </td>
                        <td class="px-4 py-4 text-xs font-bold text-slate-700 text-right">{{ formatCurrency(inst.totalAmount) }}</td>
                        <td class="px-4 py-4 text-xs font-bold text-rose-500 text-right">{{ formatCurrency(getFine(inst)) }}</td>
                        <td class="px-4 py-4 text-xs font-black text-slate-900 text-right">{{ formatCurrency(balance) }}</td>
                        <td class="px-4 py-4 text-right">
                          @if (isSelected(inst.installmentId) && balance > 0) {
                            <input
                              type="number"
                              min="1"
                              [max]="balance"
                              [value]="getCustomPayAmount(inst)"
                              (input)="setCustomPayAmount(inst.installmentId, $any($event.target).value, balance)"
                              class="w-28 h-8 px-2 text-right bg-indigo-50/50 border border-indigo-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6D42E8]"
                            />
                          } @else {
                            <span class="text-xs text-slate-400">—</span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Payment Details & Live Total -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <form [formGroup]="paymentForm" class="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
                <h4 class="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">Payment & Scholarship Details</h4>

                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-1.5">
                    <label for="pm-mode" class="text-[11px] font-bold text-slate-600">Payment Mode</label>
                    <select id="pm-mode" formControlName="mode" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI / GPay / PhonePe</option>
                      <option value="Cheque">Cheque / Demand Draft</option>
                      <option value="Card">Credit / Debit Card</option>
                      <option value="Bank Transfer">NEFT / RTGS / IMPS</option>
                    </select>
                  </div>
                  <div class="space-y-1.5">
                    <label for="pm-ref" class="text-[11px] font-bold text-slate-600">Reference / UTR No</label>
                    <input id="pm-ref" type="text" formControlName="refNo" placeholder="Transaction / Cheque ID" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
                  </div>
                </div>

                <div class="space-y-1.5">
                  <label for="pm-sch" class="text-[11px] font-bold text-slate-600">Apply Institutional Scholarship</label>
                  <select id="pm-sch" formControlName="scholarshipCode" (change)="applyScholarshipPreset()" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
                    <option value="">None (Standard Fee)</option>
                    @for (sch of activeScholarships(); track sch.id) {
                      <option [value]="sch.code">{{ sch.name }} ({{ sch.code }} — {{ sch.type === 'Percentage' ? sch.value + '%' : '₹' + sch.value }})</option>
                    }
                  </select>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-1.5">
                    <label for="pm-concession" class="text-[11px] font-bold text-slate-600">Concession / Waiver (₹)</label>
                    <input id="pm-concession" type="number" min="0" formControlName="concession" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
                  </div>
                  <div class="space-y-1.5">
                    <label for="pm-reason" class="text-[11px] font-bold text-slate-600">Concession Remarks</label>
                    <input id="pm-reason" type="text" formControlName="concessionReason" placeholder="e.g. Merit Scholarship" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
                  </div>
                </div>
              </form>

              <!-- Live Summary Card -->
              <div class="bg-[#1A1745] p-6 rounded-2xl text-white flex flex-col justify-between shadow-xl">
                <div class="space-y-3">
                  <div class="flex justify-between items-center text-slate-300 text-[11px] font-bold uppercase tracking-wider">
                    <span>Selected Installments</span>
                    <span>{{ formatCurrency(selectedSubtotal()) }}</span>
                  </div>
                  <div class="flex justify-between items-center text-slate-300 text-[11px] font-bold uppercase tracking-wider">
                    <span>Late Fine</span>
                    <span class="text-rose-400">+ {{ formatCurrency(selectedFine()) }}</span>
                  </div>
                  <div class="flex justify-between items-center text-slate-300 text-[11px] font-bold uppercase tracking-wider">
                    <span>Scholarship / Concession</span>
                    <span class="text-emerald-400">- {{ formatCurrency(concessionAmount()) }}</span>
                  </div>
                  <div class="h-px bg-white/10 my-2"></div>
                  <div class="flex justify-between items-end gap-4">
                    <div class="flex flex-col">
                      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Net Payable</span>
                      <span class="text-2xl font-black">{{ formatCurrency(netPayable()) }}</span>
                    </div>
                    <div class="text-[10px] font-medium text-slate-300 italic text-right max-w-[200px]">
                      {{ amountToWords(netPayable()) }}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  (click)="collectPayment()"
                  [disabled]="selectedInstallmentIds().size === 0 || netPayable() <= 0"
                  class="w-full mt-6 py-3.5 bg-gradient-to-r from-[#6D42E8] to-[#D946EF] hover:from-[#5b35c9] hover:to-[#c236d8] text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <mat-icon class="!text-base !w-4 !h-4">payments</mat-icon>
                  Collect Payment & Issue Receipt
                </button>
              </div>
            </div>
          } @else {
            <div class="flex-1 bg-white rounded-2xl border border-dashed border-slate-300 p-20 flex flex-col items-center justify-center text-center">
              <div class="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4 border border-slate-100">
                <mat-icon class="!text-4xl !w-9 !h-9">payments</mat-icon>
              </div>
              <h3 class="text-lg font-bold text-slate-800">Select a Student</h3>
              <p class="text-slate-500 text-sm max-w-xs mt-1">Choose a student from the left directory to view their installment ledger and record payments.</p>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- Receipt Preview Modal -->
    @if (showReceipt() && lastPayment(); as lp) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div class="p-4 bg-slate-50 border-b flex justify-between items-center">
            <span class="text-xs font-black text-slate-800 uppercase tracking-widest">Official Fee Receipt Issued</span>
            <button type="button" (click)="showReceipt.set(false)" class="text-slate-400 hover:text-slate-600 cursor-pointer">
              <mat-icon class="!text-lg !w-5 !h-5">close</mat-icon>
            </button>
          </div>
          <div class="p-8 space-y-6">
            <div class="flex justify-between items-start border-b-2 border-slate-900 pb-6">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-[#1A1745] flex items-center justify-center text-white text-xl font-black">E</div>
                <div class="flex flex-col">
                  <span class="text-lg font-black text-slate-900 uppercase">Apex Institute of Technology</span>
                  <span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Official Fee Receipt</span>
                </div>
              </div>
              <div class="text-right">
                <p class="text-[10px] font-bold text-slate-400 uppercase">Receipt No</p>
                <p class="text-sm font-black text-slate-900">{{ lp.receiptNo }}</p>
                <p class="text-[10px] font-bold text-slate-400 uppercase mt-2">Date</p>
                <p class="text-xs font-bold text-slate-800">{{ lp.date }}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-8 text-xs">
              <div class="space-y-1.5">
                <p><span class="font-bold text-slate-400 uppercase mr-2">Student:</span> <span class="font-black">{{ lp.studentName }}</span></p>
                <p><span class="font-bold text-slate-400 uppercase mr-2">Mode:</span> <span class="font-bold">{{ lp.mode }}</span></p>
              </div>
              <div class="space-y-1.5 text-right">
                <p><span class="font-bold text-slate-400 uppercase mr-2">Program:</span> <span class="font-bold">{{ lp.courseName }}</span></p>
                @if (lp.refNo) {
                  <p><span class="font-bold text-slate-400 uppercase mr-2">Ref No:</span> <span class="font-mono font-bold">{{ lp.refNo }}</span></p>
                }
              </div>
            </div>

            <div class="border-y border-slate-200">
              <table class="w-full text-xs">
                <thead>
                  <tr class="text-left">
                    <th class="py-3 font-bold text-slate-400 uppercase tracking-widest">Installment</th>
                    <th class="py-3 text-right font-bold text-slate-400 uppercase tracking-widest">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (item of lp.items; track item.installmentId) {
                    <tr>
                      <td class="py-3 font-bold text-slate-800">{{ item.installmentId }}</td>
                      <td class="py-3 text-right font-bold text-slate-900">{{ formatCurrency(item.amount) }}</td>
                    </tr>
                  }
                  @if (lp.fine > 0) {
                    <tr>
                      <td class="py-3 font-bold text-rose-500">Late Fine</td>
                      <td class="py-3 text-right font-bold text-rose-600">+ {{ formatCurrency(lp.fine) }}</td>
                    </tr>
                  }
                  @if (lp.concession > 0) {
                    <tr>
                      <td class="py-3 font-bold text-emerald-500">Concession / Scholarship</td>
                      <td class="py-3 text-right font-bold text-emerald-600">- {{ formatCurrency(lp.concession) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="flex justify-between items-center bg-slate-900 text-white p-4 rounded-xl">
              <div class="flex flex-col">
                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Total Received</span>
                <span class="text-[10px] font-medium italic opacity-80">{{ amountToWords(lp.total) }}</span>
              </div>
              <span class="text-xl font-black">{{ formatCurrency(lp.total) }}</span>
            </div>
          </div>
          <div class="p-6 bg-slate-50 border-t flex justify-end gap-3">
            <button type="button" (click)="showReceipt.set(false)" class="px-6 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">Close</button>
            <button type="button" (click)="downloadLastReceiptPdf()" class="px-8 py-2.5 bg-[#1A1745] text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 cursor-pointer">
              <mat-icon class="!text-sm !w-4 !h-4">picture_as_pdf</mat-icon>
              Download PDF Receipt
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class FeeCollectionPage implements OnInit {
  protected readonly financeService = inject(FinanceService);
  protected readonly studentsService = inject(StudentsService);
  protected readonly academicService = inject(AcademicService);
  private readonly route = inject(ActivatedRoute);

  protected readonly searchControl = new FormControl('');
  protected readonly searchQuery = signal('');
  protected readonly selectedStudentId = signal<string | null>(null);
  protected readonly selectedInstallmentIds = signal<Set<string>>(new Set());
  protected readonly customAmounts = signal<Record<string, number>>({});

  protected readonly showReceipt = signal(false);
  protected readonly lastPayment = signal<Payment | null>(null);
  protected readonly concessionSignal = signal(0);

  protected readonly paymentForm = new FormGroup({
    mode: new FormControl<PaymentMode>('UPI', { nonNullable: true }),
    refNo: new FormControl('', { nonNullable: true }),
    scholarshipCode: new FormControl('', { nonNullable: true }),
    concession: new FormControl(0, { nonNullable: true }),
    concessionReason: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    const preselectedId = this.route.snapshot.queryParamMap.get('studentId');
    if (preselectedId) {
      this.selectStudent(preselectedId);
    }
    this.paymentForm.controls.concession.valueChanges.subscribe(val => {
      this.concessionSignal.set(Math.max(0, Number(val) || 0));
    });
  }

  protected readonly activeScholarships = computed(() => {
    const courseId = this.selectedStudent()?.courseId;
    return this.financeService
      .scholarships()
      .filter(s => s.status === 'Active' && (s.courseId === 'All' || !courseId || s.courseId === courseId));
  });

  protected readonly filteredStudents = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.studentsService.students();
    if (!q) return list.slice(0, 15);
    return list
      .filter(s => s.name.toLowerCase().includes(q) || s.enrollmentNo.toLowerCase().includes(q))
      .slice(0, 15);
  });

  protected readonly selectedStudent = computed(() => {
    const id = this.selectedStudentId();
    return id ? this.studentsService.students().find(s => s.id === id) || null : null;
  });

  protected readonly studentCourseName = computed(() => this.selectedStudent()?.course || 'Program');
  protected readonly studentSemester = computed(() => this.selectedStudent()?.semester || 'Current Semester');

  protected readonly ledger = computed(() => {
    const id = this.selectedStudentId();
    return id ? this.financeService.getLedgerByStudent(id) : null;
  });

  protected readonly totalOutstanding = computed(() => {
    const l = this.ledger();
    return l ? l.installments.reduce((acc, inst) => acc + this.getBalance(inst), 0) : 0;
  });

  protected readonly totalPaid = computed(() => {
    const l = this.ledger();
    return l ? l.installments.reduce((acc, inst) => acc + inst.paidAmount + inst.concessionAmount, 0) : 0;
  });

  protected readonly selectedSubtotal = computed(() => {
    const l = this.ledger();
    if (!l) return 0;
    return Array.from(this.selectedInstallmentIds()).reduce((acc, id) => {
      const inst = l.installments.find(i => i.installmentId === id);
      return acc + (inst ? this.getCustomPayAmount(inst) : 0);
    }, 0);
  });

  protected readonly selectedFine = computed(() => {
    const l = this.ledger();
    if (!l) return 0;
    return Array.from(this.selectedInstallmentIds()).reduce((acc, id) => {
      const inst = l.installments.find(i => i.installmentId === id);
      return acc + (inst ? this.getFine(inst) : 0);
    }, 0);
  });

  protected readonly concessionAmount = computed(() => Math.min(this.concessionSignal(), this.selectedSubtotal()));

  protected readonly netPayable = computed(() =>
    Math.max(0, this.selectedSubtotal() + this.selectedFine() - this.concessionAmount())
  );

  selectStudent(id: string) {
    this.selectedStudentId.set(id);
    this.selectedInstallmentIds.set(new Set());
    this.customAmounts.set({});
    this.paymentForm.reset({
      mode: 'UPI',
      refNo: '',
      scholarshipCode: '',
      concession: 0,
      concessionReason: '',
    });
    this.concessionSignal.set(0);
  }

  getBalance(inst: StudentInstallmentLedger): number {
    return Math.max(0, inst.totalAmount - inst.paidAmount - inst.concessionAmount);
  }

  getCustomPayAmount(inst: StudentInstallmentLedger): number {
    const custom = this.customAmounts()[inst.installmentId];
    return typeof custom === 'number' ? custom : this.getBalance(inst);
  }

  setCustomPayAmount(installmentId: string, raw: string, maxBalance: number) {
    const num = Math.max(1, Math.min(maxBalance, Number(raw) || 0));
    this.customAmounts.update(map => ({ ...map, [installmentId]: num }));
  }

  toggleSelection(inst: StudentInstallmentLedger) {
    const set = new Set(this.selectedInstallmentIds());
    if (set.has(inst.installmentId)) {
      set.delete(inst.installmentId);
    } else {
      set.add(inst.installmentId);
      const balance = this.getBalance(inst);
      this.customAmounts.update(map => ({ ...map, [inst.installmentId]: map[inst.installmentId] ?? balance }));
    }
    this.selectedInstallmentIds.set(set);
  }

  isSelected(id: string) {
    return this.selectedInstallmentIds().has(id);
  }

  isOverdue(date: string) {
    return new Date(date) < new Date();
  }

  getFine(inst: StudentInstallmentLedger) {
    if (this.getBalance(inst) === 0) return 0;
    const structure = this.financeService.structures().find(s => s.id === this.ledger()?.structureId);
    if (!structure) return 0;
    return this.financeService.calculateFine(inst.dueDate, structure.lateFinePerDay);
  }

  applyScholarshipPreset() {
    const code = this.paymentForm.controls.scholarshipCode.value;
    const sch = this.financeService.scholarships().find(s => s.code === code);
    if (!sch) {
      this.paymentForm.patchValue({ concession: 0, concessionReason: '' });
      return;
    }
    const base = this.selectedSubtotal() || this.totalOutstanding();
    const amount = sch.type === 'Percentage' ? Math.round((base * sch.value) / 100) : sch.value;
    this.paymentForm.patchValue({
      concession: amount,
      concessionReason: `${sch.name} (${sch.code})`,
    });
  }

  collectPayment() {
    const l = this.ledger();
    if (!l || this.selectedInstallmentIds().size === 0) return;

    const totalConcession = this.concessionAmount();
    const selectedIds = Array.from(this.selectedInstallmentIds());

    const items = selectedIds.map((id, idx) => {
      const inst = l.installments.find(i => i.installmentId === id);
      const grossPay = inst ? this.getCustomPayAmount(inst) : 0;
      const itemConcession = idx === 0 ? Math.min(totalConcession, grossPay) : 0;
      const cashAmount = Math.max(0, grossPay - itemConcession);
      return {
        installmentId: id,
        amount: cashAmount,
        concession: itemConcession,
        fine: inst ? this.getFine(inst) : 0,
      };
    });

    const formVal = this.paymentForm.getRawValue();
    const payment = this.financeService.collectPayment({
      studentId: l.studentId,
      studentName: l.studentName,
      courseName: this.studentCourseName(),
      items,
      subtotal: this.selectedSubtotal(),
      fine: this.selectedFine(),
      concession: totalConcession,
      concessionReason: formVal.concessionReason || undefined,
      scholarshipCode: formVal.scholarshipCode || undefined,
      total: this.netPayable(),
      mode: formVal.mode,
      refNo: formVal.refNo || undefined,
      date: new Date().toISOString().split('T')[0],
      collectedBy: 'Administrator',
    });

    this.lastPayment.set(payment);
    this.showReceipt.set(true);
    this.studentsService.showToast('success', `Receipt ${payment.receiptNo} generated & synced.`);
    this.selectStudent(l.studentId);
  }

  downloadLastReceiptPdf() {
    const lp = this.lastPayment();
    if (!lp) return;
    const stu = this.studentsService.students().find(s => s.id === lp.studentId);
    exportReceiptToPdf({
      receiptNo: lp.receiptNo,
      date: lp.date,
      status: lp.status,
      studentName: lp.studentName,
      enrollmentNo: stu?.enrollmentNo || lp.studentId,
      courseName: lp.courseName,
      mode: lp.mode,
      refNo: lp.refNo,
      collectedBy: lp.collectedBy,
      items: lp.items.map(i => ({
        label: `Fee Installment (${i.installmentId})`,
        amount: formatCurrency(i.amount),
        fine: formatCurrency(i.fine),
      })),
      subtotal: formatCurrency(lp.subtotal),
      fine: formatCurrency(lp.fine),
      concession: formatCurrency(lp.concession),
      total: formatCurrency(lp.total),
      amountInWords: amountToWords(lp.total),
    });
  }

  getInitials(name: string) {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  formatCurrency(amt: number) {
    return formatCurrency(amt);
  }

  amountToWords(amt: number) {
    return amountToWords(amt);
  }
}
