import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AcademicService, SubjectAllocationRecord } from '../../../services/academic.service';
import { FacultyService } from '../../../services/faculty.service';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

export interface SubjectAllocationRow extends SubjectAllocationRecord {
  hoursDisplay: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-subject-allocation-page',
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
          [class]="banner.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : banner.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'"
        >
          <div class="flex items-center gap-2">
            <span class="material-icons text-base">
              {{ banner.type === 'error' ? 'error_outline' : banner.type === 'warning' ? 'warning_amber' : 'check_circle' }}
            </span>
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
          title="Subject Allocation"
          subtitle="Assign faculty members and weekly lecture hours to sections with conflict and workload cap detection."
          actionLabel="Allocate Subject"
          actionIcon="assignment_turned_in"
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
        searchPlaceholder="Search by subject, faculty, or section..."
        [filter1Value]="selectedCourse()"
        [filter1Options]="courseFilterOptions()"
        [hasActiveFilters]="hasActiveFilters()"
        (searchChange)="onSearchChange($event)"
        (filter1Change)="onCourseFilterChange($event)"
        (resetClicked)="resetFilters()"
      />

      <app-data-table
        [columns]="tableColumns"
        [data]="filteredAllocations()"
        idKey="id"
        emptyIcon="assignment_turned_in"
        emptyTitle="No subject allocations found"
        emptyMessage="Try adjusting your course filter or search query."
        emptyActionLabel="Clear filters"
        (emptyActionClicked)="resetFilters()"
        (viewClicked)="onViewRecord($event)"
        (editClicked)="onEditRecord($event)"
        (deleteClicked)="onDeleteRecord($event)"
      />

      <!-- Faculty Weekly Workload Balance Summary -->
      <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div class="px-5 py-3.5 border-b border-[#E2E8F0] bg-slate-50/70 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span class="material-icons text-base text-indigo-600">speed</span>
              <span>Faculty Weekly Teaching Workload Summary</span>
            </h2>
            <p class="text-[11px] text-slate-500 mt-0.5">Institutional workload limit: 22 hrs/week (warning threshold at 18 hrs/week).</p>
          </div>
          <span class="text-[11px] font-semibold text-slate-500">{{ facultyWorkloadSummary().length }} Faculty</span>
        </div>

        <div class="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          @for (item of facultyWorkloadSummary(); track item.id) {
            <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-xs font-bold text-slate-900 truncate">{{ item.name }}</p>
                  <p class="text-[11px] text-slate-500 truncate">{{ item.department }}</p>
                </div>
                <span
                  class="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                  [class]="item.assignedHours >= 22 ? 'bg-red-100 text-red-700' : item.assignedHours > 18 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'"
                >
                  {{ item.assignedHours }} / {{ item.maxHours }} hrs
                </span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all"
                  [style.width.%]="item.percent"
                  [class]="item.assignedHours >= 22 ? 'bg-red-500' : item.assignedHours > 18 ? 'bg-amber-500' : 'bg-indigo-600'"
                ></div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Slide-in Form Drawer with Dependent Dropdowns -->
      <app-form-drawer
        [isOpen]="isDrawerOpen()"
        [title]="drawerTitle()"
        [subtitle]="drawerSubtitle()"
        [saveLabel]="isViewOnly() ? 'Close' : (editingId() ? 'Update Allocation' : 'Save Allocation')"
        (closed)="closeDrawer()"
        (saved)="handleDrawerSave()"
      >
        <form [formGroup]="allocForm" class="space-y-4">
          @if (formError()) {
            <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
              <span class="material-icons text-base text-red-600 shrink-0">warning</span>
              <span>{{ formError() }}</span>
            </div>
          }

          <div class="space-y-1.5">
            <label for="alloc-course-select" class="block text-xs font-semibold text-slate-800">
              1. Course / Program <span class="text-red-500">*</span>
            </label>
            <select
              id="alloc-course-select"
              formControlName="course"
              (change)="onCourseChange($event)"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer"
            >
              @for (c of courseList(); track c.id) {
                <option [value]="c.name">{{ c.name }}</option>
              }
            </select>
          </div>

          <div class="space-y-1.5">
            <label for="alloc-sem-select" class="block text-xs font-semibold text-slate-800">
              2. Semester <span class="text-red-500">*</span>
            </label>
            <select
              id="alloc-sem-select"
              formControlName="semester"
              (change)="onSemesterChange($event)"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer"
            >
              @for (sem of availableSemesters(); track sem) {
                <option [value]="sem">{{ sem }}</option>
              }
            </select>
          </div>

