import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AcademicService, SectionRecord, BatchRecord } from '../../../services/academic.service';
import { StudentsService } from '../../../services/students.service';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn, TableCustomAction } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

export interface SectionRow extends SectionRecord {
  strengthDisplay: string;
}

export interface BatchRow extends BatchRecord {
  durationDisplay: string;
  semesterDisplay: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-batches-sections-page',
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
          title="Sections & Batches"
          subtitle="Manage classroom sections, seating capacities, student section transfers, and cohort batch rollovers."
          [actionLabel]="activeTab() === 'sections' ? 'Add Section' : 'Add Batch'"
          [actionIcon]="activeTab() === 'sections' ? 'group_work' : 'school'"
          (actionClicked)="openAddDrawer()"
        />
        <div class="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            (click)="openTransferDrawer()"
            class="h-10 px-3.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <span class="material-icons text-sm">swap_horiz</span>
            <span>Transfer Section</span>
          </button>
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

      <div class="flex flex-col gap-5">
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
            [customActions]="batchCustomActions"
            emptyIcon="school"
            emptyTitle="No batches found"
            emptyMessage="Try adjusting search or course filter."
            emptyActionLabel="Clear filters"
            (emptyActionClicked)="resetFilters()"
            (viewClicked)="onViewBatch($event)"
            (editClicked)="onEditBatch($event)"
            (deleteClicked)="onDeleteBatch($event)"
            (customActionClicked)="handleBatchAction($event)"
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
        <form [formGroup]="sectionForm" class="space-y-4">
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
              formControlName="section"
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
              formControlName="course"
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
              formControlName="semester"
              placeholder="e.g. Semester 2"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div class="space-y-1.5">
            <label for="sec-teacher-input" class="block text-xs font-semibold text-slate-800">Class Teacher</label>
            <input
              id="sec-teacher-input"
              type="text"
              formControlName="classTeacher"
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
                formControlName="currentStrength"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <div class="space-y-1.5">
              <label for="sec-capacity-input" class="block text-xs font-semibold text-slate-800">Max Capacity</label>
              <input
                id="sec-capacity-input"
                type="number"
                min="10"
                formControlName="capacity"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="sec-status-select" class="block text-xs font-semibold text-slate-800">Status</label>
            <select
              id="sec-status-select"
              formControlName="status"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </form>
      </app-form-drawer>

      <!-- Slide-in Form Drawer for Batches -->
      <app-form-drawer
        [isOpen]="isBatchDrawerOpen()"
        [title]="batchDrawerTitle()"
        subtitle="Manage student cohort batches, semester progress, and year range."
        [saveLabel]="isViewOnly() ? 'Close' : (editingId() ? 'Update Batch' : 'Save Batch')"
        (closed)="closeDrawer()"
        (saved)="handleBatchSave()"
      >
        <form [formGroup]="batchForm" class="space-y-4">
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
              formControlName="batchName"
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
              formControlName="course"
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
                formControlName="startYear"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <div class="space-y-1.5">
              <label for="batch-end-year" class="block text-xs font-semibold text-slate-800">End Year</label>
              <input
                id="batch-end-year"
                type="number"
                formControlName="endYear"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label for="batch-sem-input" class="block text-xs font-semibold text-slate-800">Current Semester</label>
              <input
                id="batch-sem-input"
                type="text"
                formControlName="currentSemester"
                placeholder="e.g. Semester 2"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <div class="space-y-1.5">
              <label for="batch-students-count" class="block text-xs font-semibold text-slate-800">Enrolled Students</label>
              <input
                id="batch-students-count"
                type="number"
                min="0"
                formControlName="studentsCount"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="batch-status-select" class="block text-xs font-semibold text-slate-800">Status</label>
            <select
              id="batch-status-select"
              formControlName="status"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </form>
      </app-form-drawer>

      <!-- Transfer Student Section Drawer -->
      <app-form-drawer
        [isOpen]="isTransferDrawerOpen()"
        title="Transfer Student Section"
        subtitle="Move selected students between sections with live seating capacity validation."
        saveLabel="Confirm Transfer"
        widthClass="max-w-[540px]"
        (closed)="isTransferDrawerOpen.set(false)"
        (saved)="confirmSectionTransfer()"
      >
        <div class="space-y-4">
          @if (transferError()) {
            <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <span class="material-icons text-base text-red-600 shrink-0">error_outline</span>
              <span>{{ transferError() }}</span>
            </div>
          }

