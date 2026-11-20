import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AcademicService, SubjectRecord } from '../../../services/academic.service';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

export interface SubjectRow extends SubjectRecord {
  creditsDisplay: string;
  hoursDisplay: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-subjects-page',
  imports: [
    ReactiveFormsModule,
    PageHeader,
    StatStrip,
    DataToolbar,
    DataTable,
    FormDrawer,
    ConfirmDialog
  ],
  template: `
    <div class="flex flex-col gap-5 max-w-[1400px] mx-auto w-full font-sans">

      @if (bannerMessage(); as banner) {
        <div
          class="p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-3"
          [class]="banner.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'"
        >
          <div class="flex items-center gap-2">
            <span class="material-icons text-base">{{ banner.type === 'error' ? 'error_outline' : 'check_circle' }}</span>
            <span>{{ banner.text }}</span>
          </div>
          <button type="button" (click)="bannerMessage.set(null)" class="text-slate-500 hover:text-slate-800 cursor-pointer">
            <span class="material-icons text-sm">close</span>
          </button>
        </div>
      }

      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <app-page-header
          class="flex-1"
          title="Subjects"
          subtitle="Manage course syllabi, curriculum codes, credit units, weekly lecture/lab hours, and prerequisites."
          actionLabel="Add Subject"
          actionIcon="library_books"
          (actionClicked)="openAddDrawer()"
        />
        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            (click)="exportExcel()"
            class="h-10 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-[#E2E8F0] rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <span class="material-icons text-sm text-emerald-600">table_view</span>
            <span>Excel</span>
          </button>
          <button
            type="button"
            (click)="exportPdf()"
            class="h-10 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-[#E2E8F0] rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <span class="material-icons text-sm text-rose-600">picture_as_pdf</span>
            <span>PDF</span>
          </button>
        </div>
      </div>

      <app-stat-strip [items]="statItems()" />

      <app-data-toolbar
        [searchValue]="searchQuery()"
        searchPlaceholder="Search by subject name, code, or prerequisite..."
        [filter1Value]="selectedCourse()"
        [filter1Options]="courseFilterOptions()"
        [filter2Value]="selectedType()"
        [filter2Options]="typeFilterOptions"
        [hasActiveFilters]="hasActiveFilters()"
        (searchChange)="onSearchChange($event)"
        (filter1Change)="onCourseFilterChange($event)"
        (filter2Change)="onTypeFilterChange($event)"
        (resetClicked)="resetFilters()"
      />

      <app-data-table
        [columns]="tableColumns"
        [data]="filteredSubjects()"
        idKey="id"
        emptyIcon="library_books"
        emptyTitle="No subjects found"
        emptyMessage="Try adjusting course or classification filters."
        emptyActionLabel="Clear filters"
        (emptyActionClicked)="resetFilters()"
        (viewClicked)="onViewRecord($event)"
        (editClicked)="onEditRecord($event)"
        (deleteClicked)="onDeleteRecord($event)"
      />

      <app-form-drawer
        [isOpen]="isDrawerOpen()"
        [title]="drawerTitle()"
        [subtitle]="drawerSubtitle()"
        [saveLabel]="isViewOnly() ? 'Close' : (editingId() ? 'Update Subject' : 'Save Subject')"
        (closed)="closeDrawer()"
        (saved)="handleDrawerSave()"
      >
        <form [formGroup]="subjectForm" class="space-y-4">
          @if (formError()) {
            <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <span class="material-icons text-base text-red-600 shrink-0">error_outline</span>
              <span>{{ formError() }}</span>
            </div>
          }

          <div class="space-y-1.5">
            <label for="sub-code-input" class="block text-xs font-semibold text-slate-800">
              Subject Code <span class="text-red-500">*</span>
            </label>
            <input
              id="sub-code-input"
              type="text"
              formControlName="code"
              placeholder="e.g. MCA-201"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 uppercase focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div class="space-y-1.5">
            <label for="sub-name-input" class="block text-xs font-semibold text-slate-800">
              Subject Name <span class="text-red-500">*</span>
            </label>
            <input
              id="sub-name-input"
              type="text"
              formControlName="name"
              placeholder="e.g. Advanced Data Structures"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div class="space-y-1.5">
            <label for="sub-course-select" class="block text-xs font-semibold text-slate-800">
              Course / Program <span class="text-red-500">*</span>
            </label>
            <select
              id="sub-course-select"
              formControlName="course"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
              @for (c of courseList(); track c.id) {
                <option [value]="c.name">{{ c.name }}</option>
              }
            </select>
          </div>

          <div class="space-y-1.5">
            <label for="sub-semester-input" class="block text-xs font-semibold text-slate-800">Semester</label>
            <input
              id="sub-semester-input"
              type="text"
              formControlName="semester"
              placeholder="e.g. Semester 2"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label for="sub-type-select" class="block text-xs font-semibold text-slate-800">Subject Type</label>
              <select
                id="sub-type-select"
                formControlName="type"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="Theory">Theory</option>
                <option value="Practical">Practical</option>
                <option value="Elective">Elective</option>
              </select>
            </div>
            <div class="space-y-1.5">
              <label for="sub-credits-input" class="block text-xs font-semibold text-slate-800">Credits</label>
              <input
                id="sub-credits-input"
                type="number"
                min="1"
                max="8"
                formControlName="credits"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label for="sub-lecture-hours" class="block text-xs font-semibold text-slate-800">Lecture Hours / Wk</label>
              <input
                id="sub-lecture-hours"
                type="number"
                min="0"
                max="10"
                formControlName="lectureHours"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <div class="space-y-1.5">
              <label for="sub-practical-hours" class="block text-xs font-semibold text-slate-800">Practical Hours / Wk</label>
              <input
                id="sub-practical-hours"
                type="number"
                min="0"
                max="10"
                formControlName="practicalHours"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="sub-prereq-input" class="block text-xs font-semibold text-slate-800">Prerequisite Subject(s)</label>
            <input
              id="sub-prereq-input"
              type="text"
              formControlName="prerequisites"
              placeholder="e.g. MCA-101 Data Structures"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div class="space-y-1.5">
            <label for="sub-status-select" class="block text-xs font-semibold text-slate-800">Status</label>
            <select
              id="sub-status-select"
              formControlName="status"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </form>
      </app-form-drawer>

      <app-confirm-dialog
        [isOpen]="isDeleteDialogOpen()"
        title="Delete Subject"
        [message]="deleteDialogMessage()"
        confirmLabel="Confirm Delete"
        (cancelled)="isDeleteDialogOpen.set(false)"
        (confirmed)="confirmDelete()"
      />

    </div>
  `
})
export class SubjectsPage {
  private readonly academicService = inject(AcademicService);