          <div class="space-y-1.5">
            <label for="alloc-sub-select" class="block text-xs font-semibold text-slate-800">
              3. Subject <span class="text-red-500">*</span>
            </label>
            <select
              id="alloc-sub-select"
              formControlName="subject"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer"
            >
              @for (sub of availableSubjects(); track sub.id) {
                <option [value]="sub.name">{{ sub.code }} - {{ sub.name }}</option>
              }
            </select>
            @if (availableSubjects().length === 0) {
              <p class="text-[11px] text-amber-600">No subjects found for this course and semester.</p>
            }
          </div>

          <div class="space-y-1.5">
            <label for="alloc-sec-select" class="block text-xs font-semibold text-slate-800">
              Section <span class="text-red-500">*</span>
            </label>
            <select
              id="alloc-sec-select"
              formControlName="section"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer"
            >
              @for (sec of availableSections(); track sec.id) {
                <option [value]="sec.section">{{ sec.section }} (Capacity: {{ sec.capacity }})</option>
              }
            </select>
          </div>

          <div class="space-y-1.5">
            <label for="alloc-faculty-select" class="block text-xs font-semibold text-slate-800">
              Assigned Faculty <span class="text-red-500">*</span>
            </label>
            <select
              id="alloc-faculty-select"
              formControlName="faculty"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer"
            >
              <option value="">-- Select Faculty Member --</option>
              @for (f of facultyList(); track f.id) {
                <option [value]="f.name">{{ f.name }} ({{ getFacultyLoad(f.name) }} hrs/wk · {{ f.department }})</option>
              }
            </select>
          </div>

          <div class="space-y-1.5">
            <label for="alloc-hours-input" class="block text-xs font-semibold text-slate-800">Weekly Lecture Hours</label>
            <input
              id="alloc-hours-input"
              type="number"
              min="1"
              max="10"
              formControlName="weeklyHours"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
        </form>
      </app-form-drawer>

      <app-confirm-dialog
        [isOpen]="isDeleteDialogOpen()"
        title="Remove Subject Allocation"
        [message]="deleteDialogMessage()"
        confirmLabel="Remove Allocation"
        (cancelled)="isDeleteDialogOpen.set(false)"
        (confirmed)="confirmDelete()"
      />

