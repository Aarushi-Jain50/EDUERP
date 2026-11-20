import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { FinanceService } from '../../../services/finance.service';
import { AcademicService } from '../../../services/academic.service';
import { StudentsService } from '../../../services/students.service';
import { FeeStructure, Scholarship } from '../../../models/finance.model';
import { formatCurrency } from '../../../utils/money.helper';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-fee-structure-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    PageHeader,
    StatStrip,
    DataToolbar,
    DataTable,
    FormDrawer,
    ConfirmDialog,
  ],
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans">
      <app-page-header
        title="Fee Structures & Scholarships"
        subtitle="Configure course-wise fee blueprints, installment schedules, and institutional concession schemes."
        [actionLabel]="activeTab() === 'structures' ? 'Add Structure' : 'Add Scholarship'"
        actionIcon="add"
        (actionClicked)="activeTab() === 'structures' ? openAdd() : openAddScholarship()"
      />

      <!-- Tabs & Quick Actions -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0]">
        <div class="flex gap-1">
          <button
            type="button"
            (click)="activeTab.set('structures')"
            [class]="activeTab() === 'structures' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold' : 'text-slate-500 hover:text-slate-700'"
            class="px-5 py-3 text-sm transition-colors cursor-pointer flex items-center gap-2"
          >
            <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">account_balance_wallet</mat-icon>
            Fee Structures ({{ financeService.structures().length }})
          </button>
          <button
            type="button"
            (click)="activeTab.set('scholarships')"
            [class]="activeTab() === 'scholarships' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold' : 'text-slate-500 hover:text-slate-700'"
            class="px-5 py-3 text-sm transition-colors cursor-pointer flex items-center gap-2"
          >
            <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">school</mat-icon>
            Scholarships & Waivers ({{ financeService.scholarships().length }})
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-2 pb-2">
          @if (activeTab() === 'structures') {
            <button
              type="button"
              (click)="cloneFromPrevious()"
              class="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
            >
              <mat-icon class="!text-sm !w-4 !h-4 text-indigo-600">content_copy</mat-icon>
              Rollover Latest
            </button>
          }
          <button
            type="button"
            (click)="exportExcel()"
            class="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
          >
            <mat-icon class="!text-sm !w-4 !h-4 text-emerald-600">table_view</mat-icon>
            Excel
          </button>
          <button
            type="button"
            (click)="exportPdf()"
            class="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
          >
            <mat-icon class="!text-sm !w-4 !h-4 text-rose-600">picture_as_pdf</mat-icon>
            PDF
          </button>
        </div>
      </div>

      <app-stat-strip [items]="stats()" />

      @if (activeTab() === 'structures') {
        <app-data-toolbar
          [searchValue]="searchQuery()"
          (searchChange)="searchQuery.set($event)"
          [filter1Value]="selectedCourse()"
          [filter1Options]="courseOptions()"
          (filter1Change)="selectedCourse.set($event)"
          searchPlaceholder="Search by course name or academic year..."
        />

        <app-data-table
          [columns]="columns"
          [data]="filteredStructures()"
          idKey="id"
          (viewClicked)="openView($event)"
          (editClicked)="openEdit($event)"
          (deleteClicked)="openDelete($event)"
        />
      } @else {
        <app-data-toolbar
          [searchValue]="searchQuery()"
          (searchChange)="searchQuery.set($event)"
          searchPlaceholder="Search scholarship scheme, code, or eligibility..."
        />

        <app-data-table
          [columns]="scholarshipColumns"
          [data]="filteredScholarships()"
          idKey="id"
          (editClicked)="openEditScholarship($event)"
          (deleteClicked)="openDeleteScholarship($event)"
        />
      }

      <!-- Fee Structure Form Drawer -->
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
              <mat-icon class="!text-base !w-4 !h-4 text-red-600 shrink-0">error_outline</mat-icon>
              <span>{{ formError() }}</span>
            </div>
          }

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

          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <h4 class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Installments & Fee Heads</h4>
              @if (!isViewOnly()) {
                <button type="button" (click)="addInstallment()" class="text-[#6D42E8] text-[11px] font-bold hover:underline cursor-pointer">+ Add Installment</button>
              }
            </div>

            <div formArrayName="installments" class="space-y-4">
              @for (inst of installments.controls; track i; let i = $index) {
                <div [formGroupName]="i" class="p-4 bg-slate-50 rounded-xl border border-slate-200 relative group">
                  @if (!isViewOnly() && installments.length > 1) {
                    <button type="button" (click)="removeInstallment(i)" class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer">
                      <mat-icon class="!text-sm !w-4 !h-4">close</mat-icon>
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
                        @if (!isViewOnly() && getHeads(inst).length > 1) {
                          <button type="button" (click)="removeHead(inst, j)" class="text-slate-400 hover:text-red-500 transition-colors cursor-pointer">
                            <mat-icon class="!text-sm !w-4 !h-4">remove_circle_outline</mat-icon>
                          </button>
                        }
                      </div>
                    }
                    @if (!isViewOnly()) {
                      <button type="button" (click)="addHead(inst)" class="text-[#6D42E8] text-[10px] font-bold cursor-pointer">+ Add Fee Head</button>
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

          <div class="p-4 bg-[#1A1745] rounded-xl text-white flex justify-between items-center">
            <span class="text-xs font-bold uppercase tracking-widest text-slate-300">Annual Course Fee</span>
            <span class="text-lg font-black">{{ formatCurrency(totalAnnualFee()) }}</span>
          </div>
        </form>
      </app-form-drawer>

      <!-- Scholarship Form Drawer -->
      <app-form-drawer
        [isOpen]="isScholarshipDrawerOpen()"
        [title]="editingScholarshipId() ? 'Edit Scholarship Scheme' : 'Create Scholarship Scheme'"
        subtitle="Define merit, need-based, or program-specific fee waiver rules."
        [saveLabel]="editingScholarshipId() ? 'Update Scheme' : 'Save Scheme'"
        (closed)="isScholarshipDrawerOpen.set(false)"
        (saved)="saveScholarship()"
      >
        <form [formGroup]="scholarshipForm" class="space-y-4 pt-2">
          <div class="space-y-1.5">
            <label for="sch-name" class="text-xs font-semibold text-slate-800">Scheme Name <span class="text-red-500">*</span></label>
            <input id="sch-name" formControlName="name" placeholder="e.g. Chancellor Merit Scholarship" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="sch-code" class="text-xs font-semibold text-slate-800">Waiver Code <span class="text-red-500">*</span></label>
              <input id="sch-code" formControlName="code" placeholder="MERIT-25" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs uppercase font-mono focus:outline-none focus:border-[#6D42E8]" />
            </div>
            <div class="space-y-1.5">
              <label for="sch-course" class="text-xs font-semibold text-slate-800">Applicable Program</label>
              <select id="sch-course" formControlName="courseId" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
                <option value="All">All Programs</option>
                @for (c of academicService.courses(); track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="sch-type" class="text-xs font-semibold text-slate-800">Waiver Type</label>
              <select id="sch-type" formControlName="type" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
                <option value="Percentage">Percentage (%)</option>
                <option value="Fixed">Fixed Amount (₹)</option>
              </select>
            </div>
            <div class="space-y-1.5">
              <label for="sch-val" class="text-xs font-semibold text-slate-800">Waiver Value <span class="text-red-500">*</span></label>
              <input id="sch-val" type="number" formControlName="value" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="sch-cap" class="text-xs font-semibold text-slate-800">Max Recipients</label>
              <input id="sch-cap" type="number" formControlName="maxRecipients" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
            </div>
            <div class="space-y-1.5">
              <label for="sch-status" class="text-xs font-semibold text-slate-800">Status</label>
              <select id="sch-status" formControlName="status" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="sch-elig" class="text-xs font-semibold text-slate-800">Eligibility Criteria <span class="text-red-500">*</span></label>
            <textarea id="sch-elig" formControlName="eligibility" rows="3" placeholder="Describe qualifying rules..." class="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8] resize-none"></textarea>
          </div>
        </form>
      </app-form-drawer>

      <app-confirm-dialog
        [isOpen]="isConfirmOpen()"
        [title]="deleteTargetType() === 'structure' ? 'Delete Fee Structure' : 'Delete Scholarship Scheme'"
        [message]="deleteTargetType() === 'structure' ? 'Removing this fee structure will immediately recalculate active course fee projections. Historical receipts remain preserved.' : 'Are you sure you want to remove this scholarship waiver scheme?'"
        confirmLabel="Remove"
        (cancelled)="isConfirmOpen.set(false)"
        (confirmed)="confirmDelete()"
      />
    </div>
  `,
})
export class FeeStructurePage {
  protected readonly financeService = inject(FinanceService);
  protected readonly academicService = inject(AcademicService);
  private readonly studentsService = inject(StudentsService);

  protected readonly activeTab = signal<'structures' | 'scholarships'>('structures');
  protected readonly searchQuery = signal('');
  protected readonly selectedCourse = signal('All');
  protected readonly isDrawerOpen = signal(false);
  protected readonly isViewOnly = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formError = signal('');

  protected readonly isScholarshipDrawerOpen = signal(false);
  protected readonly editingScholarshipId = signal<string | null>(null);

  protected readonly isConfirmOpen = signal(false);
  protected readonly deleteTargetId = signal<string | null>(null);
  protected readonly deleteTargetType = signal<'structure' | 'scholarship'>('structure');

  protected readonly form = new FormGroup({
    courseId: new FormControl('', Validators.required),
    academicYear: new FormControl('', Validators.required),
    lateFinePerDay: new FormControl(50, [Validators.required, Validators.min(0)]),
    status: new FormControl<'Active' | 'Inactive'>('Active', Validators.required),
    installments: new FormArray<FormGroup>([] as FormGroup[]),
  });

  protected readonly scholarshipForm = new FormGroup({
    name: new FormControl('', Validators.required),
    code: new FormControl('', Validators.required),
    type: new FormControl<'Percentage' | 'Fixed'>('Percentage', Validators.required),
    value: new FormControl(10, [Validators.required, Validators.min(1)]),
    courseId: new FormControl('All', Validators.required),
    eligibility: new FormControl('', Validators.required),
    maxRecipients: new FormControl(25, [Validators.required, Validators.min(1)]),
    status: new FormControl<'Active' | 'Inactive'>('Active', Validators.required),
  });

  protected readonly columns: TableColumn[] = [
    { key: 'courseName', header: 'Course / Program', isBold: true },
    { key: 'academicYear', header: 'Academic Year' },
    { key: 'totalFeeDisplay', header: 'Annual Fee', align: 'right' },
    { key: 'installmentCount', header: 'Installments', align: 'center' },
    { key: 'lateFineDisplay', header: 'Fine / Day', align: 'right' },
    { key: 'status', header: 'Status', isBadge: true },
  ];

  protected readonly scholarshipColumns: TableColumn[] = [
    { key: 'code', header: 'Code', isBold: true, isMono: true },
    { key: 'name', header: 'Scheme Name', isBold: true },
    { key: 'courseName', header: 'Program' },
    { key: 'benefitDisplay', header: 'Waiver Benefit', align: 'right' },
    { key: 'maxRecipients', header: 'Quota', align: 'center' },
    { key: 'status', header: 'Status', isBadge: true },
  ];

  protected readonly stats = computed<StatItem[]>(() => {
    const list = this.financeService.structures();
    const active = list.filter(s => s.status === 'Active').length;
    const avg = list.length > 0 ? list.reduce((acc, s) => acc + s.totalFee, 0) / list.length : 0;
    const activeScholarships = this.financeService.scholarships().filter(s => s.status === 'Active').length;

    return [
      { label: 'Fee Blueprints', value: list.length, icon: 'account_balance_wallet', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Active Structures', value: active, icon: 'check_circle', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' },
      { label: 'Avg Annual Fee', value: formatCurrency(avg), icon: 'payments', iconColorClass: 'text-amber-600', iconBgClass: 'bg-amber-50 border-amber-100' },
      { label: 'Active Scholarships', value: activeScholarships, icon: 'school', iconColorClass: 'text-purple-600', iconBgClass: 'bg-purple-50 border-purple-100' },
    ];
  });

  protected readonly filteredStructures = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const c = this.selectedCourse();

    return this.financeService
      .structures()
      .filter(s => {
        if (c !== 'All' && s.courseId !== c) return false;
        if (q && !s.courseName.toLowerCase().includes(q) && !s.academicYear.toLowerCase().includes(q)) return false;
        return true;
      })
      .map(s => ({
        ...s,
        totalFeeDisplay: formatCurrency(s.totalFee),
        lateFineDisplay: `₹${s.lateFinePerDay}`,
        installmentCount: s.installments.length,
      }));
  });

  protected readonly filteredScholarships = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.financeService
      .scholarships()
      .filter(
        s =>
          !q ||
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.eligibility.toLowerCase().includes(q)
      )
      .map(s => ({
        ...s,
        benefitDisplay: s.type === 'Percentage' ? `${s.value}% Tuition` : formatCurrency(s.value),
      }));
  });

  get installments() {
    return this.form.get('installments') as FormArray;
  }

  getHeads(installment: AbstractControl) {
    return installment.get('heads') as FormArray;
  }

  addInstallment(data?: { label: string; dueDate?: string; heads?: { name: string; amount: number }[] }) {
    const inst = new FormGroup({
      label: new FormControl(data?.label || '', Validators.required),
      dueDate: new FormControl(data?.dueDate || '', Validators.required),
      heads: new FormArray<FormGroup>([] as FormGroup[]),
    });

    if (data?.heads && data.heads.length > 0) {
      data.heads.forEach(h => this.addHead(inst, h));
    } else {
      this.addHead(inst);
    }

    this.installments.push(inst);
  }

  removeInstallment(index: number) {
    this.installments.removeAt(index);
  }

  addHead(inst: AbstractControl, data?: { name: string; amount: number }) {
    const heads = inst.get('heads') as FormArray;
    heads.push(
      new FormGroup({
        name: new FormControl(data?.name || '', Validators.required),
        amount: new FormControl(data?.amount || 0, [Validators.required, Validators.min(0)]),
      })
    );
  }

  removeHead(inst: AbstractControl, index: number) {
    (inst.get('heads') as FormArray).removeAt(index);
  }

  calculateInstallmentTotal(inst: AbstractControl): number {
    const heads = (inst.get('heads')?.value || []) as { amount: number }[];
    return heads.reduce((acc, h) => acc + (Number(h.amount) || 0), 0);
  }

  totalAnnualFee() {
    return this.installments.controls.reduce((acc, inst) => acc + this.calculateInstallmentTotal(inst), 0);
  }

  courseOptions = computed<FilterOption[]>(() => [
    { label: 'Course: All', value: 'All' },
    ...this.academicService.courses().map(c => ({ label: c.name, value: c.id })),
  ]);

  openAdd() {
    this.isViewOnly.set(false);
    this.editingId.set(null);
    this.formError.set('');
    this.form.enable();
    this.form.reset({ status: 'Active', lateFinePerDay: 50 });
    this.installments.clear();
    this.addInstallment({ label: '1st Installment' });
    this.isDrawerOpen.set(true);
  }

  openEdit(s: FeeStructure) {
    this.isViewOnly.set(false);
    this.editingId.set(s.id);
    this.formError.set('');
    this.form.enable();
    this.form.patchValue({
      courseId: s.courseId,
      academicYear: s.academicYear,
      lateFinePerDay: s.lateFinePerDay,
      status: s.status,
    });
    this.installments.clear();
    s.installments.forEach(inst => this.addInstallment(inst));
    this.isDrawerOpen.set(true);
  }

  openView(s: FeeStructure) {
    this.openEdit(s);
    this.isViewOnly.set(true);
    this.form.disable();
  }

  openDelete(s: FeeStructure) {
    this.deleteTargetType.set('structure');
    this.deleteTargetId.set(s.id);
    this.isConfirmOpen.set(true);
  }

  cloneFromPrevious() {
    const structures = this.financeService.structures();
    if (structures.length > 0) {
      const latest = structures[0];
      this.openEdit(latest);
      this.editingId.set(null);
      const nextYear = this.academicService.academicYears().find(y => y.year !== latest.academicYear)?.year || '2026-27';
      this.form.patchValue({ academicYear: nextYear });
      this.studentsService.showToast('info', 'Loaded latest structure blueprint for rollover.');
    }
  }

  closeDrawer() {
    this.isDrawerOpen.set(false);
  }

  handleSave() {
    if (this.isViewOnly()) {
      this.closeDrawer();
      return;
    }
    if (this.form.invalid) {
      this.formError.set('Please fill all required fields and installment schedules.');
      return;
    }

    const val = this.form.getRawValue();
    const course = this.academicService.courses().find(c => c.id === val.courseId);

    const duplicate = this.financeService
      .structures()
      .find(s => s.courseId === val.courseId && s.academicYear === val.academicYear && s.id !== this.editingId());
    if (duplicate) {
      this.formError.set('A fee structure already exists for this course and academic year.');
      return;
    }

    const structureData: Omit<FeeStructure, 'id'> = {
      courseId: val.courseId!,
      courseName: course?.name || 'Program',
      academicYear: val.academicYear!,
      lateFinePerDay: Number(val.lateFinePerDay) || 0,
      status: val.status!,
      totalFee: this.totalAnnualFee(),
      installments: (
        val.installments as { label: string; dueDate: string; heads: { name: string; amount: number }[] }[]
      ).map((inst, idx) => ({
        id: `inst-${Date.now()}-${idx}`,
        label: inst.label,
        dueDate: inst.dueDate,
        heads: inst.heads.map((h, hIdx) => ({ id: `h-${Date.now()}-${idx}-${hIdx}`, name: h.name, amount: Number(h.amount) })),
        totalAmount: inst.heads.reduce((acc, h) => acc + Number(h.amount), 0),
      })),
    };

    this.financeService.saveStructure(structureData, this.editingId() || undefined);
    this.studentsService.showToast('success', 'Fee structure saved to Firestore.');
    this.closeDrawer();
  }

  // Scholarships
  openAddScholarship() {
    this.editingScholarshipId.set(null);
    this.scholarshipForm.reset({
      type: 'Percentage',
      value: 15,
      courseId: 'All',
      maxRecipients: 25,
      status: 'Active',
    });
    this.isScholarshipDrawerOpen.set(true);
  }

  openEditScholarship(s: Scholarship) {
    this.editingScholarshipId.set(s.id);
    this.scholarshipForm.patchValue({
      name: s.name,
      code: s.code,
      type: s.type,
      value: s.value,
      courseId: s.courseId,
      eligibility: s.eligibility,
      maxRecipients: s.maxRecipients,
      status: s.status,
    });
    this.isScholarshipDrawerOpen.set(true);
  }

  openDeleteScholarship(s: Scholarship) {
    this.deleteTargetType.set('scholarship');
    this.deleteTargetId.set(s.id);
    this.isConfirmOpen.set(true);
  }

  saveScholarship() {
    if (this.scholarshipForm.invalid) return;
    const val = this.scholarshipForm.getRawValue();
    const courseName =
      val.courseId === 'All'
        ? 'All Programs'
        : this.academicService.courses().find(c => c.id === val.courseId)?.name || 'Program';

    this.financeService.saveScholarship(
      {
        name: val.name!.trim(),
        code: val.code!.trim().toUpperCase(),
        type: val.type!,
        value: Number(val.value),
        courseId: val.courseId!,
        courseName,
        eligibility: val.eligibility!.trim(),
        maxRecipients: Number(val.maxRecipients) || 25,
        status: val.status!,
      },
      this.editingScholarshipId() || undefined
    );

    this.studentsService.showToast('success', 'Scholarship scheme saved.');
    this.isScholarshipDrawerOpen.set(false);
  }

  confirmDelete() {
    const id = this.deleteTargetId();
    if (!id) return;
    if (this.deleteTargetType() === 'structure') {
      this.financeService.deleteStructure(id);
      this.studentsService.showToast('info', 'Fee structure deleted.');
    } else {
      this.financeService.deleteScholarship(id);
      this.studentsService.showToast('info', 'Scholarship scheme deleted.');
    }
    this.isConfirmOpen.set(false);
  }

  exportExcel() {
    if (this.activeTab() === 'structures') {
      exportToExcel(
        this.filteredStructures().map(s => ({
          Course: s.courseName,
          AcademicYear: s.academicYear,
          AnnualFee: s.totalFee,
          Installments: s.installmentCount,
          FinePerDay: s.lateFinePerDay,
          Status: s.status,
        })),
        'Fee_Structures'
      );
    } else {
      exportToExcel(
        this.filteredScholarships().map(s => ({
          Code: s.code,
          Scheme: s.name,
          Program: s.courseName,
          Waiver: s.benefitDisplay,
          Quota: s.maxRecipients,
          Eligibility: s.eligibility,
          Status: s.status,
        })),
        'Scholarships'
      );
    }
  }

  exportPdf() {
    if (this.activeTab() === 'structures') {
      exportToPdf(
        'Institutional Fee Structures',
        ['Course', 'Year', 'Annual Fee', 'Installments', 'Fine/Day', 'Status'],
        this.filteredStructures().map(s => [
          s.courseName,
          s.academicYear,
          s.totalFeeDisplay,
          s.installmentCount,
          s.lateFineDisplay,
          s.status,
        ]),
        'Fee_Structures'
      );
    } else {
      exportToPdf(
        'Scholarships & Concession Schemes',
        ['Code', 'Scheme', 'Program', 'Benefit', 'Quota', 'Status'],
        this.filteredScholarships().map(s => [
          s.code,
          s.name,
          s.courseName,
          s.benefitDisplay,
          s.maxRecipients,
          s.status,
        ]),
        'Scholarships'
      );
    }
  }

  formatCurrency(amt: number) {
    return formatCurrency(amt);
  }

  drawerTitle() {
    return this.isViewOnly() ? 'Structure Details' : this.editingId() ? 'Edit Fee Structure' : 'Create Fee Structure';
  }

  drawerSubtitle() {
    return 'Manage fee heads and installment schedules.';
  }
}