          <form [formGroup]="transferForm" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label for="tr-course" class="block text-xs font-semibold text-slate-800">Filter by Course</label>
              <select
                id="tr-course"
                formControlName="course"
                (change)="onTransferCourseChange($event)"
                class="w-full h-10 px-3 text-xs bg-white border border-[#E2E8F0] rounded-xl text-slate-900"
              >
                <option value="">All Courses</option>
                @for (c of courseList(); track c.id) {
                  <option [value]="c.name">{{ c.name }}</option>
                }
              </select>
            </div>
            <div class="space-y-1.5">
              <label for="tr-section" class="block text-xs font-semibold text-slate-800">Target Section <span class="text-red-500">*</span></label>
              <select
                id="tr-section"
                formControlName="targetSection"
                class="w-full h-10 px-3 text-xs bg-white border border-[#E2E8F0] rounded-xl text-slate-900"
              >
                <option value="Section A">Section A</option>
                <option value="Section B">Section B</option>
                <option value="Section C">Section C</option>
              </select>
            </div>
          </form>

          @if (targetSectionCapacityInfo(); as cap) {
            <div class="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-900 flex items-center justify-between">
              <span class="font-semibold">{{ cap.section }} ({{ cap.course }}) Capacity:</span>
              <span class="font-mono font-bold">{{ cap.currentStrength }} / {{ cap.capacity }} filled</span>
            </div>
          }

          <div class="flex items-center justify-between text-xs pt-1">
            <span class="font-semibold text-slate-700">
              Select Students ({{ selectedTransferIds().length }} selected)
            </span>
            <button
              type="button"
              (click)="toggleSelectAllTransferStudents()"
              class="text-indigo-600 font-semibold hover:underline cursor-pointer"
            >
              {{ selectedTransferIds().length === transferCandidateStudents().length && transferCandidateStudents().length > 0 ? 'Clear Selection' : 'Select All Visible' }}
            </button>
          </div>

          <div class="max-h-64 overflow-y-auto space-y-1.5 p-2 bg-slate-50 border border-[#E2E8F0] rounded-xl">
            @for (st of transferCandidateStudents(); track st.id) {
              <label class="flex items-center justify-between p-2.5 bg-white rounded-lg border border-[#E2E8F0] hover:border-indigo-300 cursor-pointer text-xs">
                <div class="flex items-center gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    [checked]="selectedTransferIds().includes(st.id)"
                    (change)="toggleTransferStudent(st.id)"
                    class="w-4 h-4 rounded text-indigo-600 border-slate-300 cursor-pointer"
                  />
                  <div class="min-w-0">
                    <p class="font-bold text-slate-900 truncate">{{ st.name }}</p>
                    <p class="text-[11px] text-slate-500 font-mono truncate">{{ st.enrollmentNo }} • {{ st.course }}</p>
                  </div>
                </div>
                <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold shrink-0">
                  {{ st.section }}
                </span>
              </label>
            } @empty {
              <p class="py-6 text-center text-xs text-slate-500">No students match the selected course.</p>
            }
          </div>
        </div>
      </app-form-drawer>

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
  private readonly studentsService = inject(StudentsService);

  protected readonly activeTab = signal<'sections' | 'batches'>('sections');
  protected readonly searchQuery = signal<string>('');
  protected readonly selectedCourseFilter = signal<string>('All');
  protected readonly bannerMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  protected readonly courseList = computed(() => this.academicService.courses());
  protected readonly sectionsList = computed(() => this.academicService.sections());
  protected readonly batchesList = computed(() => this.academicService.batches());

