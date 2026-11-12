import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AcademicService, SubjectRecord } from '../../../services/academic.service';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-subjects-page',
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
        title="Subjects"
        subtitle="Manage course syllabi, curriculum codes, credit units, and classification types."
        actionLabel="Add Subject"
        (actionClicked)="openAddDrawer()"
      />

      <!-- 2. Stat Strip -->
      <app-stat-strip [items]="statItems()" />

      <!-- 3. Data Toolbar (Search + Course Filter + Semester Filter + Type Filter) -->
      <app-data-toolbar
        [searchValue]="searchQuery()"
        searchPlaceholder="Search by subject name or code..."
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

      <!-- 4. Data Table Card -->
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

      <!-- Slide-in Form Drawer -->
      <app-form-drawer
        [isOpen]="isDrawerOpen()"
        [title]="drawerTitle()"
        [subtitle]="drawerSubtitle()"
        [saveLabel]="isViewOnly() ? 'Close' : (editingId() ? 'Update Subject' : 'Save Subject')"
        (closed)="closeDrawer()"
        (saved)="handleDrawerSave()"
      >
        <div class="space-y-4">
          @if (formError()) {
            <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <span class="material-icons text-base text-red-600 shrink-0">error_outline</span>
              <span>{{ formError() }}</span>
            </div>
          }

          <!-- Subject Code -->
          <div class="space-y-1.5">
            <label for="sub-code-input" class="block text-xs font-semibold text-slate-800">
              Subject Code <span class="text-red-500">*</span>
            </label>
            <input
              id="sub-code-input"
              type="text"
              [disabled]="isViewOnly()"
              [(ngModel)]="formCode"
              placeholder="e.g. MCA-201"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 uppercase focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <!-- Subject Name -->
          <div class="space-y-1.5">
            <label for="sub-name-input" class="block text-xs font-semibold text-slate-800">
              Subject Name <span class="text-red-500">*</span>
            </label>
            <input
              id="sub-name-input"
              type="text"
              [disabled]="isViewOnly()"
              [(ngModel)]="formName"
              placeholder="e.g. Advanced Data Structures"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <!-- Course Dropdown -->
          <div class="space-y-1.5">
            <label for="sub-course-select" class="block text-xs font-semibold text-slate-800">
              Course / Program <span class="text-red-500">*</span>
            </label>
            <select
              id="sub-course-select"
              [disabled]="isViewOnly()"
              [(ngModel)]="formCourse"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
              @for (c of courseList(); track c.id) {
                <option [value]="c.name">{{ c.name }}</option>
              }
            </select>
          </div>

          <!-- Semester -->
          <div class="space-y-1.5">
            <label for="sub-semester-input" class="block text-xs font-semibold text-slate-800">Semester</label>
            <input
              id="sub-semester-input"
              type="text"
              [disabled]="isViewOnly()"
              [(ngModel)]="formSemester"
              placeholder="e.g. Semester 2"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <!-- Type & Credits Row -->
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label for="sub-type-select" class="block text-xs font-semibold text-slate-800">Subject Type</label>
              <select
                id="sub-type-select"
                [disabled]="isViewOnly()"
                [(ngModel)]="formType"
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
                [disabled]="isViewOnly()"
                [(ngModel)]="formCredits"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <!-- Status -->
          <div class="space-y-1.5">
            <label for="sub-status-select" class="block text-xs font-semibold text-slate-800">Status</label>
            <select
              id="sub-status-select"
              [disabled]="isViewOnly()"
              [(ngModel)]="formStatus"
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

  protected readonly courseList = computed(() => this.academicService.courses());
  protected readonly subjectsList = computed(() => this.academicService.subjects());

  protected readonly courseFilterOptions = computed<FilterOption[]>(() => {
    return [
      { label: 'Course: All', value: 'All' },
      ...this.courseList().map(c => ({ label: c.name, value: c.name }))
    ];
  });

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

  protected readonly filteredSubjects = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const c = this.selectedCourse();
    const t = this.selectedType();
    return this.subjectsList()
      .filter(s => {
        if (c !== 'All' && s.course !== c) return false;
        if (t !== 'All' && s.type !== t) return false;
        if (q) {
          const match = `${s.code} ${s.name} ${s.course}`.toLowerCase();
          if (!match.includes(q)) return false;
        }
        return true;
      })
      .map(s => ({
        ...s,
        creditsDisplay: `${s.credits} Credits`
      }));
  });

  protected readonly hasActiveFilters = computed(() => {
    return this.searchQuery().trim() !== '' || this.selectedCourse() !== 'All' || this.selectedType() !== 'All';
  });

  protected readonly isDrawerOpen = signal<boolean>(false);
  protected readonly isViewOnly = signal<boolean>(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formError = signal<string>('');

  protected formCode = '';
  protected formName = '';
  protected formCourse = '';
  protected formSemester = 'Semester 2';
  protected formType: 'Theory' | 'Practical' | 'Elective' = 'Theory';
  protected formCredits = 4;
  protected formStatus: 'Active' | 'Inactive' = 'Active';

  protected readonly isDeleteDialogOpen = signal<boolean>(false);
  protected readonly deletingItem = signal<SubjectRecord | null>(null);
  protected readonly deleteDialogMessage = computed(() => {
    const item = this.deletingItem();
    if (!item) return '';
    return `Are you sure you want to delete ${item.name} (${item.code})?`;
  });

  protected readonly drawerTitle = computed(() => {
    if (this.isViewOnly()) return 'Subject Details';
    return this.editingId() ? 'Edit Subject' : 'Add Subject';
  });

  protected readonly drawerSubtitle = computed(() => {
    if (this.isViewOnly()) return 'View curriculum syllabus and credits.';
    return 'Enter subject code, name, and classification.';
  });

  protected onSearchChange(val: string): void { this.searchQuery.set(val); }
  protected onCourseFilterChange(val: string): void { this.selectedCourse.set(val); }
  protected onTypeFilterChange(val: string): void { this.selectedType.set(val); }
  protected resetFilters(): void {
    this.searchQuery.set('');
    this.selectedCourse.set('All');
    this.selectedType.set('All');
  }

  protected openAddDrawer(): void {
    this.isViewOnly.set(false);
    this.editingId.set(null);
    this.formError.set('');
    this.formCode = '';
    this.formName = '';
    this.formCourse = this.courseList()[0]?.name || '';
    this.formSemester = 'Semester 2';
    this.formType = 'Theory';
    this.formCredits = 4;
    this.formStatus = 'Active';
    this.isDrawerOpen.set(true);
  }

  protected onViewRecord(item: SubjectRecord): void {
    this.isViewOnly.set(true);
    this.editingId.set(item.id);
    this.formError.set('');
    this.formCode = item.code;
    this.formName = item.name;
    this.formCourse = item.course;
    this.formSemester = item.semester;
    this.formType = item.type;
    this.formCredits = item.credits;
    this.formStatus = item.status;
    this.isDrawerOpen.set(true);
  }

  protected onEditRecord(item: SubjectRecord): void {
    this.isViewOnly.set(false);
    this.editingId.set(item.id);
    this.formError.set('');
    this.formCode = item.code;
    this.formName = item.name;
    this.formCourse = item.course;
    this.formSemester = item.semester;
    this.formType = item.type;
    this.formCredits = item.credits;
    this.formStatus = item.status;
    this.isDrawerOpen.set(true);
  }

  protected onDeleteRecord(item: SubjectRecord): void {
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
    if (!this.formCode.trim() || !this.formName.trim() || !this.formCourse) {
      this.formError.set('Subject code, name, and course are required.');
      return;
    }

    const res = this.academicService.saveSubject(
      {
        code: this.formCode.trim().toUpperCase(),
        name: this.formName.trim(),
        course: this.formCourse,
        semester: this.formSemester,
        type: this.formType,
        credits: Number(this.formCredits) || 4,
        status: this.formStatus
      },
      this.editingId() || undefined
    );

    if (!res.success) {
      this.formError.set(res.error || 'Failed to save subject.');
      return;
    }
    this.closeDrawer();
  }

  protected confirmDelete(): void {
    const item = this.deletingItem();
    if (item) {
      this.academicService.deleteSubject(item.id);
    }
    this.isDeleteDialogOpen.set(false);
  }
}