    </div>
  `
})
export class SubjectAllocationPage {
  private readonly academicService = inject(AcademicService);
  private readonly facultyService = inject(FacultyService);

  protected readonly searchQuery = signal<string>('');
  protected readonly selectedCourse = signal<string>('All');
  protected readonly bannerMessage = signal<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);

  protected readonly facultyList = computed(() => this.facultyService.facultyList());
  protected readonly courseList = computed(() => this.academicService.courses());
  protected readonly semestersList = computed(() => this.academicService.semesters());
  protected readonly subjectsList = computed(() => this.academicService.subjects());
  protected readonly sectionsList = computed(() => this.academicService.sections());
  protected readonly allocationsList = computed(() => this.academicService.subjectAllocations());
  protected readonly workloadMap = computed(() => this.academicService.facultyWorkloadMap());

  protected readonly courseFilterOptions = computed<FilterOption[]>(() => [
    { label: 'Course: All', value: 'All' },
    ...this.courseList().map(c => ({ label: c.name, value: c.name }))
  ]);

  protected readonly tableColumns: TableColumn[] = [
    { key: 'subject', header: 'Subject', isBold: true },
    { key: 'faculty', header: 'Assigned Faculty' },
    { key: 'course', header: 'Course Program' },
    { key: 'semester', header: 'Semester' },
    { key: 'section', header: 'Section' },
    { key: 'hoursDisplay', header: 'Weekly Hours', align: 'center' }
  ];

  protected readonly statItems = computed<StatItem[]>(() => {
    const list = this.allocationsList();
    const totalHours = list.reduce((acc, a) => acc + a.weeklyHours, 0);
    return [
      {
        label: 'Total Allocations',
        value: list.length,
        subtext: 'Active faculty assignments',
        icon: 'assignment_turned_in',
        iconBgClass: 'bg-indigo-50 border-indigo-100',
        iconColorClass: 'text-indigo-600'
      },
      {
        label: 'Faculty Members',
        value: new Set(list.map(a => a.faculty)).size,
        subtext: 'Assigned instructors',
        icon: 'badge',
        iconBgClass: 'bg-purple-50 border-purple-100',
        iconColorClass: 'text-[#6D42E8]'
      },
      {
        label: 'Total Weekly Hours',
        value: totalHours,
        subtext: 'Combined lecture workload',
        icon: 'schedule',
        iconBgClass: 'bg-emerald-50 border-emerald-100',
        iconColorClass: 'text-emerald-600'
      }
    ];
  });

  protected readonly facultyWorkloadSummary = computed(() => {
    const map = this.workloadMap();
    return this.facultyList().map(f => {
      const assignedHours = map.get(f.name.trim().toLowerCase()) ?? 0;
      const maxHours = f.maxWeeklyHours ?? 22;
      const percent = Math.min(100, Math.round((assignedHours / 22) * 100));
      return {
        id: f.id,
        name: f.name,
        department: f.department,
        assignedHours,
        maxHours,
        percent
      };
    });
  });

  protected readonly filteredAllocations = computed<SubjectAllocationRow[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const c = this.selectedCourse();
    return this.allocationsList()
      .filter(a => {
        if (c !== 'All' && a.course !== c) return false;
        if (q) {
          const match = `${a.subject} ${a.faculty} ${a.section} ${a.course}`.toLowerCase();
          if (!match.includes(q)) return false;
        }
        return true;
      })
      .map(a => ({
        ...a,
        hoursDisplay: `${a.weeklyHours} Hrs/Wk`
      }));
  });

  protected readonly hasActiveFilters = computed(() => {
    return this.searchQuery().trim() !== '' || this.selectedCourse() !== 'All';
  });

  protected readonly selectedFormCourse = signal<string>('');
  protected readonly selectedFormSemester = signal<string>('Semester 2');

  protected readonly allocForm = new FormGroup({
    course: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    semester: new FormControl('Semester 2', { nonNullable: true, validators: [Validators.required] }),
    subject: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    section: new FormControl('Section A', { nonNullable: true, validators: [Validators.required] }),
    faculty: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    weeklyHours: new FormControl<number>(4, { nonNullable: true })
  });

  protected readonly availableSemesters = computed(() => {
    const course = this.selectedFormCourse();
    const sems = this.semestersList().filter(s => s.course === course);
    const unique = Array.from(new Set(sems.map(s => `Semester ${s.semesterNumber}`)));
    return unique.length > 0 ? unique : ['Semester 1', 'Semester 2'];
  });

  protected readonly availableSubjects = computed(() => {
    const course = this.selectedFormCourse();
    const sem = this.selectedFormSemester();
    return this.subjectsList().filter(sub => sub.course === course && sub.semester === sem);
  });

  protected readonly availableSections = computed(() => {
    const course = this.selectedFormCourse();
    const list = this.sectionsList().filter(sec => sec.course === course);
    return list.length > 0 ? list : this.sectionsList();
  });

  protected readonly isDrawerOpen = signal<boolean>(false);
  protected readonly isViewOnly = signal<boolean>(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formError = signal<string>('');

  protected readonly isDeleteDialogOpen = signal<boolean>(false);
  protected readonly deletingItem = signal<SubjectAllocationRecord | null>(null);
  protected readonly deleteDialogMessage = computed(() => {
    const item = this.deletingItem();
    return item ? `Remove allocation of ${item.subject} to ${item.section} (${item.faculty})?` : '';
  });

  protected readonly drawerTitle = computed(() => {
    if (this.isViewOnly()) return 'Allocation Details';
    return this.editingId() ? 'Edit Subject Allocation' : 'Allocate Subject';
  });

  protected readonly drawerSubtitle = computed(() => {
    if (this.isViewOnly()) return 'View faculty teaching assignment details.';
    return 'Select course, semester, subject, section, and faculty instructor.';
  });

  protected getFacultyLoad(name: string): number {
    return this.workloadMap().get(name.trim().toLowerCase()) ?? 0;
  }

  protected onSearchChange(val: string): void { this.searchQuery.set(val); }
  protected onCourseFilterChange(val: string): void { this.selectedCourse.set(val); }
  protected resetFilters(): void {
    this.searchQuery.set('');
    this.selectedCourse.set('All');
  }

  private syncFormDisabledState(disabled: boolean): void {
    if (disabled) this.allocForm.disable({ emitEvent: false });
    else this.allocForm.enable({ emitEvent: false });
  }

  protected onCourseChange(event: Event): void {
    const courseName = (event.target as HTMLSelectElement).value;
    this.selectedFormCourse.set(courseName);
    const sems = this.availableSemesters();
    const firstSem = sems[0] || 'Semester 2';
    this.selectedFormSemester.set(firstSem);
    const subs = this.availableSubjects();
    const secs = this.availableSections();
    this.allocForm.patchValue({
      semester: firstSem,
      subject: subs[0]?.name || '',
      section: secs[0]?.section || 'Section A'
    });
  }

  protected onSemesterChange(event: Event): void {
    const semName = (event.target as HTMLSelectElement).value;
    this.selectedFormSemester.set(semName);
    const subs = this.availableSubjects();
    this.allocForm.patchValue({ subject: subs[0]?.name || '' });
  }

  protected openAddDrawer(): void {
    this.isViewOnly.set(false);
    this.editingId.set(null);
    this.formError.set('');
    this.syncFormDisabledState(false);

    const firstCourse = this.courseList()[0]?.name || '';
    this.selectedFormCourse.set(firstCourse);
    const sems = this.availableSemesters();
    const firstSem = sems[0] || 'Semester 2';
    this.selectedFormSemester.set(firstSem);
    const subs = this.availableSubjects();
    const secs = this.availableSections();

    this.allocForm.reset({
      course: firstCourse,
      semester: firstSem,
      subject: subs[0]?.name || '',
      section: secs[0]?.section || 'Section A',
      faculty: this.facultyList()[0]?.name || '',
      weeklyHours: 4
    });
    this.isDrawerOpen.set(true);
  }

  protected onViewRecord(item: SubjectAllocationRow): void {
    this.isViewOnly.set(true);
    this.editingId.set(item.id);
    this.formError.set('');
    this.selectedFormCourse.set(item.course);
    this.selectedFormSemester.set(item.semester);
    this.allocForm.reset({
      course: item.course,
      semester: item.semester,
      subject: item.subject,
      section: item.section,
      faculty: item.faculty,
      weeklyHours: item.weeklyHours
    });
    this.syncFormDisabledState(true);
    this.isDrawerOpen.set(true);
  }

  protected onEditRecord(item: SubjectAllocationRow): void {
    this.isViewOnly.set(false);
    this.editingId.set(item.id);
    this.formError.set('');
    this.syncFormDisabledState(false);
    this.selectedFormCourse.set(item.course);
    this.selectedFormSemester.set(item.semester);
    this.allocForm.reset({
      course: item.course,
      semester: item.semester,
      subject: item.subject,
      section: item.section,
      faculty: item.faculty,
      weeklyHours: item.weeklyHours
    });
    this.isDrawerOpen.set(true);
  }

  protected onDeleteRecord(item: SubjectAllocationRow): void {
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
    const val = this.allocForm.getRawValue();
    if (!val.subject || !val.faculty.trim() || !val.section) {
      this.formError.set('Subject, faculty, and section are required.');
      return;
    }

    const res = this.academicService.saveSubjectAllocation(
      {
        subject: val.subject,
        faculty: val.faculty.trim(),
        course: val.course,
        semester: val.semester,
        section: val.section,
        weeklyHours: Number(val.weeklyHours) || 4
      },
      this.editingId() || undefined
    );

    if (!res.success) {
      this.formError.set(res.error || 'Failed to save subject allocation.');
      return;
    }
    if (res.warning) {
      this.bannerMessage.set({ type: 'warning', text: `Allocation saved with workload alert: ${res.warning}` });
    } else {
      this.bannerMessage.set({ type: 'success', text: `Allocated ${val.subject} to ${val.faculty.trim()} (${val.section}).` });
    }
    this.closeDrawer();
  }

  protected confirmDelete(): void {
    const item = this.deletingItem();
    if (item) {
      this.academicService.deleteSubjectAllocation(item.id);
      this.bannerMessage.set({ type: 'success', text: `Removed allocation for ${item.subject}.` });
    }
    this.isDeleteDialogOpen.set(false);
  }

  protected exportExcel(): void {
    exportToExcel(
      this.filteredAllocations().map(a => ({
        Subject: a.subject,
        Faculty: a.faculty,
        Course: a.course,
        Semester: a.semester,
        Section: a.section,
        'Weekly Hours': a.weeklyHours
      })),
      'EduERP_Subject_Allocations'
    );
  }

  protected exportPdf(): void {
    exportToPdf(
      'Faculty Subject Allocations & Workload',
      ['Subject', 'Assigned Faculty', 'Course Program', 'Semester', 'Section', 'Weekly Hours'],
      this.filteredAllocations().map(a => [a.subject, a.faculty, a.course, a.semester, a.section, a.hoursDisplay]),
      'EduERP_Subject_Allocations'
    );
  }
}
