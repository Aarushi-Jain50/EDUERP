import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip } from '../../../components/shared/stat-strip';
import { FinanceService } from '../../../services/finance.service';
import { StudentsService } from '../../../services/students.service';
import { AcademicService } from '../../../services/academic.service';
import { PaymentMode, Payment, StudentInstallmentLedger } from '../../../models/finance.model';
import { formatCurrency, amountToWords } from '../../../utils/money.helper';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-fee-collection-page',
  imports: [CommonModule, FormsModule, PageHeader, StatStrip],
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans">
      <app-page-header title="Fee Collection" subtitle="Search student ledgers, calculate dues with fines, and record institutional payments." />
      
      <div class="flex flex-col lg:flex-row gap-6 min-h-[600px]">
        
        <!-- Left: Student Search (350px) -->
        <div class="w-full lg:w-[350px] flex flex-col gap-4">
          <div class="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm space-y-4">
             <div class="relative">
               <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                 <span class="material-icons text-sm">search</span>
               </span>
               <input 
                 type="text" 
                 [(ngModel)]="searchQuery" 
                 placeholder="Name or Enrollment No..." 
                 class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
               />
             </div>
             
             <div class="flex flex-col divide-y divide-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
                @for (s of filteredStudents(); track s.id) {
                  <button 
                    (click)="selectStudent(s.id)"
                    [class.bg-purple-50]="selectedStudentId() === s.id"
                    class="p-3 text-left hover:bg-slate-50 transition-colors flex flex-col gap-1 cursor-pointer group"
                  >
                    <span class="text-[13px] font-bold text-slate-900 group-hover:text-[#6D42E8]">{{ s.name }}</span>
                    <div class="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                       <span>{{ s.enrollmentNo }}</span>
                       <span>{{ s.course }}</span>
                    </div>
                  </button>
                } @empty {
                  <div class="p-8 text-center text-slate-400">
                    <span class="material-icons text-3xl block mb-2 opacity-20">person_search</span>
                    <p class="text-xs italic">Start typing to search students...</p>
                  </div>
                }
             </div>
          </div>
        </div>

        <!-- Right: Payment Interface -->
        <div class="flex-1 flex flex-col gap-6">
           @if (ledger(); as l) {
             <!-- Student Summary Card -->
             <div class="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row gap-6 items-center">
                <div class="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#6D42E8] text-2xl font-black">
                   {{ getInitials(l.studentName) }}
                </div>
                <div class="flex-1 text-center sm:text-left">
                   <h3 class="text-lg font-black text-slate-900 leading-none">{{ l.studentName }}</h3>
                   <p class="text-xs text-slate-500 font-semibold mt-1">{{ l.enrollmentNo }} • {{ l.courseId }} • Semester 2</p>
                </div>
                <div class="flex gap-4">
                   <div class="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Due</span>
                      <span class="text-sm font-black text-rose-600">{{ formatCurrency(totalOutstanding()) }}</span>
                   </div>
                   <div class="px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                      <span class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">Paid So Far</span>
                      <span class="text-sm font-black text-emerald-700">{{ formatCurrency(totalPaid()) }}</span>
                   </div>
                </div>
             </div>

             <!-- Dues Table -->
             <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <div class="p-4 border-b border-[#E2E8F0] bg-slate-50/50">
                   <h4 class="text-xs font-bold text-slate-700">Outstanding Installments</h4>
                </div>
                <div class="overflow-x-auto">
                   <table class="w-full text-left border-collapse">
                      <thead>
                        <tr class="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                           <th class="px-6 py-3 border-b border-[#E2E8F0] w-12 text-center">Pay</th>
                           <th class="px-6 py-3 border-b border-[#E2E8F0]">Installment</th>
                           <th class="px-6 py-3 border-b border-[#E2E8F0]">Due Date</th>
                           <th class="px-6 py-3 border-b border-[#E2E8F0] text-right">Amount</th>
                           <th class="px-6 py-3 border-b border-[#E2E8F0] text-right">Late Fine</th>
                           <th class="px-6 py-3 border-b border-[#E2E8F0] text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                         @for (inst of l.installments; track inst.installmentId) {
                           <tr class="hover:bg-slate-50/30 transition-colors">
                              <td class="px-6 py-4 text-center">
                                 @if (inst.status !== 'Paid') {
                                   <input 
                                     type="checkbox" 
                                     [checked]="isSelected(inst.installmentId)" 
                                     (change)="toggleSelection(inst)"
                                     class="w-4 h-4 rounded border-slate-300 text-[#6D42E8] focus:ring-[#6D42E8] cursor-pointer"
                                   />
                                 } @else {
                                   <span class="material-icons text-emerald-500 text-sm">check_circle</span>
                                 }
                              </td>
                              <td class="px-6 py-4">
                                 <div class="flex flex-col">
                                    <span class="text-xs font-bold text-slate-800">{{ inst.label }}</span>
                                    <span class="text-[10px] text-slate-400">{{ inst.status }}</span>
                                 </div>
                              </td>
                              <td class="px-6 py-4 text-xs font-medium" [class.text-rose-600]="isOverdue(inst.dueDate)">
                                 {{ inst.dueDate }}
                              </td>
                              <td class="px-6 py-4 text-xs font-bold text-slate-700 text-right">{{ formatCurrency(inst.totalAmount) }}</td>
                              <td class="px-6 py-4 text-xs font-bold text-rose-500 text-right">{{ formatCurrency(getFine(inst)) }}</td>
                              <td class="px-6 py-4 text-xs font-black text-slate-900 text-right">{{ formatCurrency(inst.totalAmount - inst.paidAmount) }}</td>
                           </tr>
                         }
                      </tbody>
                   </table>
                </div>
             </div>

             <!-- Collection Form & Summary -->
             <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
                   <h4 class="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">Payment Details</h4>
                   
                   <div class="grid grid-cols-2 gap-4">
                      <div class="space-y-1.5">
                         <label for="pm-mode" class="text-[11px] font-bold text-slate-600">Payment Mode</label>
                         <select id="pm-mode" [(ngModel)]="paymentForm.mode" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI / GPay / PhonePe</option>
                            <option value="Cheque">Cheque / Demand Draft</option>
                            <option value="Card">Credit / Debit Card</option>
                            <option value="Bank Transfer">NEFT / RTGS / IMPS</option>
                         </select>
                      </div>
                      <div class="space-y-1.5">
                         <label for="pm-ref" class="text-[11px] font-bold text-slate-600">Reference No</label>
                         <input id="pm-ref" type="text" [(ngModel)]="paymentForm.refNo" [disabled]="paymentForm.mode === 'Cash'" placeholder="Transaction / Cheque ID" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8] disabled:opacity-50" />
                      </div>
                   </div>

                   <div class="grid grid-cols-2 gap-4">
                      <div class="space-y-1.5">
                         <label for="pm-concession" class="text-[11px] font-bold text-slate-600">Concession (₹)</label>
                         <input id="pm-concession" type="number" [(ngModel)]="paymentForm.concession" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
                      </div>
                      <div class="space-y-1.5">
                         <label for="pm-reason" class="text-[11px] font-bold text-slate-600">Concession Reason</label>
                         <input id="pm-reason" type="text" [(ngModel)]="paymentForm.concessionReason" [disabled]="!paymentForm.concession" placeholder="e.g. Scholarship" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8] disabled:opacity-50" />
                      </div>
                   </div>
                </div>

                <!-- Live Summary -->
                <div class="bg-[#1A1745] p-6 rounded-2xl text-white flex flex-col justify-between shadow-xl">
                   <div class="space-y-3">
                      <div class="flex justify-between items-center text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                         <span>Subtotal (Selected)</span>
                         <span>{{ formatCurrency(selectedSubtotal()) }}</span>
                      </div>
                      <div class="flex justify-between items-center text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                         <span>Total Late Fine</span>
                         <span class="text-rose-400">+ {{ formatCurrency(selectedFine()) }}</span>
                      </div>
                      <div class="flex justify-between items-center text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                         <span>Concession</span>
                         <span class="text-emerald-400">- {{ formatCurrency(paymentForm.concession) }}</span>
                      </div>
                      <div class="h-px bg-white/10 my-2"></div>
                      <div class="flex justify-between items-end">
                         <div class="flex flex-col">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Net Payable</span>
                            <span class="text-2xl font-black">{{ formatCurrency(netPayable()) }}</span>
                         </div>
                         <div class="text-[9px] font-medium text-slate-400 italic text-right max-w-[150px]">
                            {{ amountToWords(netPayable()) }}
                         </div>
                      </div>
                   </div>

                   <button 
                     (click)="collectPayment()"
                     [disabled]="netPayable() <= 0"
                     class="w-full mt-6 py-3.5 bg-gradient-to-r from-[#6D42E8] to-[#D946EF] hover:from-[#5b35c9] hover:to-[#c236d8] text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                   >
                     <span class="material-icons text-base">payments</span>
                     Collect Payment & Issue Receipt
                   </button>
                </div>
             </div>

           } @else {
             <div class="flex-1 bg-white rounded-2xl border border-dashed border-slate-300 p-20 flex flex-col items-center justify-center text-center">
                <div class="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4 border border-slate-100">
                  <span class="material-icons text-4xl">payments</span>
                </div>
                <h3 class="text-lg font-bold text-slate-800">No Student Selected</h3>
                <p class="text-slate-500 text-sm max-w-xs mt-1">Select a student from the sidebar to view their fee ledger and record transactions.</p>
             </div>
           }
        </div>
      </div>
    </div>

    <!-- Receipt Preview Modal (Simulated) -->
    @if (showReceipt()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
         <div class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div class="p-4 bg-slate-50 border-b flex justify-between items-center">
               <span class="text-xs font-black text-slate-800 uppercase tracking-widest">Fee Receipt Generated</span>
               <button (click)="showReceipt.set(false)" class="text-slate-400 hover:text-slate-600"><span class="material-icons text-lg">close</span></button>
            </div>
            <div class="p-8 space-y-6" id="printable-receipt">
               <!-- Receipt Header -->
               <div class="flex justify-between items-start border-b-2 border-slate-900 pb-6">
                  <div class="flex items-center gap-3">
                     <div class="w-10 h-10 rounded-xl bg-[#1A1745] flex items-center justify-center text-white text-xl font-black">E</div>
                     <div class="flex flex-col">
                        <span class="text-lg font-black text-slate-900 uppercase">EduERP Institution</span>
                        <span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Institutional Fee Receipt</span>
                     </div>
                  </div>
                  <div class="text-right">
                     <p class="text-[10px] font-bold text-slate-400 uppercase">Receipt No</p>
                     <p class="text-sm font-black text-slate-900">{{ lastPayment()?.receiptNo }}</p>
                     <p class="text-[10px] font-bold text-slate-400 uppercase mt-2">Date</p>
                     <p class="text-xs font-bold text-slate-800">{{ lastPayment()?.date }}</p>
                  </div>
               </div>

               <!-- Student Info -->
               <div class="grid grid-cols-2 gap-8 text-xs">
                  <div class="space-y-2">
                     <p><span class="font-bold text-slate-400 uppercase tracking-tighter mr-2">Student:</span> <span class="font-black">{{ lastPayment()?.studentName }}</span></p>
                     <p><span class="font-bold text-slate-400 uppercase tracking-tighter mr-2">Roll No:</span> <span class="font-bold">{{ ledger()?.enrollmentNo }}</span></p>
                  </div>
                  <div class="space-y-2 text-right">
                     <p><span class="font-bold text-slate-400 uppercase tracking-tighter mr-2">Course:</span> <span class="font-bold">{{ lastPayment()?.courseName }}</span></p>
                     <p><span class="font-bold text-slate-400 uppercase tracking-tighter mr-2">Semester:</span> <span class="font-bold">Semester 2</span></p>
                  </div>
               </div>

               <!-- Items Table -->
               <div class="border-y border-slate-200">
                  <table class="w-full text-xs">
                     <thead>
                        <tr class="text-left">
                           <th class="py-3 font-bold text-slate-400 uppercase tracking-widest">Description</th>
                           <th class="py-3 text-right font-bold text-slate-400 uppercase tracking-widest">Amount (₹)</th>
                        </tr>
                     </thead>
                     <tbody class="divide-y divide-slate-100">
                        @for (item of lastPayment()?.items; track item.installmentId) {
                           <tr>
                              <td class="py-3 font-bold text-slate-800">Fee Installment (ID: {{ item.installmentId }})</td>
                              <td class="py-3 text-right font-bold text-slate-900">{{ formatCurrency(item.amount) }}</td>
                           </tr>
                        }
                        @if (lastPayment()?.fine; as f) {
                           <tr>
                              <td class="py-3 font-bold text-rose-500">Late Payment Fine</td>
                              <td class="py-3 text-right font-bold text-rose-600">+ {{ formatCurrency(f) }}</td>
                           </tr>
                        }
                        @if (lastPayment()?.concession; as c) {
                           <tr>
                              <td class="py-3 font-bold text-emerald-500">Concession / Discount</td>
                              <td class="py-3 text-right font-bold text-emerald-600">- {{ formatCurrency(c) }}</td>
                           </tr>
                        }
                     </tbody>
                  </table>
               </div>

               <!-- Total -->
               <div class="flex justify-between items-center bg-slate-900 text-white p-4 rounded-xl">
                  <div class="flex flex-col">
                     <span class="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Total Received</span>
                     <span class="text-[10px] font-medium italic opacity-80">{{ amountToWords(lastPayment()?.total || 0) }}</span>
                  </div>
                  <span class="text-xl font-black">{{ formatCurrency(lastPayment()?.total || 0) }}</span>
               </div>

               <!-- Footer -->
               <div class="flex justify-between items-end pt-10">
                  <div class="text-[10px] text-slate-400 font-medium">
                     <p>Mode: {{ lastPayment()?.mode }}</p>
                     @if (lastPayment()?.refNo) { <p>Ref No: {{ lastPayment()?.refNo }}</p> }
                     <p class="mt-2 italic">This is a computer generated receipt and does not require a physical signature.</p>
                  </div>
                  <div class="flex flex-col items-center">
                     <div class="w-32 h-px bg-slate-300 mb-2"></div>
                     <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Authorized Signatory</span>
                  </div>
               </div>
            </div>
            <div class="p-6 bg-slate-50 border-t flex justify-end gap-3">
               <button (click)="showReceipt.set(false)" class="px-6 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">Close</button>
               <button (click)="printReceipt()" class="px-8 py-2.5 bg-[#1A1745] text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 cursor-pointer">
                  <span class="material-icons text-sm">print</span>
                  Print Receipt
               </button>
            </div>
         </div>
      </div>
    }
  `
})
export class FeeCollectionPage {
  protected readonly financeService = inject(FinanceService);
  protected readonly studentsService = inject(StudentsService);
  protected readonly academicService = inject(AcademicService);

  protected searchQuery = '';
  protected readonly selectedStudentId = signal<string | null>(null);
  protected readonly selectedInstallmentIds = signal<Set<string>>(new Set());
  
  protected readonly showReceipt = signal(false);
  protected readonly lastPayment = signal<Payment | null>(null);

  protected paymentForm = {
    mode: 'Cash' as PaymentMode,
    refNo: '',
    concession: 0,
    concessionReason: ''
  };

  protected readonly filteredStudents = computed(() => {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return [];
    return this.studentsService.students().filter(s => 
      s.name.toLowerCase().includes(q) || s.enrollmentNo.toLowerCase().includes(q)
    ).slice(0, 10);
  });

  protected readonly ledger = computed(() => {
    const id = this.selectedStudentId();
    return id ? this.financeService.getLedgerByStudent(id) : null;
  });

  protected readonly totalOutstanding = computed(() => {
    const l = this.ledger();
    return l ? l.installments.reduce((acc, inst) => acc + (inst.totalAmount - inst.paidAmount), 0) : 0;
  });

  protected readonly totalPaid = computed(() => {
    const l = this.ledger();
    return l ? l.installments.reduce((acc, inst) => acc + inst.paidAmount, 0) : 0;
  });

  protected readonly selectedSubtotal = computed(() => {
    const l = this.ledger();
    if (!l) return 0;
    return Array.from(this.selectedInstallmentIds()).reduce((acc, id) => {
      const inst = l.installments.find(i => i.installmentId === id);
      return acc + (inst ? (inst.totalAmount - inst.paidAmount) : 0);
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

  protected readonly netPayable = computed(() => {
    const val = this.selectedSubtotal() + this.selectedFine() - (this.paymentForm.concession || 0);
    return Math.max(0, val);
  });

  selectStudent(id: string) {
    this.selectedStudentId.set(id);
    this.selectedInstallmentIds.set(new Set());
    this.paymentForm = { mode: 'Cash', refNo: '', concession: 0, concessionReason: '' };
  }

  toggleSelection(inst: StudentInstallmentLedger) {
    const set = new Set(this.selectedInstallmentIds());
    if (set.has(inst.installmentId)) set.delete(inst.installmentId);
    else set.add(inst.installmentId);
    this.selectedInstallmentIds.set(set);
  }

  isSelected(id: string) { return this.selectedInstallmentIds().has(id); }

  isOverdue(date: string) { return new Date(date) < new Date(); }

  getFine(inst: StudentInstallmentLedger) {
    const structure = this.financeService.structures().find(s => s.id === this.ledger()?.structureId);
    if (!structure) return 0;
    return this.financeService.calculateFine(inst.dueDate, structure.lateFinePerDay);
  }

  collectPayment() {
    const l = this.ledger();
    if (!l) return;

    const items = Array.from(this.selectedInstallmentIds()).map(id => {
      const inst = l.installments.find(i => i.installmentId === id);
      return {
        installmentId: id,
        amount: inst ? (inst.totalAmount - inst.paidAmount) : 0,
        fine: inst ? this.getFine(inst) : 0
      };
    });

    const paymentData = {
      studentId: l.studentId,
      studentName: l.studentName,
      courseName: l.courseId,
      items,
      subtotal: this.selectedSubtotal(),
      fine: this.selectedFine(),
      concession: this.paymentForm.concession,
      concessionReason: this.paymentForm.concessionReason,
      total: this.netPayable(),
      mode: this.paymentForm.mode,
      refNo: this.paymentForm.refNo,
      date: new Date().toISOString().split('T')[0],
      collectedBy: 'Administrator'
    };

    const payment = this.financeService.collectPayment(paymentData);
    this.lastPayment.set(payment);
    this.showReceipt.set(true);
    
    // Refresh ledger view
    this.selectStudent(l.studentId);
  }

  printReceipt() {
    const printContent = document.getElementById('printable-receipt');
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

  getInitials(name: string) { return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2); }
  formatCurrency(amt: number) { return formatCurrency(amt); }
  amountToWords(amt: number) { return amountToWords(amt); }
}
