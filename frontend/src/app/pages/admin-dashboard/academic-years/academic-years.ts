import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AcademicService,
  AcademicYear,
  AcademicCalendarEvent,
  CalendarPeriodType,
  SessionValidationResult
} from '../../../services/academic.service';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn, TableCustomAction } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

export interface AcademicYearRow extends AcademicYear {
  formattedStartDate: string;
  formattedEndDate: string;
  milestoneCountLabel: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-academic-years',
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
          title="Academic Years & Calendar"
          subtitle="Manage university academic sessions, session activation validation, archival, and institutional calendar milestones."
          actionLabel="Add Academic Year"
          actionIcon="calendar_month"
          (actionClicked)="openAddDrawer()"
        />
        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            (click)="openCalendarDrawer()"
            class="h-10 px-3.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <span class="material-icons text-sm">event_note</span>
            <span>Add Calendar Event</span>
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

      <app-data-toolbar
        [searchValue]="searchQuery()"
        searchPlaceholder="Search academic year sessions or remarks..."
        [filter1Value]="statusFilter()"
        [filter1Options]="statusFilterOptions"
        [hasActiveFilters]="hasActiveFilters()"
        (searchChange)="onSearchChange($event)"
        (filter1Change)="onStatusFilterChange($event)"
        (resetClicked)="resetFilters()"
      />

      <app-data-table
        [columns]="tableColumns"
        [data]="filteredYears()"
        idKey="id"
        [customActions]="customRowActions"
        emptyIcon="calendar_today"
        emptyTitle="No academic years found"
        emptyMessage="Try adjusting your search query or status filter to see sessions."
        emptyActionLabel="Clear filters"
        (emptyActionClicked)="resetFilters()"
        (viewClicked)="onViewRecord($event)"
        (editClicked)="onEditRecord($event)"
        (deleteClicked)="onDeleteRecord($event)"
        (customActionClicked)="handleCustomAction($event)"
      />

      <!-- Institutional Academic Calendar Periods Panel -->
      <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div class="px-5 py-3.5 border-b border-[#E2E8F0] bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span class="material-icons text-base text-indigo-600">event_available</span>
              <span>Academic Calendar Periods & Examination Windows</span>
            </h2>
            <p class="text-[11px] text-slate-500 mt-0.5">Configured admission, registration, examination, and holiday windows across sessions.</p>
          </div>
          <div class="flex items-center gap-2">
            <select
              aria-label="Filter calendar by academic year"
              [value]="calendarYearFilter()"
              (change)="calendarYearFilter.set($any($event.target).value)"
              class="h-8 px-2.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-slate-700"
            >
              <option value="All">All Sessions</option>
              @for (y of academicYearsList(); track y.id) {
                <option [value]="y.year">{{ y.year }}</option>
              }
            </select>
          </div>
        </div>