  protected readonly courseFilterOptions = computed<FilterOption[]>(() => [
    { label: 'Course: All', value: 'All' },
    ...this.courseList().map(c => ({ label: c.name, value: c.name }))
  ]);

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
    { key: 'semesterDisplay', header: 'Progress' },
    { key: 'studentsCount', header: 'Students', align: 'center' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  protected readonly batchCustomActions: TableCustomAction<BatchRow>[] = [
    {
      id: 'rollover',
      label: 'Promote / Rollover Semester',
      icon: 'trending_up',
      showIf: row => row.status === 'Active'
    }
  ];

  protected readonly filteredSections = computed<SectionRow[]>(() => {
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
        const percent = Math.min(100, Math.round((s.currentStrength / Math.max(1, s.capacity)) * 100));
        return {
          ...s,
          strengthDisplay: `${s.currentStrength} / ${s.capacity} (${percent}%)`
        };
      });
  });

  protected readonly filteredBatches = computed<BatchRow[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const cFilter = this.selectedCourseFilter();
    return this.batchesList()
      .filter(b => {
        if (cFilter !== 'All' && b.course !== cFilter) return false;
        if (q) {
          const match = `${b.batchName} ${b.course} ${b.currentSemester || ''}`.toLowerCase();
          if (!match.includes(q)) return false;
        }
        return true;
      })
      .map(b => ({
        ...b,
        durationDisplay: `${b.startYear} – ${b.endYear}`,
        semesterDisplay: b.currentSemester || 'Semester 1'
      }));
  });

  protected readonly hasActiveFilters = computed(() => {
    return this.searchQuery().trim() !== '' || this.selectedCourseFilter() !== 'All';
  });

  protected readonly isSectionDrawerOpen = signal<boolean>(false);
  protected readonly isBatchDrawerOpen = signal<boolean>(false);
  protected readonly isViewOnly = signal<boolean>(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formError = signal<string>('');

  protected readonly sectionForm = new FormGroup({
    section: new FormControl('Section A', { nonNullable: true, validators: [Validators.required] }),
    course: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    semester: new FormControl('Semester 2', { nonNullable: true }),
    classTeacher: new FormControl('', { nonNullable: true }),
    currentStrength: new FormControl<number>(45, { nonNullable: true }),
    capacity: new FormControl<number>(60, { nonNullable: true }),
    status: new FormControl<'Active' | 'Inactive'>('Active', { nonNullable: true })
  });

  protected readonly batchForm = new FormGroup({
    batchName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    course: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    startYear: new FormControl<number>(2025, { nonNullable: true }),
    endYear: new FormControl<number>(2027, { nonNullable: true }),
    currentSemester: new FormControl('Semester 1', { nonNullable: true }),
    studentsCount: new FormControl<number>(120, { nonNullable: true }),
    status: new FormControl<'Active' | 'Inactive'>('Active', { nonNullable: true })
  });

  protected readonly isTransferDrawerOpen = signal<boolean>(false);
  protected readonly transferCourseFilter = signal<string>('');
  protected readonly selectedTransferIds = signal<string[]>([]);
  protected readonly transferError = signal<string>('');
  protected readonly transferForm = new FormGroup({
    course: new FormControl('', { nonNullable: true }),
    targetSection: new FormControl('Section B', { nonNullable: true })
  });

  protected readonly transferCandidateStudents = computed(() => {
    const course = this.transferCourseFilter();
    return this.studentsService.students().filter(s => !course || s.course === course);
  });

  protected readonly targetSectionCapacityInfo = computed(() => {
    const course = this.transferCourseFilter();
    const targetSec = this.transferForm.controls.targetSection.value;
    if (!course) return null;
    return this.sectionsList().find(s => s.course === course && s.section === targetSec) || null;
  });

  protected readonly isDeleteDialogOpen = signal<boolean>(false);
  protected readonly deletingTarget = signal<{ type: 'section' | 'batch'; id: string; name: string } | null>(null);

  protected readonly deleteDialogMessage = computed(() => {
    const t = this.deletingTarget();
    return t ? `Are you sure you want to delete ${t.name}?` : '';
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

  private syncFormsDisabledState(disabled: boolean): void {
    if (disabled) {
      this.sectionForm.disable({ emitEvent: false });
      this.batchForm.disable({ emitEvent: false });
    } else {
      this.sectionForm.enable({ emitEvent: false });
      this.batchForm.enable({ emitEvent: false });
    }
  }

  protected openAddDrawer(): void {
    this.isViewOnly.set(false);
    this.editingId.set(null);
    this.formError.set('');
    this.syncFormsDisabledState(false);
    const firstCourse = this.courseList()[0]?.name || '';

    if (this.activeTab() === 'sections') {
      this.sectionForm.reset({
        section: 'Section C',
        course: firstCourse,
        semester: 'Semester 2',
        classTeacher: '',
        currentStrength: 45,
        capacity: 60,
        status: 'Active'
      });
      this.isSectionDrawerOpen.set(true);
    } else {
      this.batchForm.reset({
        batchName: '2026-2028',
        course: firstCourse,
        startYear: 2026,
        endYear: 2028,
        currentSemester: 'Semester 1',
        studentsCount: 120,
        status: 'Active'
      });
      this.isBatchDrawerOpen.set(true);
    }
  }

  protected onViewSection(item: SectionRow): void {
    this.isViewOnly.set(true);
    this.editingId.set(item.id);
    this.formError.set('');
    this.sectionForm.reset({
      section: item.section,
      course: item.course,
      semester: item.semester,
      classTeacher: item.classTeacher,
      currentStrength: item.currentStrength,
      capacity: item.capacity,
      status: item.status
    });
    this.syncFormsDisabledState(true);
    this.isSectionDrawerOpen.set(true);
  }

  protected onEditSection(item: SectionRow): void {
    this.isViewOnly.set(false);
    this.editingId.set(item.id);
    this.formError.set('');
    this.syncFormsDisabledState(false);
    this.sectionForm.reset({
      section: item.section,
      course: item.course,
      semester: item.semester,
      classTeacher: item.classTeacher,
      currentStrength: item.currentStrength,
      capacity: item.capacity,
      status: item.status
    });
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
    this.batchForm.reset({
      batchName: item.batchName,
      course: item.course,
      startYear: item.startYear,
      endYear: item.endYear,
      currentSemester: item.currentSemester || 'Semester 1',
      studentsCount: item.studentsCount,
      status: item.status
    });
    this.syncFormsDisabledState(true);
    this.isBatchDrawerOpen.set(true);
  }

  protected onEditBatch(item: BatchRow): void {
    this.isViewOnly.set(false);
    this.editingId.set(item.id);
    this.formError.set('');
    this.syncFormsDisabledState(false);
    this.batchForm.reset({
      batchName: item.batchName,
      course: item.course,
      startYear: item.startYear,
      endYear: item.endYear,
      currentSemester: item.currentSemester || 'Semester 1',
      studentsCount: item.studentsCount,
      status: item.status
    });
    this.isBatchDrawerOpen.set(true);
  }

  protected onDeleteBatch(item: BatchRow): void {
    this.deletingTarget.set({ type: 'batch', id: item.id, name: `Batch ${item.batchName} (${item.course})` });
    this.isDeleteDialogOpen.set(true);
  }

  protected handleBatchAction(event: { actionId: string; row: BatchRow }): void {
    if (event.actionId === 'rollover') {
      const res = this.academicService.rolloverBatchToNextYear(event.row.id);
      this.bannerMessage.set(
        res.success
          ? { type: 'success', text: res.message || `Batch ${event.row.batchName} rolled over.` }
          : { type: 'error', text: res.error || 'Batch rollover failed.' }
      );
    }
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
    const val = this.sectionForm.getRawValue();
    if (!val.section.trim() || !val.course) {
      this.formError.set('Section name and course are required.');
      return;
    }

    const res = this.academicService.saveSection(
      {
        section: val.section.trim(),
        course: val.course,
        semester: val.semester.trim(),
        classTeacher: val.classTeacher.trim(),
        currentStrength: Number(val.currentStrength) || 0,
        capacity: Number(val.capacity) || 60,
        status: val.status
      },
      this.editingId() || undefined
    );

    if (!res.success) {
      this.formError.set(res.error || 'Failed to save section.');
      return;
    }
    this.bannerMessage.set({ type: 'success', text: `${val.section.trim()} (${val.course}) saved.` });
    this.closeDrawer();
  }

  protected handleBatchSave(): void {
    if (this.isViewOnly()) {
      this.closeDrawer();
      return;
    }
    const val = this.batchForm.getRawValue();
    if (!val.batchName.trim() || !val.course) {
      this.formError.set('Batch name and course are required.');
      return;
    }

    const res = this.academicService.saveBatch(
      {
        batchName: val.batchName.trim(),
        course: val.course,
        startYear: Number(val.startYear) || 2025,
        endYear: Number(val.endYear) || 2027,
        currentSemester: val.currentSemester.trim() || 'Semester 1',
        studentsCount: Number(val.studentsCount) || 0,
        status: val.status
      },
      this.editingId() || undefined
    );

    if (!res.success) {
      this.formError.set(res.error || 'Failed to save batch.');
      return;
    }
    this.bannerMessage.set({ type: 'success', text: `Batch ${val.batchName.trim()} saved.` });
    this.closeDrawer();
  }

  protected openTransferDrawer(): void {
    this.transferError.set('');
    const firstCourse = this.courseList()[0]?.name || '';
    this.transferForm.reset({ course: firstCourse, targetSection: 'Section B' });
    this.transferCourseFilter.set(firstCourse);
    this.selectedTransferIds.set([]);
    this.isTransferDrawerOpen.set(true);
  }

  protected onTransferCourseChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.transferCourseFilter.set(val);
    this.selectedTransferIds.set([]);
  }

  protected toggleTransferStudent(id: string): void {
    const curr = this.selectedTransferIds();
    this.selectedTransferIds.set(curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id]);
  }

  protected toggleSelectAllTransferStudents(): void {
    const visible = this.transferCandidateStudents().map(s => s.id);
    if (visible.length > 0 && this.selectedTransferIds().length === visible.length) {
      this.selectedTransferIds.set([]);
    } else {
      this.selectedTransferIds.set(visible);
    }
  }

  protected confirmSectionTransfer(): void {
    this.transferError.set('');
    const targetSec = this.transferForm.controls.targetSection.value;
    const res = this.studentsService.transferStudentsSection(this.selectedTransferIds(), targetSec);
    if (!res.success) {
      this.transferError.set(res.error || 'Section transfer failed.');
      return;
    }
    this.isTransferDrawerOpen.set(false);
    this.bannerMessage.set({
      type: 'success',
      text: `Transferred ${res.count} student(s) to ${targetSec}.`
    });
  }

  protected confirmDelete(): void {
    const t = this.deletingTarget();
    if (t) {
      if (t.type === 'section') this.academicService.deleteSection(t.id);
      else this.academicService.deleteBatch(t.id);
      this.bannerMessage.set({ type: 'success', text: `${t.name} deleted.` });
    }
    this.isDeleteDialogOpen.set(false);
  }

  protected exportExcel(): void {
    if (this.activeTab() === 'sections') {
      exportToExcel(
        this.filteredSections().map(s => ({
          Section: s.section,
          Course: s.course,
          Semester: s.semester,
          'Class Teacher': s.classTeacher,
          Strength: s.currentStrength,
          Capacity: s.capacity,
          Status: s.status
        })),
        'EduERP_Sections'
      );
    } else {
      exportToExcel(
        this.filteredBatches().map(b => ({
          Batch: b.batchName,
          Course: b.course,
          'Year Span': b.durationDisplay,
          'Current Semester': b.semesterDisplay,
          Students: b.studentsCount,
          Status: b.status
        })),
        'EduERP_Batches'
      );
    }
  }

  protected exportPdf(): void {
    if (this.activeTab() === 'sections') {
      exportToPdf(
        'Classroom Sections & Seating Capacity',
        ['Section', 'Course Program', 'Semester', 'Class Teacher', 'Strength / Capacity', 'Status'],
        this.filteredSections().map(s => [s.section, s.course, s.semester, s.classTeacher, s.strengthDisplay, s.status]),
        'EduERP_Sections'
      );
    } else {
      exportToPdf(
        'Institutional Student Cohort Batches',
        ['Batch', 'Course Program', 'Year Span', 'Current Semester', 'Students', 'Status'],
        this.filteredBatches().map(b => [b.batchName, b.course, b.durationDisplay, b.semesterDisplay, b.studentsCount, b.status]),
        'EduERP_Batches'
      );
    }
  }
}
