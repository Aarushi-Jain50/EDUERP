import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AcademicService, SectionRecord, BatchRecord } from '../../../services/academic.service';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';

export interface SectionRow extends SectionRecord {
  strengthDisplay: string;
}

export interface BatchRow extends BatchRecord {
  durationDisplay: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-batches-sections-page',
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
        title="Sections & Batches"
        subtitle="Manage classroom sections, seating capacities, and student cohort batches."
        [actionLabel]="activeTab() === 'sections' ? 'Add Section' : 'Add Batch'"
        (actionClicked)="openAddDrawer()"
      />

      <!-- 2. Stat Strip -->
      <app-stat-strip [items]="statItems()" />

      <!-- Tab Switcher & Data Toolbar Card Wrapper -->
      <div class="flex flex-col gap-5">
        <!-- Tabs Header Bar -->
        <div class="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
          <button
            type="button"
            (click)="activeTab.set('sections'); resetFilters()"
            class="px-4 py-2 text-xs sm:text-[13px] font-bold rounded-xl transition-colors cursor-pointer border"
            [class]="activeTab() === 'sections'
              ? 'bg-[#1A1745] text-white border-[#1A1745] shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border-[#E2E8F0]'"
          >
            Sections ({{ sectionsList().length }})
          </button>
          <button
            type="button"
            (click)="activeTab.set('batches'); resetFilters()"
            class="px-4 py-2 text-xs sm:text-[13px] font-bold rounded-xl transition-colors cursor-pointer border"
            [class]="activeTab() === 'batches'
              ? 'bg-[#1A1745] text-white border-[#1A1745] shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border-[#E2E8F0]'"
          >
            Batches ({{ batchesList().length }})
          </button>
        </div>

        <!-- 3. Data Toolbar -->
        <app-data-toolbar
          [searchValue]="searchQuery()"
          [searchPlaceholder]="activeTab() === 'sections' ? 'Search sections or class teachers...' : 'Search batch names or courses...'"
          [filter1Value]="selectedCourseFilter()"
          [filter1Options]="courseFilterOptions()"
          [hasActiveFilters]="hasActiveFilters()"
          (searchChange)="onSearchChange($event)"
          (filter1Change)="onCourseFilterChange($event)"
          (resetClicked)="resetFilters()"
        />

        <!-- 4. Data Table Card -->
        @if (activeTab() === 'sections') {
          <app-data-table
            [columns]="sectionTableColumns"
            [data]="filteredSections()"
            idKey="id"
            emptyIcon="group_work"
            emptyTitle="No sections found"
            emptyMessage="Try adjusting search or course filter."
            emptyActionLabel="Clear filters"
            (emptyActionClicked)="resetFilters()"
            (viewClicked)="onViewSection($event)"
            (editClicked)="onEditSection($event)"
            (deleteClicked)="onDeleteSection($event)"
          />
        } @else {
          <app-data-table
            [columns]="batchTableColumns"
            [data]="filteredBatches()"
            idKey="id"
            emptyIcon="school"
            emptyTitle="No batches found"
            emptyMessage="Try adjusting search or course filter."
            emptyActionLabel="Clear filters"
            (emptyActionClicked)="resetFilters()"
            (viewClicked)="onViewBatch($event)"
            (editClicked)="onEditBatch($event)"
            (deleteClicked)="onDeleteBatch($event)"
          />
        }
      </div>

      <!-- Slide-in Form Drawer for Sections -->
      <app-form-drawer
        [isOpen]="isSectionDrawerOpen()"
        [title]="sectionDrawerTitle()"
        subtitle="Manage classroom section and seating capacity."
        [saveLabel]="isViewOnly() ? 'Close' : (editingId() ? 'Update Section' : 'Save Section')"
        (closed)="closeDrawer()"
        (saved)="handleSectionSave()"
      >
        <div class="space-y-4">
          @if (formError()) {
            <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <span class="material-icons text-base text-red-600 shrink-0">error_outline</span>
              <span>{{ formError() }}</span>
            </div>
          }

