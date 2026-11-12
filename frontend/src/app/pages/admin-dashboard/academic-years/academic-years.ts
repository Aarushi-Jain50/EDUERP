import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AcademicService, AcademicYear } from '../../../services/academic.service';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';

export interface AcademicYearRow extends AcademicYear {
  formattedStartDate: string;
  formattedEndDate: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-academic-years',
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
        title="Academic Years"
        subtitle="Manage university academic sessions, term durations, and calendar boundaries."
        actionLabel="Add Academic Year"
        (actionClicked)="openAddDrawer()"
      />

      <!-- 2. Stat Strip (Max 3 small cards) -->
      <app-stat-strip [items]="statItems()" />

      <!-- 3. Data Toolbar (Search + Status Filter) -->
      <app-data-toolbar
        [searchValue]="searchQuery()"
        searchPlaceholder="Search academic year sessions..."
        [filter1Value]="statusFilter()"
        [filter1Options]="statusFilterOptions"
        [hasActiveFilters]="hasActiveFilters()"
        (searchChange)="onSearchChange($event)"
        (filter1Change)="onStatusFilterChange($event)"
        (resetClicked)="resetFilters()"
      />

      <!-- 4. Data Table Card -->
      <app-data-table
        [columns]="tableColumns"
        [data]="filteredYears()"
        idKey="id"
        emptyIcon="calendar_today"
        emptyTitle="No academic years found"
        emptyMessage="Try adjusting your search query or status filter to see sessions."
        emptyActionLabel="Clear filters"
        (emptyActionClicked)="resetFilters()"
        (viewClicked)="onViewRecord($event)"
        (editClicked)="onEditRecord($event)"
        (deleteClicked)="onDeleteRecord($event)"
      />

      <!-- Slide-in Form Drawer for Add / Edit / View -->
      <app-form-drawer
        [isOpen]="isDrawerOpen()"
        [title]="drawerTitle()"
        [subtitle]="drawerSubtitle()"
        [saveLabel]="isViewOnly() ? 'Close' : (editingId() ? 'Update Session' : 'Save Session')"
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