        <div class="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          @for (ev of filteredCalendarEvents(); track ev.id) {
            <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white transition-colors flex flex-col justify-between gap-2.5">
              <div class="space-y-1">
                <div class="flex items-center justify-between gap-2">
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {{ ev.periodType }}
                  </span>
                  <span class="text-[11px] font-mono font-semibold text-slate-500">{{ ev.academicYear }}</span>
                </div>
                <h3 class="text-xs font-bold text-slate-900">{{ ev.title }}</h3>
                @if (ev.description) {
                  <p class="text-[11px] text-slate-600 line-clamp-2">{{ ev.description }}</p>
                }
              </div>
              <div class="flex items-center justify-between pt-2 border-t border-slate-200/70 text-[11px]">
                <span class="text-slate-600 font-medium">{{ formatDate(ev.startDate) }} – {{ formatDate(ev.endDate) }}</span>
                <button
                  type="button"
                  (click)="deleteCalendarEvent(ev.id)"
                  class="text-slate-400 hover:text-red-600 p-1 rounded cursor-pointer"
                  title="Remove milestone"
                >
                  <span class="material-icons text-sm">delete_outline</span>
                </button>
              </div>
            </div>
          } @empty {
            <div class="col-span-full py-6 text-center text-xs text-slate-500">
              No academic calendar events configured for this selection.
            </div>
          }
        </div>
      </div>

      <!-- Academic Year Form Drawer -->
      <app-form-drawer
        [isOpen]="isDrawerOpen()"
        [title]="drawerTitle()"
        [subtitle]="drawerSubtitle()"
        [saveLabel]="isViewOnly() ? 'Close' : (editingId() ? 'Update Session' : 'Save Session')"
        (closed)="closeDrawer()"
        (saved)="handleDrawerSave()"
      >
        <form [formGroup]="yearForm" class="space-y-4">
          @if (formError()) {
            <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <span class="material-icons text-base text-red-600 shrink-0">error_outline</span>
              <span>{{ formError() }}</span>
            </div>
          }

          @if (validationPreview(); as check) {
            <div class="p-3 rounded-xl border text-xs space-y-1" [class]="check.valid ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'">
              <p class="font-bold flex items-center gap-1.5">
                <span class="material-icons text-sm">{{ check.valid ? 'verified' : 'gpp_bad' }}</span>
                <span>{{ check.valid ? 'Academic Structure Pre-Check Passed' : 'Activation Validation Failed' }}</span>
              </p>
              @for (b of check.blockers; track b) {
                <p class="text-[11px]">• {{ b }}</p>
              }
              @for (w of check.warnings; track w) {
                <p class="text-[11px] text-amber-700">• Warning: {{ w }}</p>
              }
            </div>
          }

          <div class="space-y-1.5">
            <label for="ay-year-input" class="block text-xs font-semibold text-slate-800">
              Academic Year <span class="text-red-500">*</span>
            </label>
            <input
              id="ay-year-input"
              type="text"
              formControlName="year"
              placeholder="e.g. 2026-27"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 placeholder-[#64748B] focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
            <p class="text-[11px] text-[#64748B]">Format: YYYY-YY (e.g. 2026-27)</p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label for="ay-start-date" class="block text-xs font-semibold text-slate-800">
                Start Date <span class="text-red-500">*</span>
              </label>
              <input
                id="ay-start-date"
                type="date"
                formControlName="startDate"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div class="space-y-1.5">
              <label for="ay-end-date" class="block text-xs font-semibold text-slate-800">
                End Date <span class="text-red-500">*</span>
              </label>
              <input
                id="ay-end-date"
                type="date"
                formControlName="endDate"
                class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="ay-status-select" class="block text-xs font-semibold text-slate-800">
              Status <span class="text-red-500">*</span>
            </label>
            <select
              id="ay-status-select"
              formControlName="status"
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="Active">Active (Current Session)</option>
              <option value="Upcoming">Upcoming (Future Planning)</option>
              <option value="Completed">Completed (Archived)</option>
            </select>
            <p class="text-[11px] text-[#64748B]">
              Marking a session Active automatically archives any previously active session.
            </p>
          </div>

          <div class="space-y-1.5">
            <label for="ay-notes-textarea" class="block text-xs font-semibold text-slate-800">Session Remarks / Description</label>
            <textarea
              id="ay-notes-textarea"
              rows="3"
              formControlName="notes"
              placeholder="e.g. Semester examinations and convocation window details..."
              class="w-full px-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-900 placeholder-[#64748B] focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 resize-none"
            ></textarea>
          </div>
        </form>
      </app-form-drawer>

      <!-- Calendar Milestone Drawer -->
      <app-form-drawer
        [isOpen]="isCalendarDrawerOpen()"
        title="Add Academic Calendar Milestone"
        subtitle="Configure admission, registration, examination, or holiday period."
        saveLabel="Save Milestone"
        (closed)="isCalendarDrawerOpen.set(false)"
        (saved)="handleCalendarSave()"
      >
        <form [formGroup]="calendarForm" class="space-y-4">
          @if (calendarFormError()) {
            <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              {{ calendarFormError() }}
            </div>
          }

          <div class="space-y-1.5">
            <label for="cal-ay" class="block text-xs font-semibold text-slate-800">Academic Year <span class="text-red-500">*</span></label>
            <select id="cal-ay" formControlName="academicYear" class="w-full px-3.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-xl text-slate-900">
              @for (y of academicYearsList(); track y.id) {
                <option [value]="y.year">{{ y.year }} ({{ y.status }})</option>
              }
            </select>
          </div>

          <div class="space-y-1.5">
            <label for="cal-type" class="block text-xs font-semibold text-slate-800">Period Type <span class="text-red-500">*</span></label>
            <select id="cal-type" formControlName="periodType" class="w-full px-3.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-xl text-slate-900">
              <option value="Admission Window">Admission Window</option>
              <option value="Course Registration">Course Registration</option>
              <option value="Mid-Term Exam">Mid-Term Exam</option>
              <option value="End-Term Exam">End-Term Exam</option>
              <option value="Holiday">Holiday</option>
              <option value="Convocation">Convocation</option>
            </select>
          </div>

          <div class="space-y-1.5">
            <label for="cal-title" class="block text-xs font-semibold text-slate-800">Milestone Title <span class="text-red-500">*</span></label>
            <input id="cal-title" type="text" formControlName="title" placeholder="e.g. Even Semester End-Term Exam" class="w-full px-3.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label for="cal-start" class="block text-xs font-semibold text-slate-800">Start Date <span class="text-red-500">*</span></label>
              <input id="cal-start" type="date" formControlName="startDate" class="w-full px-3.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
            </div>
            <div class="space-y-1.5">
              <label for="cal-end" class="block text-xs font-semibold text-slate-800">End Date <span class="text-red-500">*</span></label>
              <input id="cal-end" type="date" formControlName="endDate" class="w-full px-3.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="cal-desc" class="block text-xs font-semibold text-slate-800">Description</label>
            <textarea id="cal-desc" rows="2" formControlName="description" placeholder="Optional instructions for faculty & students" class="w-full px-3.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-xl text-slate-900 resize-none"></textarea>
          </div>
        </form>
      </app-form-drawer>

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
  protected readonly calendarYearFilter = signal<string>('All');
  protected readonly bannerMessage = signal<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);
  protected readonly validationPreview = signal<SessionValidationResult | null>(null);

  protected readonly academicYearsList = computed(() => this.academicService.academicYears());

  protected readonly statusFilterOptions: FilterOption[] = [
    { label: 'Status: All', value: 'All' },
    { label: 'Active', value: 'Active' },
    { label: 'Upcoming', value: 'Upcoming' },
    { label: 'Completed', value: 'Completed' }
  ];

  protected readonly tableColumns: TableColumn[] = [
    { key: 'year', header: 'Academic Year', isBold: true, isMono: true },
    { key: 'formattedStartDate', header: 'Start Date' },
    { key: 'formattedEndDate', header: 'End Date' },
    { key: 'milestoneCountLabel', header: 'Calendar Periods', align: 'center' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  protected readonly customRowActions: TableCustomAction<AcademicYearRow>[] = [
    {
      id: 'activate',
      label: 'Validate & Activate',
      icon: 'verified',
      showIf: row => row.status !== 'Active'
    },
    {
      id: 'archive',
      label: 'Archive Session',
      icon: 'archive',
      showIf: row => row.status === 'Upcoming'
    }
  ];

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
        label: 'Calendar Milestones',
        value: this.academicService.calendarEvents().length,
        subtext: `${stats.upcoming} upcoming session(s)`,
        icon: 'event_note',
        iconBgClass: 'bg-blue-50 border-blue-100',
        iconColorClass: 'text-blue-600'
      }
    ];
  });

  protected readonly filteredYears = computed<AcademicYearRow[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    const rawList = this.academicService.academicYears();
    const events = this.academicService.calendarEvents();

    return rawList
      .filter(item => {
        if (status !== 'All' && item.status !== status) return false;
        if (query) {
          const match = `${item.year} ${item.notes || ''} ${item.startDate} ${item.endDate}`.toLowerCase();
          if (!match.includes(query)) return false;
        }
        return true;
      })
      .map(item => {
        const count = events.filter(e => e.academicYear === item.year).length;
        return {
          ...item,
          formattedStartDate: this.formatDate(item.startDate),
          formattedEndDate: this.formatDate(item.endDate),
          milestoneCountLabel: `${count} event${count === 1 ? '' : 's'}`
        };
      });
  });

  protected readonly filteredCalendarEvents = computed<AcademicCalendarEvent[]>(() => {
    const yf = this.calendarYearFilter();
    return this.academicService.calendarEvents().filter(e => yf === 'All' || e.academicYear === yf);
  });

  protected readonly hasActiveFilters = computed(() => {
    return this.searchQuery().trim() !== '' || this.statusFilter() !== 'All';
  });

  protected readonly isDrawerOpen = signal<boolean>(false);
  protected readonly isViewOnly = signal<boolean>(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formError = signal<string>('');

  protected readonly isCalendarDrawerOpen = signal<boolean>(false);
  protected readonly calendarFormError = signal<string>('');

  protected readonly yearForm = new FormGroup({
    year: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    startDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    status: new FormControl<'Active' | 'Upcoming' | 'Completed'>('Upcoming', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true })
  });

  protected readonly calendarForm = new FormGroup({
    academicYear: new FormControl('2025-26', { nonNullable: true, validators: [Validators.required] }),
    periodType: new FormControl<CalendarPeriodType>('Admission Window', { nonNullable: true }),
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    startDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true })
  });

  protected readonly isDeleteDialogOpen = signal<boolean>(false);
  protected readonly deletingItem = signal<AcademicYear | null>(null);
  protected readonly deleteDialogMessage = computed(() => {
    const item = this.deletingItem();
    return item ? `Are you sure you want to delete session ${item.year}? This action cannot be undone.` : '';
  });

  protected readonly drawerTitle = computed(() => {
    if (this.isViewOnly()) return 'Session Details';
    return this.editingId() ? 'Edit Academic Year' : 'Add Academic Year';
  });

  protected readonly drawerSubtitle = computed(() => {
    if (this.isViewOnly()) return 'View configured institutional session boundaries.';
    return 'Configure term start and end milestones.';
  });

  protected onSearchChange(val: string): void { this.searchQuery.set(val); }
  protected onStatusFilterChange(val: string): void { this.statusFilter.set(val); }
  protected resetFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('All');
  }

  private syncFormDisabledState(disabled: boolean): void {
    if (disabled) this.yearForm.disable({ emitEvent: false });
    else this.yearForm.enable({ emitEvent: false });
  }

  protected openAddDrawer(): void {
    this.isViewOnly.set(false);
    this.editingId.set(null);
    this.formError.set('');
    this.validationPreview.set(null);
    this.syncFormDisabledState(false);
    this.yearForm.reset({ year: '', startDate: '', endDate: '', status: 'Upcoming', notes: '' });
    this.isDrawerOpen.set(true);
  }

  protected onViewRecord(item: AcademicYearRow): void {
    this.isViewOnly.set(true);
    this.editingId.set(item.id);
    this.formError.set('');
    this.validationPreview.set(this.academicService.validateSessionActivation(item.id));
    this.yearForm.reset({
      year: item.year,
      startDate: item.startDate,
      endDate: item.endDate,
      status: item.status,
      notes: item.notes || ''
    });
    this.syncFormDisabledState(true);
    this.isDrawerOpen.set(true);
  }

  protected onEditRecord(item: AcademicYearRow): void {
    this.isViewOnly.set(false);
    this.editingId.set(item.id);
    this.formError.set('');
    this.validationPreview.set(null);
    this.syncFormDisabledState(false);
    this.yearForm.reset({
      year: item.year,
      startDate: item.startDate,
      endDate: item.endDate,
      status: item.status,
      notes: item.notes || ''
    });
    this.isDrawerOpen.set(true);
  }

  protected onDeleteRecord(item: AcademicYearRow): void {
    this.deletingItem.set(item);
    this.isDeleteDialogOpen.set(true);
  }

  protected handleCustomAction(event: { actionId: string; row: AcademicYearRow }): void {
    if (event.actionId === 'activate') {
      const res = this.academicService.activateAcademicYear(event.row.id);
      if (res.success) {
        const warn = res.warnings && res.warnings.length > 0 ? ` (${res.warnings.join('; ')})` : '';
        this.bannerMessage.set({
          type: res.warnings?.length ? 'warning' : 'success',
          text: `Academic session ${event.row.year} activated successfully.${warn}`
        });
      } else {
        this.bannerMessage.set({ type: 'error', text: res.error || 'Activation failed.' });
      }
    } else if (event.actionId === 'archive') {
      const res = this.academicService.archiveAcademicYear(event.row.id);
      this.bannerMessage.set(
        res.success
          ? { type: 'success', text: `Session ${event.row.year} archived.` }
          : { type: 'error', text: res.error || 'Archive failed.' }
      );
    }
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
    this.yearForm.markAllAsTouched();
    const val = this.yearForm.getRawValue();
    if (!val.year.trim() || !val.startDate || !val.endDate) {
      this.formError.set('Academic Year, Start Date, and End Date are required.');
      return;
    }

    const res = this.academicService.saveAcademicYear(
      {
        year: val.year.trim(),
        startDate: val.startDate,
        endDate: val.endDate,
        status: val.status,
        notes: val.notes.trim()
      },
      this.editingId() || undefined
    );

    if (!res.success) {
      this.formError.set(res.error || 'Failed to save academic year.');
      return;
    }
    this.bannerMessage.set({ type: 'success', text: `Session ${val.year.trim()} saved.` });
    this.closeDrawer();
  }

  protected openCalendarDrawer(): void {
    this.calendarFormError.set('');
    this.calendarForm.reset({
      academicYear: this.academicYearsList()[0]?.year || '2025-26',
      periodType: 'Admission Window',
      title: '',
      startDate: '',
      endDate: '',
      description: ''
    });
    this.isCalendarDrawerOpen.set(true);
  }

  protected handleCalendarSave(): void {
    const val = this.calendarForm.getRawValue();
    if (!val.title.trim() || !val.startDate || !val.endDate) {
      this.calendarFormError.set('Title, Start Date, and End Date are required.');
      return;
    }
    const res = this.academicService.saveCalendarEvent({
      academicYear: val.academicYear,
      periodType: val.periodType,
      title: val.title.trim(),
      startDate: val.startDate,
      endDate: val.endDate,
      description: val.description.trim()
    });
    if (!res.success) {
      this.calendarFormError.set(res.error || 'Failed to save calendar milestone.');
      return;
    }
    this.isCalendarDrawerOpen.set(false);
    this.bannerMessage.set({ type: 'success', text: `Calendar milestone "${val.title.trim()}" saved.` });
  }

  protected deleteCalendarEvent(id: string): void {
    this.academicService.deleteCalendarEvent(id);
  }

  protected confirmDelete(): void {
    const item = this.deletingItem();
    if (!item) return;
    const res = this.academicService.deleteAcademicYear(item.id);
    this.isDeleteDialogOpen.set(false);
    if (!res.success && res.error) {
      this.bannerMessage.set({ type: 'error', text: res.error });
    } else {
      this.bannerMessage.set({ type: 'success', text: `Academic session ${item.year} deleted.` });
    }
  }

  protected exportExcel(): void {
    exportToExcel(
      this.filteredYears().map(y => ({
        Session: y.year,
        'Start Date': y.startDate,
        'End Date': y.endDate,
        Status: y.status,
        Milestones: y.milestoneCountLabel,
        Remarks: y.notes || ''
      })),
      'EduERP_Academic_Years'
    );
  }

  protected exportPdf(): void {
    exportToPdf(
      'Academic Years & Sessions Registry',
      ['Session', 'Start Date', 'End Date', 'Status', 'Calendar Periods'],
      this.filteredYears().map(y => [y.year, y.formattedStartDate, y.formattedEndDate, y.status, y.milestoneCountLabel]),
      'EduERP_Academic_Years'
    );
  }

  protected formatDate(isoDate: string): string {
    if (!isoDate) return '-';
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return isoDate;
    }
  }
}