          <div class="space-y-1.5">
            <label for="sec-name-input" class="block text-xs font-semibold text-slate-800">
              Section Name <span class="text-red-500">*</span>
            </label>
            <input
              id="sec-name-input"
              type="text"
              [disabled]="isViewOnly()"
              [(ngModel)]="secFormName"
              placeholder="e.g. Section A"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div class="space-y-1.5">
            <label for="sec-course-select" class="block text-xs font-semibold text-slate-800">
              Course / Program <span class="text-red-500">*</span>
            </label>
            <select
              id="sec-course-select"
              [disabled]="isViewOnly()"
              [(ngModel)]="secFormCourse"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
              @for (c of courseList(); track c.id) {
                <option [value]="c.name">{{ c.name }}</option>
              }
            </select>
          </div>

          <div class="space-y-1.5">
            <label for="sec-semester-input" class="block text-xs font-semibold text-slate-800">Semester</label>
            <input
              id="sec-semester-input"
              type="text"
              [disabled]="isViewOnly()"
              [(ngModel)]="secFormSemester"
              placeholder="e.g. Semester 2"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div class="space-y-1.5">
            <label for="sec-teacher-input" class="block text-xs font-semibold text-slate-800">Class Teacher</label>
            <input
              id="sec-teacher-input"
              type="text"
              [disabled]="isViewOnly()"
              [(ngModel)]="secFormTeacher"
              placeholder="e.g. Dr. Amit Joshi"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label for="sec-strength-input" class="block text-xs font-semibold text-slate-800">Current Strength</label>
              <input
                id="sec-strength-input"
                type="number"
                min="0"
                [disabled]="isViewOnly()"
                [(ngModel)]="secFormStrength"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <div class="space-y-1.5">
              <label for="sec-capacity-input" class="block text-xs font-semibold text-slate-800">Max Capacity</label>
              <input
                id="sec-capacity-input"
                type="number"
                min="10"
                [disabled]="isViewOnly()"
                [(ngModel)]="secFormCapacity"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>
        </div>
      </app-form-drawer>

      <!-- Slide-in Form Drawer for Batches -->
      <app-form-drawer
        [isOpen]="isBatchDrawerOpen()"
        [title]="batchDrawerTitle()"
        subtitle="Manage student cohort batches and year range."
        [saveLabel]="isViewOnly() ? 'Close' : (editingId() ? 'Update Batch' : 'Save Batch')"
        (closed)="closeDrawer()"
        (saved)="handleBatchSave()"
      >
        <div class="space-y-4">
          @if (formError()) {
            <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <span class="material-icons text-base text-red-600 shrink-0">error_outline</span>
              <span>{{ formError() }}</span>
            </div>
          }

          <div class="space-y-1.5">
            <label for="batch-name-input" class="block text-xs font-semibold text-slate-800">
              Batch Name (e.g. 2025-2027) <span class="text-red-500">*</span>
            </label>
            <input
              id="batch-name-input"
              type="text"
              [disabled]="isViewOnly()"
              [(ngModel)]="batchFormName"
              placeholder="e.g. 2025-2027"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div class="space-y-1.5">
            <label for="batch-course-select" class="block text-xs font-semibold text-slate-800">
              Course / Program <span class="text-red-500">*</span>
            </label>
            <select
              id="batch-course-select"
              [disabled]="isViewOnly()"
              [(ngModel)]="batchFormCourse"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
              @for (c of courseList(); track c.id) {
                <option [value]="c.name">{{ c.name }}</option>
              }
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label for="batch-start-year" class="block text-xs font-semibold text-slate-800">Start Year</label>
              <input
                id="batch-start-year"
                type="number"
                [disabled]="isViewOnly()"
                [(ngModel)]="batchFormStartYear"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <div class="space-y-1.5">
              <label for="batch-end-year" class="block text-xs font-semibold text-slate-800">End Year</label>
              <input
                id="batch-end-year"
                type="number"
                [disabled]="isViewOnly()"
                [(ngModel)]="batchFormEndYear"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="batch-students-count" class="block text-xs font-semibold text-slate-800">Enrolled Students Count</label>
            <input
              id="batch-students-count"
              type="number"
              min="0"
              [disabled]="isViewOnly()"
              [(ngModel)]="batchFormStudentsCount"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div class="space-y-1.5">
            <label for="batch-status-select" class="block text-xs font-semibold text-slate-800">Status</label>
            <select
              id="batch-status-select"
              [disabled]="isViewOnly()"
              [(ngModel)]="batchFormStatus"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </app-form-drawer>