          <!-- Academic Year Session Input -->
          <div class="space-y-1.5">
            <label for="ay-year-input" class="block text-xs font-semibold text-slate-800">
              Academic Year <span class="text-red-500">*</span>
            </label>
            <input
              id="ay-year-input"
              type="text"
              [disabled]="isViewOnly()"
              [(ngModel)]="formYear"
              placeholder="e.g. 2026-27"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 placeholder-[#64748B] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
            <p class="text-[11px] text-[#64748B]">Format: YYYY-YY (e.g. 2025-26)</p>
          </div>

          <!-- Start Date -->
          <div class="space-y-1.5">
            <label for="ay-start-date" class="block text-xs font-semibold text-slate-800">
              Start Date <span class="text-red-500">*</span>
            </label>
            <input
              id="ay-start-date"
              type="date"
              [disabled]="isViewOnly()"
              [(ngModel)]="formStartDate"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <!-- End Date -->
          <div class="space-y-1.5">
            <label for="ay-end-date" class="block text-xs font-semibold text-slate-800">
              End Date <span class="text-red-500">*</span>
            </label>
            <input
              id="ay-end-date"
              type="date"
              [disabled]="isViewOnly()"
              [(ngModel)]="formEndDate"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <!-- Status Dropdown -->
          <div class="space-y-1.5">
            <label for="ay-status-select" class="block text-xs font-semibold text-slate-800">
              Status <span class="text-red-500">*</span>
            </label>
            <select
              id="ay-status-select"
              [disabled]="isViewOnly()"
              [(ngModel)]="formStatus"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="Active">Active (Current Session)</option>
              <option value="Upcoming">Upcoming (Future Planning)</option>
              <option value="Completed">Completed (Archived)</option>
            </select>
            <p class="text-[11px] text-[#64748B]">
              Note: Marking this session Active will automatically archive any other active year.
            </p>
          </div>

          <!-- Notes Input -->
          <div class="space-y-1.5">
            <label for="ay-notes-textarea" class="block text-xs font-semibold text-slate-800">Session Remarks / Description</label>
            <textarea
              id="ay-notes-textarea"
              rows="3"
              [disabled]="isViewOnly()"
              [(ngModel)]="formNotes"
              placeholder="e.g. Semester examinations and convocation window details..."
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 placeholder-[#64748B] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 resize-none"
            ></textarea>
          </div>
        </div>
      </app-form-drawer>

      <!-- Delete Confirmation Dialog -->
      <app-confirm-dialog
        [isOpen]="isDeleteDialogOpen()"
        title="Delete Academic Year"
        [message]="deleteDialogMessage()"
        confirmLabel="Confirm Delete"
        (cancelled)="isDeleteDialogOpen.set(false)"
        (confirmed)="confirmDelete()"
      />

    </div>
  `
})
export class AcademicYearsPage {
  private readonly academicService = inject(AcademicService);

  protected readonly searchQuery = signal<string>('');
  protected readonly statusFilter = signal<string>('All');

  protected readonly statusFilterOptions: FilterOption[] = [
    { label: 'Status: All', value: 'All' },
    { label: 'Active', value: 'Active' },
    { label: 'Upcoming', value: 'Upcoming' },
    { label: 'Completed', value: 'Completed' }
  ];

  // Table Columns Definition
  protected readonly tableColumns: TableColumn[] = [
    { key: 'year', header: 'Academic Year', isBold: true, isMono: true },
    { key: 'formattedStartDate', header: 'Start Date' },
    { key: 'formattedEndDate', header: 'End Date' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  // Stats
  protected readonly statItems = computed<StatItem[]>(() => {
    const stats = this.academicService.academicYearStats();
    return [
      {
        label: 'Total Academic Years',
        value: stats.total,
        subtext: 'Configured in ERP system',
        icon: 'calendar_month',
        iconBgClass: 'bg-indigo-50 border-indigo-100',
        iconColorClass: 'text-indigo-600'
      },
      {
        label: 'Current Active Year',
        value: stats.current,
        subtext: 'Current enrollment & grading',
        icon: 'verified',
        iconBgClass: 'bg-emerald-50 border-emerald-100',
        iconColorClass: 'text-emerald-600'
      },
      {
        label: 'Upcoming Sessions',
        value: stats.upcoming,
        subtext: 'Prepared for scheduling',
        icon: 'schedule',
        iconBgClass: 'bg-blue-50 border-blue-100',
        iconColorClass: 'text-blue-600'
      }
    ];
  });

  // Filtered Years
  protected readonly filteredYears = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    const rawList = this.academicService.academicYears();

    return rawList
      .filter(item => {
        if (status !== 'All' && item.status !== status) return false;
        if (query) {
          const match = `${item.year} ${item.notes || ''} ${item.startDate} ${item.endDate}`.toLowerCase();
          if (!match.includes(query)) return false;
        }
        return true;
      })
      .map(item => ({
        ...item,
        formattedStartDate: this.formatDate(item.startDate),
        formattedEndDate: this.formatDate(item.endDate)
      }));
  });

  protected readonly hasActiveFilters = computed(() => {
    return this.searchQuery().trim() !== '' || this.statusFilter() !== 'All';
  });

  // Drawer & Form State
  protected readonly isDrawerOpen = signal<boolean>(false);
  protected readonly isViewOnly = signal<boolean>(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formError = signal<string>('');

  protected formYear = '';
  protected formStartDate = '';
  protected formEndDate = '';
  protected formStatus: 'Active' | 'Upcoming' | 'Completed' = 'Upcoming';
  protected formNotes = '';

  // Delete State
  protected readonly isDeleteDialogOpen = signal<boolean>(false);
  protected readonly deletingItem = signal<AcademicYear | null>(null);
  protected readonly deleteDialogMessage = computed(() => {
    const item = this.deletingItem();
    if (!item) return '';
    return `Are you sure you want to delete session ${item.year}? This action cannot be undone.`;
  });

  protected readonly drawerTitle = computed(() => {
    if (this.isViewOnly()) return 'Session Details';
    return this.editingId() ? 'Edit Academic Year' : 'Add Academic Year';
  });

  protected readonly drawerSubtitle = computed(() => {
    if (this.isViewOnly()) return 'View configured institutional session boundaries.';
    return 'Configure term start and end milestones.';
  });

  protected onSearchChange(val: string): void {
    this.searchQuery.set(val);
  }

  protected onStatusFilterChange(val: string): void {
    this.statusFilter.set(val);
  }

  protected resetFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('All');
  }

  protected openAddDrawer(): void {
    this.isViewOnly.set(false);
    this.editingId.set(null);
    this.formError.set('');
    this.formYear = '';
    this.formStartDate = '';
    this.formEndDate = '';
    this.formStatus = 'Upcoming';
    this.formNotes = '';
    this.isDrawerOpen.set(true);
  }

  protected onViewRecord(item: AcademicYearRow): void {
    this.isViewOnly.set(true);
    this.editingId.set(item.id);
    this.formError.set('');
    this.formYear = item.year;
    this.formStartDate = item.startDate;
    this.formEndDate = item.endDate;
    this.formStatus = item.status;
    this.formNotes = item.notes || '';
    this.isDrawerOpen.set(true);
  }

  protected onEditRecord(item: AcademicYearRow): void {
    this.isViewOnly.set(false);
    this.editingId.set(item.id);
    this.formError.set('');
    this.formYear = item.year;
    this.formStartDate = item.startDate;
    this.formEndDate = item.endDate;
    this.formStatus = item.status;
    this.formNotes = item.notes || '';
    this.isDrawerOpen.set(true);
  }

  protected onDeleteRecord(item: AcademicYearRow): void {
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

    // Validation
    if (!this.formYear.trim()) {
      this.formError.set('Academic Year is required (e.g. 2026-27).');
      return;
    }
    if (!this.formStartDate) {
      this.formError.set('Start Date is required.');
      return;
    }
    if (!this.formEndDate) {
      this.formError.set('End Date is required.');
      return;
    }

    const res = this.academicService.saveAcademicYear(
      {
        year: this.formYear.trim(),
        startDate: this.formStartDate,
        endDate: this.formEndDate,
        status: this.formStatus,
        notes: this.formNotes.trim()
      },
      this.editingId() || undefined
    );

    if (!res.success) {
      this.formError.set(res.error || 'Failed to save academic year.');
      return;
    }

    this.closeDrawer();
  }

  protected confirmDelete(): void {
    const item = this.deletingItem();
    if (!item) return;

    const res = this.academicService.deleteAcademicYear(item.id);
    this.isDeleteDialogOpen.set(false);
    if (!res.success && res.error) {
      alert(res.error);
    }
  }

  private formatDate(isoDate: string): string {
    if (!isoDate) return '-';
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return isoDate;
    }
  }
}