  protected readonly searchQuery = signal<string>('');
  protected readonly selectedCourse = signal<string>('All');
  protected readonly selectedType = signal<string>('All');
  protected readonly bannerMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  protected readonly courseList = computed(() => this.academicService.courses());
  protected readonly subjectsList = computed(() => this.academicService.subjects());

  protected readonly courseFilterOptions = computed<FilterOption[]>(() => [
    { label: 'Course: All', value: 'All' },
    ...this.courseList().map(c => ({ label: c.name, value: c.name }))
  ]);

  protected readonly typeFilterOptions: FilterOption[] = [
    { label: 'Type: All', value: 'All' },
    { label: 'Theory', value: 'Theory' },
    { label: 'Practical', value: 'Practical' },
    { label: 'Elective', value: 'Elective' }
  ];

  protected readonly tableColumns: TableColumn[] = [
    { key: 'code', header: 'Code', isBold: true, isMono: true },
    { key: 'name', header: 'Subject Name' },
    { key: 'course', header: 'Course Program' },
    { key: 'semester', header: 'Semester' },
    { key: 'type', header: 'Type' },
    { key: 'hoursDisplay', header: 'L-P Hrs', align: 'center' },
    { key: 'creditsDisplay', header: 'Credits', align: 'center' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  protected readonly statItems = computed<StatItem[]>(() => {
    const list = this.subjectsList();
    const theory = list.filter(s => s.type === 'Theory').length;
    const practical = list.filter(s => s.type === 'Practical').length;
    return [
      {
        label: 'Total Subjects',
        value: list.length,
        subtext: 'Curriculum catalog',
        icon: 'library_books',
        iconBgClass: 'bg-indigo-50 border-indigo-100',
        iconColorClass: 'text-indigo-600'
      },
      {
        label: 'Theory Subjects',
        value: theory,
        subtext: 'Core lectures',
        icon: 'menu_book',
        iconBgClass: 'bg-purple-50 border-purple-100',
        iconColorClass: 'text-[#6D42E8]'
      },
      {
        label: 'Practical Labs',
        value: practical,
        subtext: 'Hands-on training',
        icon: 'science',
        iconBgClass: 'bg-emerald-50 border-emerald-100',
        iconColorClass: 'text-emerald-600'
      }
    ];
  });

  protected readonly filteredSubjects = computed<SubjectRow[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const c = this.selectedCourse();
    const t = this.selectedType();
    return this.subjectsList()
      .filter(s => {
        if (c !== 'All' && s.course !== c) return false;
        if (t !== 'All' && s.type !== t) return false;
        if (q) {
          const match = `${s.code} ${s.name} ${s.course} ${s.prerequisites || ''}`.toLowerCase();
          if (!match.includes(q)) return false;
        }
        return true;
      })
      .map(s => {
        const l = s.lectureHours ?? (s.type === 'Practical' ? 0 : 3);
        const p = s.practicalHours ?? (s.type === 'Practical' ? 4 : 0);
        return {
          ...s,
          creditsDisplay: `${s.credits} Cr`,
          hoursDisplay: `${l}L - ${p}P`
        };
      });
  });

  protected readonly hasActiveFilters = computed(() => {
    return this.searchQuery().trim() !== '' || this.selectedCourse() !== 'All' || this.selectedType() !== 'All';
  });

  protected readonly isDrawerOpen = signal<boolean>(false);
  protected readonly isViewOnly = signal<boolean>(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formError = signal<string>('');

  protected readonly subjectForm = new FormGroup({
    code: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    course: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    semester: new FormControl('Semester 2', { nonNullable: true }),
    type: new FormControl<'Theory' | 'Practical' | 'Elective'>('Theory', { nonNullable: true }),
    credits: new FormControl<number>(4, { nonNullable: true }),
    lectureHours: new FormControl<number>(3, { nonNullable: true }),
    practicalHours: new FormControl<number>(0, { nonNullable: true }),
    prerequisites: new FormControl('', { nonNullable: true }),
    status: new FormControl<'Active' | 'Inactive'>('Active', { nonNullable: true })
  });

  protected readonly isDeleteDialogOpen = signal<boolean>(false);
  protected readonly deletingItem = signal<SubjectRecord | null>(null);
  protected readonly deleteDialogMessage = computed(() => {
    const item = this.deletingItem();
    return item ? `Are you sure you want to delete ${item.name} (${item.code})?` : '';
  });

  protected readonly drawerTitle = computed(() => {
    if (this.isViewOnly()) return 'Subject Details';
    return this.editingId() ? 'Edit Subject' : 'Add Subject';
  });

  protected readonly drawerSubtitle = computed(() => {
    if (this.isViewOnly()) return 'View curriculum syllabus, L-P hours, prerequisites, and credits.';
    return 'Enter subject code, name, weekly hours, and classification.';
  });

  protected onSearchChange(val: string): void { this.searchQuery.set(val); }
  protected onCourseFilterChange(val: string): void { this.selectedCourse.set(val); }
  protected onTypeFilterChange(val: string): void { this.selectedType.set(val); }
  protected resetFilters(): void {
    this.searchQuery.set('');
    this.selectedCourse.set('All');
    this.selectedType.set('All');
  }

  private syncFormDisabledState(disabled: boolean): void {
    if (disabled) this.subjectForm.disable({ emitEvent: false });
    else this.subjectForm.enable({ emitEvent: false });
  }

  protected openAddDrawer(): void {
    this.isViewOnly.set(false);
    this.editingId.set(null);
    this.formError.set('');
    this.syncFormDisabledState(false);
    this.subjectForm.reset({
      code: '',
      name: '',
      course: this.courseList()[0]?.name || '',
      semester: 'Semester 2',
      type: 'Theory',
      credits: 4,
      lectureHours: 4,
      practicalHours: 0,
      prerequisites: '',
      status: 'Active'
    });
    this.isDrawerOpen.set(true);
  }

  protected onViewRecord(item: SubjectRow): void {
    this.isViewOnly.set(true);
    this.editingId.set(item.id);
    this.formError.set('');
    this.subjectForm.reset({
      code: item.code,
      name: item.name,
      course: item.course,
      semester: item.semester,
      type: item.type,
      credits: item.credits,
      lectureHours: item.lectureHours ?? 3,
      practicalHours: item.practicalHours ?? 0,
      prerequisites: item.prerequisites || '',
      status: item.status
    });
    this.syncFormDisabledState(true);
    this.isDrawerOpen.set(true);
  }

  protected onEditRecord(item: SubjectRow): void {
    this.isViewOnly.set(false);
    this.editingId.set(item.id);
    this.formError.set('');
    this.syncFormDisabledState(false);
    this.subjectForm.reset({
      code: item.code,
      name: item.name,
      course: item.course,
      semester: item.semester,
      type: item.type,
      credits: item.credits,
      lectureHours: item.lectureHours ?? 3,
      practicalHours: item.practicalHours ?? 0,
      prerequisites: item.prerequisites || '',
      status: item.status
    });
    this.isDrawerOpen.set(true);
  }

  protected onDeleteRecord(item: SubjectRow): void {
    this.deletingItem.set(item);
    this.isDeleteDialogOpen.set(true);
  }

  protected closeDrawer(): void {
    this.isDrawerOpen.set(false);
    this.formError.set('');
  }

  protected handleDrawerSave(): void {
    if (this.isViewOnly()) {
      this.closeDrawer();
      return;
    }
    const val = this.subjectForm.getRawValue();
    if (!val.code.trim() || !val.name.trim() || !val.course) {
      this.formError.set('Subject code, name, and course are required.');
      return;
    }

    const res = this.academicService.saveSubject(
      {
        code: val.code.trim().toUpperCase(),
        name: val.name.trim(),
        course: val.course,
        semester: val.semester.trim(),
        type: val.type,
        credits: Number(val.credits) || 4,
        lectureHours: Number(val.lectureHours) || 0,
        practicalHours: Number(val.practicalHours) || 0,
        prerequisites: val.prerequisites.trim() || undefined,
        status: val.status
      },
      this.editingId() || undefined
    );

    if (!res.success) {
      this.formError.set(res.error || 'Failed to save subject.');
      return;
    }
    this.bannerMessage.set({ type: 'success', text: `Subject ${val.code.trim().toUpperCase()} saved.` });
    this.closeDrawer();
  }

  protected confirmDelete(): void {
    const item = this.deletingItem();
    if (item) {
      this.academicService.deleteSubject(item.id);
      this.bannerMessage.set({ type: 'success', text: `Subject ${item.code} deleted.` });
    }
    this.isDeleteDialogOpen.set(false);
  }

  protected exportExcel(): void {
    exportToExcel(
      this.filteredSubjects().map(s => ({
        Code: s.code,
        'Subject Name': s.name,
        Course: s.course,
        Semester: s.semester,
        Type: s.type,
        'L-P Hours': s.hoursDisplay,
        Credits: s.credits,
        Prerequisites: s.prerequisites || 'None',
        Status: s.status
      })),
      'EduERP_Subjects_Curriculum'
    );
  }

  protected exportPdf(): void {
    exportToPdf(
      'Curriculum Subjects & Credit Catalog',
      ['Code', 'Subject Name', 'Course Program', 'Semester', 'Type', 'L-P Hrs', 'Credits', 'Status'],
      this.filteredSubjects().map(s => [
        s.code,
        s.name,
        s.course,
        s.semester,
        s.type,
        s.hoursDisplay,
        s.creditsDisplay,
        s.status
      ]),
      'EduERP_Subjects_Curriculum'
    );
  }
}
