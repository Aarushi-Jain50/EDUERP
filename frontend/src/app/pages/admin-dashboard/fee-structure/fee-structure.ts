import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators, FormArray } from '@angular/forms';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { FinanceService } from '../../../services/finance.service';
import { AcademicService } from '../../../services/academic.service';
import { FeeStructure } from '../../../models/finance.model';
import { AbstractControl } from '@angular/forms';
import { formatCurrency } from '../../../utils/money.helper';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-fee-structure-page',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PageHeader, StatStrip, DataToolbar, DataTable, FormDrawer, ConfirmDialog],
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans">
      <app-page-header 
        title="Fee Structures" 
        subtitle="Define and manage course-wise fee blueprints and payment installments." 
        primaryActionLabel="Add Structure" 
        secondaryActionLabel="Clone Previous"
        secondaryActionIcon="content_copy"
        (primaryActionClicked)="openAdd()" 
        (secondaryActionClicked)="cloneFromPrevious()"
      />
      
      <app-stat-strip [items]="stats()" />

      <app-data-toolbar 
        [searchValue]="searchQuery()"
        (searchChange)="searchQuery.set($event)"
        [filter1Value]="selectedCourse()"
        [filter1Options]="courseOptions()"
        (filter1Change)="selectedCourse.set($event)"
        searchPlaceholder="Search by course name..."
      />

      <app-data-table 
        [columns]="columns" 
        [data]="filteredStructures()" 
        idKey="id" 
        (viewClicked)="openView($event)"
        (editClicked)="openEdit($event)"
        (deleteClicked)="openDelete($event)" 
      />

      <!-- Form Drawer -->
      <app-form-drawer 
        [isOpen]="isDrawerOpen()" 
        [title]="drawerTitle()" 
        [subtitle]="drawerSubtitle()"
        [saveLabel]="isViewOnly() ? 'Close' : (editingId() ? 'Update Structure' : 'Create Structure')"
        (closed)="closeDrawer()" 
        (saved)="handleSave()"
      >
        <form [formGroup]="form" class="space-y-6 pt-2">
          @if (formError()) {
            <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <span class="material-icons text-base text-red-600 shrink-0">error_outline</span>
              <span>{{ formError() }}</span>
            </div>
          }

          <!-- Basic Info -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="fs-course" class="text-xs font-semibold text-slate-800">Course / Program <span class="text-red-500">*</span></label>
              <select id="fs-course" formControlName="courseId" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
                <option value="">Select Course</option>
                @for (c of academicService.courses(); track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
            </div>
            <div class="space-y-1.5">
              <label for="fs-year" class="text-xs font-semibold text-slate-800">Academic Year <span class="text-red-500">*</span></label>
              <select id="fs-year" formControlName="academicYear" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
                <option value="">Select Year</option>
                @for (y of academicService.academicYears(); track y.id) {
                  <option [value]="y.year">{{ y.year }}</option>
                }
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="fs-fine" class="text-xs font-semibold text-slate-800">Late Fine (₹ / Day)</label>
              <input id="fs-fine" type="number" formControlName="lateFinePerDay" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
            </div>
            <div class="space-y-1.5">
              <label for="fs-status" class="text-xs font-semibold text-slate-800">Status</label>
              <select id="fs-status" formControlName="status" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <!-- Installments Section -->
          <div class="space-y-3">
             <div class="flex justify-between items-center">
                <h4 class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Installments & Fees</h4>
                @if (!isViewOnly()) {
                  <button type="button" (click)="addInstallment()" class="text-[#6D42E8] text-[11px] font-bold hover:underline">+ Add Installment</button>
                }
             </div>
             
             <div formArrayName="installments" class="space-y-4">
                @for (inst of installments.controls; track i; let i = $index) {
                  <div [formGroupName]="i" class="p-4 bg-slate-50 rounded-xl border border-slate-200 relative group">
                    @if (!isViewOnly()) {
                      <button type="button" (click)="removeInstallment(i)" class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors">
                        <span class="material-icons text-sm">close</span>
                      </button>
                    }
                    
                    <div class="grid grid-cols-2 gap-3 mb-3">
                      <div class="space-y-1">
                        <label [for]="'inst-label-' + i" class="text-[10px] font-bold text-slate-400 uppercase">Installment Label</label>
                        <input [id]="'inst-label-' + i" formControlName="label" placeholder="e.g. 1st Installment" class="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]" />
                      </div>
                      <div class="space-y-1">
                        <label [for]="'inst-due-' + i" class="text-[10px] font-bold text-slate-400 uppercase">Due Date</label>
                        <input [id]="'inst-due-' + i" type="date" formControlName="dueDate" class="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]" />
                      </div>
                    </div>

                    <div formArrayName="heads" class="space-y-2">
                       @for (head of getHeads(inst).controls; track j; let j = $index) {
                         <div [formGroupName]="j" class="flex gap-2 items-center">
                           <label [for]="'head-name-' + i + '-' + j" class="sr-only">Head Name</label>
                           <input [id]="'head-name-' + i + '-' + j" formControlName="name" placeholder="Fee Head (e.g. Tuition)" class="flex-1 h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]" />
                           <label [for]="'head-amt-' + i + '-' + j" class="sr-only">Amount</label>
                           <input [id]="'head-amt-' + i + '-' + j" type="number" formControlName="amount" placeholder="Amount" class="w-24 h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]" />
                           @if (!isViewOnly()) {
                             <button type="button" (click)="removeHead(inst, j)" class="text-slate-300 hover:text-red-400 transition-colors">
                               <span class="material-icons text-sm">remove_circle_outline</span>
                             </button>
                           }
                         </div>
                       }
                       @if (!isViewOnly()) {
                         <button type="button" (click)="addHead(inst)" class="text-[#6D42E8] text-[10px] font-bold">+ Add Fee Head</button>
                       }
                    </div>

                    <div class="mt-3 pt-2 border-t border-slate-200 flex justify-between items-center">
                       <span class="text-[10px] font-bold text-slate-400 uppercase">Total for this installment</span>
                       <span class="text-xs font-black text-slate-700">{{ formatCurrency(calculateInstallmentTotal(inst)) }}</span>
                    </div>
                  </div>
                }
             </div>
          </div>

          <!-- Final Total -->
          <div class="p-4 bg-[#1A1745] rounded-xl text-white flex justify-between items-center">
            <span class="text-xs font-bold uppercase tracking-widest text-slate-400">Annual Course Fee</span>
            <span class="text-lg font-black">{{ formatCurrency(totalAnnualFee()) }}</span>
          </div>
        </form>
      </app-form-drawer>

      <app-confirm-dialog 
        [isOpen]="isConfirmOpen()" 
        title="Delete Fee Structure" 
        message="Are you sure you want to remove this fee structure? This might affect existing ledgers."
        confirmLabel="Remove Structure"
        (closed)="isConfirmOpen.set(false)" 
        (confirmed)="deleteStructure()" 
      />
    </div>
  `
})
export class FeeStructurePage {
  protected readonly financeService = inject(FinanceService);
  protected readonly academicService = inject(AcademicService);

  protected readonly searchQuery = signal('');
  protected readonly selectedCourse = signal('All');
  protected readonly isDrawerOpen = signal(false);
  protected readonly isViewOnly = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formError = signal('');
  protected readonly isConfirmOpen = signal(false);
  protected readonly itemToDelete = signal<string | null>(null);

  protected readonly form = new FormGroup({
    courseId: new FormControl('', Validators.required),
    academicYear: new FormControl('', Validators.required),
    lateFinePerDay: new FormControl(0, [Validators.required, Validators.min(0)]),
    status: new FormControl<'Active' | 'Inactive'>('Active', Validators.required),
    installments: new FormArray<FormGroup>([] as FormGroup[])
  });

  protected readonly columns: TableColumn[] = [
    { key: 'courseName', header: 'Course', isBold: true },
    { key: 'academicYear', header: 'Year' },
    { key: 'totalFeeDisplay', header: 'Total Fee (₹)', align: 'right' },
    { key: 'installmentCount', header: 'Inst.', align: 'center' },
    { key: 'lateFineDisplay', header: 'Fine/Day', align: 'right' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  protected readonly stats = computed<StatItem[]>(() => {
    const list = this.financeService.structures();
    const active = list.filter(s => s.status === 'Active').length;
    const avg = list.length > 0 ? list.reduce((acc, s) => acc + s.totalFee, 0) / list.length : 0;
    
    return [
      { label: 'Structures', value: list.length, icon: 'account_balance_wallet', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Active', value: active, icon: 'check_circle', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' },
      { label: 'Avg Annual Fee', value: formatCurrency(avg), icon: 'payments', iconColorClass: 'text-amber-600', iconBgClass: 'bg-amber-50 border-amber-100' }
    ];
  });

  protected readonly filteredStructures = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const c = this.selectedCourse();
    
    return this.financeService.structures().filter(s => {
      if (c !== 'All' && s.courseId !== c) return false;
      if (q && !s.courseName.toLowerCase().includes(q)) return false;
      return true;
    }).map(s => ({
      ...s,
      totalFeeDisplay: formatCurrency(s.totalFee),
      lateFineDisplay: `₹${s.lateFinePerDay}`,
      installmentCount: s.installments.length
    }));
  });

  get installments() { return this.form.get('installments') as FormArray; }

  getHeads(installment: AbstractControl) { return installment.get('heads') as FormArray; }

   addInstallment(data?: { label: string; dueDate?: string; heads?: { name: string; amount: number }[] }) {
    const inst = new FormGroup({
      label: new FormControl(data?.label || '', Validators.required),
      dueDate: new FormControl(data?.dueDate || '', Validators.required),
      heads: new FormArray<FormGroup>([] as FormGroup[])
    });
    
    if (data?.heads) {
      data.heads.forEach((h: { name: string; amount: number }) => this.addHead(inst, h));
    } else {
      this.addHead(inst);
    }
    
    this.installments.push(inst);
  }

  removeInstallment(index: number) { this.installments.removeAt(index); }

  addHead(inst: AbstractControl, data?: { name: string; amount: number }) {
    const heads = inst.get('heads') as FormArray;
    heads.push(new FormGroup({
      name: new FormControl(data?.name || '', Validators.required),
      amount: new FormControl(data?.amount || 0, [Validators.required, Validators.min(0)])
    }));
  }

  removeHead(inst: AbstractControl, index: number) { (inst.get('heads') as FormArray).removeAt(index); }

  calculateInstallmentTotal(inst: AbstractControl): number {
    const heads = (inst.get('heads')?.value || []) as { amount: number }[];
    return heads.reduce((acc: number, h: { amount: number }) => acc + (Number(h.amount) || 0), 0);
  }

  totalAnnualFee() {
    return this.installments.controls.reduce((acc, inst) => acc + this.calculateInstallmentTotal(inst), 0);
  }

  courseOptions = computed<FilterOption[]>(() => [
    { label: 'Course: All', value: 'All' },
    ...this.academicService.courses().map(c => ({ label: c.name, value: c.id }))
  ]);

  openAdd() {
    this.isViewOnly.set(false);
    this.editingId.set(null);
    this.formError.set('');
    this.form.reset({ status: 'Active', lateFinePerDay: 50 });
    this.installments.clear();
    this.addInstallment({ label: '1st Installment' });
    this.isDrawerOpen.set(true);
  }

  openEdit(s: FeeStructure) {
    this.isViewOnly.set(false);
    this.editingId.set(s.id);
    this.formError.set('');
    this.form.patchValue({
      courseId: s.courseId,
      academicYear: s.academicYear,
      lateFinePerDay: s.lateFinePerDay,
      status: s.status
    });
    this.installments.clear();
    s.installments.forEach(inst => this.addInstallment(inst));
    this.isDrawerOpen.set(true);
  }

  openView(s: FeeStructure) {
    this.openEdit(s);
    this.isViewOnly.set(true);
  }

  openDelete(s: FeeStructure) {
    this.itemToDelete.set(s.id);
    this.isConfirmOpen.set(true);
  }

  deleteStructure() {
    // Service logic to delete
    this.isConfirmOpen.set(false);
  }

  cloneFromPrevious() {
    const structures = this.financeService.structures();
    if (structures.length > 0) {
      const latest = structures[0];
      this.openEdit(latest);
      this.editingId.set(null); // Clear ID so it saves as new
      this.form.patchValue({ academicYear: '2026-27' }); // Suggest next year
    }
  }

  closeDrawer() { this.isDrawerOpen.set(false); }

  handleSave() {
    if (this.isViewOnly()) { this.closeDrawer(); return; }
    if (this.form.invalid) { this.formError.set('Please fill all required fields.'); return; }
    
    const val = this.form.getRawValue();
    const course = this.academicService.courses().find(c => c.id === val.courseId);
    
    // Check uniqueness
    const duplicate = this.financeService.structures().find(s => 
      s.courseId === val.courseId && s.academicYear === val.academicYear && s.id !== this.editingId()
    );
    if (duplicate) { this.formError.set('A fee structure already exists for this course and academic year.'); return; }

    const structureData: Omit<FeeStructure, 'id'> = {
      courseId: val.courseId!,
      courseName: course?.name || '',
      academicYear: val.academicYear!,
      lateFinePerDay: val.lateFinePerDay!,
      status: val.status!,
      totalFee: this.totalAnnualFee(),
      installments: (val.installments as { label: string; dueDate: string; heads: { name: string; amount: number }[] }[]).map(inst => ({
        id: `inst-${Date.now()}-${Math.random()}`,
        label: inst.label,
        dueDate: inst.dueDate,
        heads: inst.heads.map(h => ({ id: `h-${Date.now()}-${Math.random()}`, ...h })),
        totalAmount: inst.heads.reduce((acc: number, h) => acc + Number(h.amount), 0)
      }))
    };

    this.financeService.saveStructure(structureData, this.editingId() || undefined);
    this.closeDrawer();
  }

  formatCurrency(amt: number) { return formatCurrency(amt); }

  drawerTitle() { return this.isViewOnly() ? 'Structure Details' : (this.editingId() ? 'Edit Structure' : 'Create Structure'); }
  drawerSubtitle() { return 'Manage fee heads and installment schedules.'; }
}
