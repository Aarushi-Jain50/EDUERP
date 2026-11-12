import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AcademicService, SubjectAllocationRecord } from '../../../services/academic.service';
import { FacultyService } from '../../../services/faculty.service';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-subject-allocation-page',
  imports: [
    FormsModule,
    PageHeader,
    StatStrip,
    DataToolbar,
    DataTable,
    FormDrawer,
    ConfirmDialog
  ],
  template: `
    <div class="flex flex-col gap-5 max-w-[1400px] mx-auto w-full font-sans">
      
      <!-- 1. Page Header -->
      <app-page-header
        title="Subject Allocation"
        subtitle="Assign faculty members and weekly lecture hours to sections and semester subjects."
        actionLabel="Allocate Subject"
        (actionClicked)="openAddDrawer()"
      />

      <!-- 2. Stat Strip -->
      <app-stat-strip [items]="statItems()" />

      <!-- 3. Data Toolbar (Search + Course Filter) -->
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

      <!-- 4. Data Table Card -->
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

      <!-- Slide-in Form Drawer with Dependent Dropdowns -->
      <app-form-drawer
        [isOpen]="isDrawerOpen()"
        [title]="drawerTitle()"
        [subtitle]="drawerSubtitle()"
        [saveLabel]="isViewOnly() ? 'Close' : (editingId() ? 'Update Allocation' : 'Save Allocation')"
        (closed)="closeDrawer()"
        (saved)="handleDrawerSave()"
      >
        <div class="space-y-4">
          @if (formError()) {
            <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <span class="material-icons text-base text-amber-600 shrink-0">warning</span>
              <span>{{ formError() }}</span>
            </div>
          }

          <!-- 1. Course Dropdown (Parent for dependent dropdowns) -->
          <div class="space-y-1.5">
            <label for="alloc-course-select" class="block text-xs font-semibold text-slate-800">
              1. Course / Program <span class="text-red-500">*</span>
            </label>
            <select
              id="alloc-course-select"
              [disabled]="isViewOnly()"
              [(ngModel)]="formCourse"
              (ngModelChange)="onCourseChange($event)"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer"
            >
              @for (c of courseList(); track c.id) {
                <option [value]="c.name">{{ c.name }}</option>
              }
            </select>
          </div>

          <!-- 2. Semester Dropdown (Dependent on Course) -->
          <div class="space-y-1.5">
            <label for="alloc-sem-select" class="block text-xs font-semibold text-slate-800">
              2. Semester <span class="text-red-500">*</span>
            </label>
            <select
              id="alloc-sem-select"
              [disabled]="isViewOnly()"
              [(ngModel)]="formSemester"
              (ngModelChange)="onSemesterChange($event)"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer"
            >
              @for (sem of availableSemesters(); track sem) {
                <option [value]="sem">{{ sem }}</option>
              }
            </select>
          </div>

          <!-- 3. Subject Dropdown (Dependent on Course + Semester) -->
          <div class="space-y-1.5">
            <label for="alloc-sub-select" class="block text-xs font-semibold text-slate-800">
              3. Subject <span class="text-red-500">*</span>
            </label>
            <select
              id="alloc-sub-select"
              [disabled]="isViewOnly()"
              [(ngModel)]="formSubject"
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

          <!-- Section Dropdown -->
          <div class="space-y-1.5">
            <label for="alloc-sec-select" class="block text-xs font-semibold text-slate-800">
              Section <span class="text-red-500">*</span>
            </label>
            <select
              id="alloc-sec-select"
              [disabled]="isViewOnly()"
              [(ngModel)]="formSection"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer"
            >
              @for (sec of availableSections(); track sec.id) {
                <option [value]="sec.section">{{ sec.section }} (Capacity: {{ sec.capacity }})</option>
              }
            </select>
          </div>

          <!-- Assigned Faculty Dropdown (wired to FacultyService) -->
          <div class="space-y-1.5">
            <label for="alloc-faculty-select" class="block text-xs font-semibold text-slate-800">
              Assigned Faculty <span class="text-red-500">*</span>
            </label>
            <select
              id="alloc-faculty-select"
              [disabled]="isViewOnly()"
              [(ngModel)]="formFaculty"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer"
            >
              <option value="">-- Select Faculty Member --</option>
              @for (f of facultyList(); track f.id) {
                <option [value]="f.name">{{ f.name }} ({{ f.designation }} - {{ f.department }})</option>
              }
            </select>
          </div>

          <!-- Weekly Hours -->
          <div class="space-y-1.5">
            <label for="alloc-hours-input" class="block text-xs font-semibold text-slate-800">Weekly Lecture Hours</label>
            <input
              id="alloc-hours-input"
              type="number"
              min="1"
              max="10"
              [disabled]="isViewOnly()"
              [(ngModel)]="formWeeklyHours"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
        </div>
      </app-form-drawer>

      <!-- Delete Confirmation Dialog -->
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

  protected readonly facultyList = computed(() => this.facultyService.facultyList());
  protected readonly courseList = computed(() => this.academicService.courses());
  protected readonly semestersList = computed(() => this.academicService.semesters());
  protected readonly subjectsList = computed(() => this.academicService.subjects());
  protected readonly sectionsList = computed(() => this.academicService.sections());
  protected readonly allocationsList = computed(() => this.academicService.subjectAllocations());

  protected readonly courseFilterOptions = computed<FilterOption[]>(() => {
    return [
      { label: 'Course: All', value: 'All' },
      ...this.courseList().map(c => ({ label: c.name, value: c.name }))
    ];
  });

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

  protected readonly filteredAllocations = computed(() => {
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

  // Dependent dropdown computed states
  protected formCourse = '';
  protected formSemester = '';
  protected formSubject = '';
  protected formSection = '';
  protected formFaculty = '';
  protected formWeeklyHours = 4;

  protected readonly availableSemesters = computed(() => {
    const course = this.formCourse;
    const sems = this.semestersList().filter(s => s.course === course);
    const unique = Array.from(new Set(sems.map(s => `Semester ${s.semesterNumber}`)));
    return unique.length > 0 ? unique : ['Semester 1', 'Semester 2'];
  });

  protected readonly availableSubjects = computed(() => {
    const course = this.formCourse;
    const sem = this.formSemester;
    return this.subjectsList().filter(sub => sub.course === course && sub.semester === sem);
  });

  protected readonly availableSections = computed(() => {
    const course = this.formCourse;
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
    if (!item) return '';
    return `Remove allocation of ${item.subject} to ${item.section} (${item.faculty})?`;
  });

  protected readonly drawerTitle = computed(() => {
    if (this.isViewOnly()) return 'Allocation Details';
    return this.editingId() ? 'Edit Subject Allocation' : 'Allocate Subject';
  });

  protected readonly drawerSubtitle = computed(() => {
    if (this.isViewOnly()) return 'View faculty teaching assignment details.';
    return 'Select course, semester, subject, and section.';
  });

  protected onSearchChange(val: string): void { this.searchQuery.set(val); }
  protected onCourseFilterChange(val: string): void { this.selectedCourse.set(val); }
  protected resetFilters(): void {
    this.searchQuery.set('');
    this.selectedCourse.set('All');
  }

  protected onCourseChange(courseName: string): void {
    this.formCourse = courseName;
    const sems = this.availableSemesters();
    if (sems.length > 0) {
      this.formSemester = sems[0];
      this.onSemesterChange(sems[0]);
    }
  }

  protected onSemesterChange(semName: string): void {
    this.formSemester = semName;
    const subs = this.availableSubjects();
    if (subs.length > 0) {
      this.formSubject = subs[0].name;
    } else {
      this.formSubject = '';
    }
  }

  protected openAddDrawer(): void {
    this.isViewOnly.set(false);
    this.editingId.set(null);
    this.formError.set('');
    const firstCourse = this.courseList()[0]?.name || '';
    this.formCourse = firstCourse;
    const sems = this.availableSemesters();
    this.formSemester = sems[0] || 'Semester 2';
    const subs = this.availableSubjects();
    this.formSubject = subs[0]?.name || '';
    const secs = this.availableSections();
    this.formSection = secs[0]?.section || 'Section A';
    this.formFaculty = this.facultyList()[0]?.name || '';
    this.formWeeklyHours = 4;
    this.isDrawerOpen.set(true);
  }

  protected onViewRecord(item: SubjectAllocationRecord): void {
    this.isViewOnly.set(true);
    this.editingId.set(item.id);
    this.formError.set('');
    this.formCourse = item.course;
    this.formSemester = item.semester;
    this.formSubject = item.subject;
    this.formSection = item.section;
    this.formFaculty = item.faculty;
    this.formWeeklyHours = item.weeklyHours;
    this.isDrawerOpen.set(true);
  }

  protected onEditRecord(item: SubjectAllocationRecord): void {
    this.isViewOnly.set(false);
    this.editingId.set(item.id);
    this.formError.set('');
    this.formCourse = item.course;
    this.formSemester = item.semester;
    this.formSubject = item.subject;
    this.formSection = item.section;
    this.formFaculty = item.faculty;
    this.formWeeklyHours = item.weeklyHours;
    this.isDrawerOpen.set(true);
  }

  protected onDeleteRecord(item: SubjectAllocationRecord): void {
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
    if (!this.formSubject || !this.formFaculty.trim() || !this.formSection) {
      this.formError.set('Subject, faculty, and section are required.');
      return;
    }

    const res = this.academicService.saveSubjectAllocation(
      {
        subject: this.formSubject,
        faculty: this.formFaculty.trim(),
        course: this.formCourse,
        semester: this.formSemester,
        section: this.formSection,
        weeklyHours: Number(this.formWeeklyHours) || 4
      },
      this.editingId() || undefined
    );

    if (!res.success) {
      this.formError.set(res.error || 'Failed to save subject allocation.');
      return;
    }
    this.closeDrawer();
  }

  protected confirmDelete(): void {
    const item = this.deletingItem();
    if (item) {
      this.academicService.deleteSubjectAllocation(item.id);
    }
    this.isDeleteDialogOpen.set(false);
  }
}