      <!-- Delete Confirmation Dialog -->
      <app-confirm-dialog
        [isOpen]="isDeleteDialogOpen()"
        title="Delete Record"
        [message]="deleteDialogMessage()"
        confirmLabel="Confirm Delete"
        (cancelled)="isDeleteDialogOpen.set(false)"
        (confirmed)="confirmDelete()"
      />

    </div>
  `
})
export class BatchesSectionsPage {
  private readonly academicService = inject(AcademicService);

  protected readonly activeTab = signal<'sections' | 'batches'>('sections');
  protected readonly searchQuery = signal<string>('');
  protected readonly selectedCourseFilter = signal<string>('All');

  protected readonly courseList = computed(() => this.academicService.courses());
  protected readonly sectionsList = computed(() => this.academicService.sections());
  protected readonly batchesList = computed(() => this.academicService.batches());

  protected readonly courseFilterOptions = computed<FilterOption[]>(() => {
    return [
      { label: 'Course: All', value: 'All' },
      ...this.courseList().map(c => ({ label: c.name, value: c.name }))
    ];
  });

  protected readonly statItems = computed<StatItem[]>(() => {
    const sec = this.sectionsList();
    const bat = this.batchesList();
    return [
      {
        label: 'Total Sections',
        value: sec.length,
        subtext: 'Active classrooms',
        icon: 'group_work',
        iconBgClass: 'bg-purple-50 border-purple-100',
        iconColorClass: 'text-[#6D42E8]'
      },
      {
        label: 'Total Batches',
        value: bat.length,
        subtext: 'Enrolled cohorts',
        icon: 'school',
        iconBgClass: 'bg-indigo-50 border-indigo-100',
        iconColorClass: 'text-indigo-600'
      },
      {
        label: 'Total Enrolled',
        value: bat.reduce((acc, b) => acc + b.studentsCount, 0),
        subtext: 'Across all cohorts',
        icon: 'people',
        iconBgClass: 'bg-emerald-50 border-emerald-100',
        iconColorClass: 'text-emerald-600'
      }
    ];
  });

  protected readonly sectionTableColumns: TableColumn[] = [
    { key: 'section', header: 'Section', isBold: true },
    { key: 'course', header: 'Course Program' },
    { key: 'semester', header: 'Semester' },
    { key: 'classTeacher', header: 'Class Teacher' },
    { key: 'strengthDisplay', header: 'Strength / Capacity' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  protected readonly batchTableColumns: TableColumn[] = [
    { key: 'batchName', header: 'Batch', isBold: true, isMono: true },
    { key: 'course', header: 'Course Program' },
    { key: 'durationDisplay', header: 'Year Span' },
    { key: 'studentsCount', header: 'Students', align: 'center' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  protected readonly filteredSections = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const cFilter = this.selectedCourseFilter();
    return this.sectionsList()
      .filter(s => {
        if (cFilter !== 'All' && s.course !== cFilter) return false;
        if (q) {
          const match = `${s.section} ${s.course} ${s.classTeacher}`.toLowerCase();
          if (!match.includes(q)) return false;
        }
        return true;
      })
      .map(s => {
        const percent = Math.min(100, Math.round((s.currentStrength / s.capacity) * 100));
        return {
          ...s,
          strengthDisplay: `${s.currentStrength} / ${s.capacity} (${percent}%)`
        };
      });
  });

  protected readonly filteredBatches = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const cFilter = this.selectedCourseFilter();
    return this.batchesList()
      .filter(b => {
        if (cFilter !== 'All' && b.course !== cFilter) return false;
        if (q) {
          const match = `${b.batchName} ${b.course}`.toLowerCase();
          if (!match.includes(q)) return false;
        }
        return true;
      })
      .map(b => ({
        ...b,
        durationDisplay: `${b.startYear} – ${b.endYear}`
      }));
  });

  protected readonly hasActiveFilters = computed(() => {
    return this.searchQuery().trim() !== '' || this.selectedCourseFilter() !== 'All';
  });

  // Drawer states
  protected readonly isSectionDrawerOpen = signal<boolean>(false);
  protected readonly isBatchDrawerOpen = signal<boolean>(false);
  protected readonly isViewOnly = signal<boolean>(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formError = signal<string>('');

  // Section Form
  protected secFormName = '';
  protected secFormCourse = '';
  protected secFormSemester = 'Semester 2';
  protected secFormTeacher = '';
  protected secFormStrength = 50;
  protected secFormCapacity = 60;
  protected secFormStatus: 'Active' | 'Inactive' = 'Active';

  // Batch Form
  protected batchFormName = '';
  protected batchFormCourse = '';
  protected batchFormStartYear = 2025;
  protected batchFormEndYear = 2027;
  protected batchFormStudentsCount = 120;
  protected batchFormStatus: 'Active' | 'Inactive' = 'Active';

  protected readonly isDeleteDialogOpen = signal<boolean>(false);
  protected readonly deletingTarget = signal<{ type: 'section' | 'batch'; id: string; name: string } | null>(null);

  protected readonly deleteDialogMessage = computed(() => {
    const t = this.deletingTarget();
    if (!t) return '';
    return `Are you sure you want to delete ${t.name}?`;
  });

  protected readonly sectionDrawerTitle = computed(() => {
    if (this.isViewOnly()) return 'Section Details';
    return this.editingId() ? 'Edit Section' : 'Add Section';
  });

  protected readonly batchDrawerTitle = computed(() => {
    if (this.isViewOnly()) return 'Batch Details';
    return this.editingId() ? 'Edit Batch' : 'Add Batch';
  });

  protected onSearchChange(val: string): void { this.searchQuery.set(val); }
  protected onCourseFilterChange(val: string): void { this.selectedCourseFilter.set(val); }
  protected resetFilters(): void {
    this.searchQuery.set('');
    this.selectedCourseFilter.set('All');
  }

  protected openAddDrawer(): void {
    this.isViewOnly.set(false);
    this.editingId.set(null);
    this.formError.set('');
    const firstCourse = this.courseList()[0]?.name || '';

    if (this.activeTab() === 'sections') {
      this.secFormName = 'Section C';
      this.secFormCourse = firstCourse;
      this.secFormSemester = 'Semester 2';
      this.secFormTeacher = '';
      this.secFormStrength = 45;
      this.secFormCapacity = 60;
      this.secFormStatus = 'Active';
      this.isSectionDrawerOpen.set(true);
    } else {
      this.batchFormName = '2026-2028';
      this.batchFormCourse = firstCourse;
      this.batchFormStartYear = 2026;
      this.batchFormEndYear = 2028;
      this.batchFormStudentsCount = 120;
      this.batchFormStatus = 'Active';
      this.isBatchDrawerOpen.set(true);
    }
  }

  protected onViewSection(item: SectionRow): void {
    this.isViewOnly.set(true);
    this.editingId.set(item.id);
    this.formError.set('');
    this.secFormName = item.section;
    this.secFormCourse = item.course;
    this.secFormSemester = item.semester;
    this.secFormTeacher = item.classTeacher;
    this.secFormStrength = item.currentStrength;
    this.secFormCapacity = item.capacity;
    this.secFormStatus = item.status;
    this.isSectionDrawerOpen.set(true);
  }

  protected onEditSection(item: SectionRow): void {
    this.isViewOnly.set(false);
    this.editingId.set(item.id);
    this.formError.set('');
    this.secFormName = item.section;
    this.secFormCourse = item.course;
    this.secFormSemester = item.semester;
    this.secFormTeacher = item.classTeacher;
    this.secFormStrength = item.currentStrength;
    this.secFormCapacity = item.capacity;
    this.secFormStatus = item.status;
    this.isSectionDrawerOpen.set(true);
  }

  protected onDeleteSection(item: SectionRow): void {
    this.deletingTarget.set({ type: 'section', id: item.id, name: `${item.section} (${item.course})` });
    this.isDeleteDialogOpen.set(true);
  }

  protected onViewBatch(item: BatchRow): void {
    this.isViewOnly.set(true);
    this.editingId.set(item.id);
    this.formError.set('');
    this.batchFormName = item.batchName;
    this.batchFormCourse = item.course;
    this.batchFormStartYear = item.startYear;
    this.batchFormEndYear = item.endYear;
    this.batchFormStudentsCount = item.studentsCount;
    this.batchFormStatus = item.status;
    this.isBatchDrawerOpen.set(true);
  }

  protected onEditBatch(item: BatchRow): void {
    this.isViewOnly.set(false);
    this.editingId.set(item.id);
    this.formError.set('');
    this.batchFormName = item.batchName;
    this.batchFormCourse = item.course;
    this.batchFormStartYear = item.startYear;
    this.batchFormEndYear = item.endYear;
    this.batchFormStudentsCount = item.studentsCount;
    this.batchFormStatus = item.status;
    this.isBatchDrawerOpen.set(true);
  }

  protected onDeleteBatch(item: BatchRow): void {
    this.deletingTarget.set({ type: 'batch', id: item.id, name: `Batch ${item.batchName} (${item.course})` });
    this.isDeleteDialogOpen.set(true);
  }

  protected closeDrawer(): void {
    this.isSectionDrawerOpen.set(false);
    this.isBatchDrawerOpen.set(false);
    this.formError.set('');
  }

  protected handleSectionSave(): void {
    if (this.isViewOnly()) {
      this.closeDrawer();
      return;
    }
    if (!this.secFormName.trim() || !this.secFormCourse) {
      this.formError.set('Section name and course are required.');
      return;
    }

    const res = this.academicService.saveSection(
      {
        section: this.secFormName.trim(),
        course: this.secFormCourse,
        semester: this.secFormSemester,
        classTeacher: this.secFormTeacher,
        currentStrength: Number(this.secFormStrength) || 0,
        capacity: Number(this.secFormCapacity) || 60,
        status: this.secFormStatus
      },
      this.editingId() || undefined
    );

    if (!res.success) {
      this.formError.set(res.error || 'Failed to save section.');
      return;
    }
    this.closeDrawer();
  }

  protected handleBatchSave(): void {
    if (this.isViewOnly()) {
      this.closeDrawer();
      return;
    }
    if (!this.batchFormName.trim() || !this.batchFormCourse) {
      this.formError.set('Batch name and course are required.');
      return;
    }

    const res = this.academicService.saveBatch(
      {
        batchName: this.batchFormName.trim(),
        course: this.batchFormCourse,
        startYear: Number(this.batchFormStartYear) || 2025,
        endYear: Number(this.batchFormEndYear) || 2027,
        studentsCount: Number(this.batchFormStudentsCount) || 0,
        status: this.batchFormStatus
      },
      this.editingId() || undefined
    );

    if (!res.success) {
      this.formError.set(res.error || 'Failed to save batch.');
      return;
    }
    this.closeDrawer();
  }

  protected confirmDelete(): void {
    const t = this.deletingTarget();
    if (t) {
      if (t.type === 'section') {
        this.academicService.deleteSection(t.id);
      } else {
        this.academicService.deleteBatch(t.id);
      }
    }
    this.isDeleteDialogOpen.set(false);
  }
}
