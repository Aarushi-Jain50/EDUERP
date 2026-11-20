import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  ActivityCategory,
  ActivityItem,
  ActivityOperationType,
  ActivityService
} from '../../../services/activity.service';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

interface GroupedActivity {
  title: string;
  items: ActivityItem[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-recent-activity',
  template: `
    <div class="space-y-6 max-w-7xl mx-auto font-sans">

      <!-- 1. Page Header + Exports -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900">Recent Activity</h1>
          <p class="text-xs sm:text-[13px] text-[#64748B] mt-1.5 leading-relaxed">
            Chronological institutional activity feed across students, faculty, attendance, exams, fees, and security.
          </p>
        </div>

        <div class="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            (click)="exportExcel()"
            class="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <span class="material-icons text-sm text-emerald-600">table_view</span>
            <span>Export Excel</span>
          </button>
          <button
            type="button"
            (click)="exportPdf()"
            class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <span class="material-icons text-sm">picture_as_pdf</span>
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      <!-- 2. Multi-Criteria Toolbar -->
      <div class="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-xs space-y-3.5">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <!-- Search Input (supports Student ID, Faculty ID, Record ID, Name, Target) -->
          <div class="relative lg:col-span-2">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
              <span class="material-icons text-base">search</span>
            </span>
            <input
              type="text"
              [value]="searchQuery()"
              (input)="onSearchInput($event)"
              placeholder="Search student ID, faculty ID, record ref, user, or target..."
              class="w-full pl-10 pr-9 py-2 text-xs bg-slate-50 border border-[#E2E8F0] rounded-xl text-slate-800 placeholder-[#64748B] focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
            @if (searchQuery()) {
              <button
                type="button"
                (click)="onSearchClear()"
                aria-label="Clear search"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-slate-800 cursor-pointer"
              >
                <span class="material-icons text-sm">close</span>
              </button>
            }
          </div>

          <!-- Operation Type Filter -->
          <div>
            <select
              [value]="selectedOperation()"
              (change)="onOperationChange($event)"
              aria-label="Filter by operation type"
              class="w-full px-3 py-2 text-xs bg-slate-50 border border-[#E2E8F0] rounded-xl text-slate-700 font-medium focus:bg-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="All">All Operations</option>
              @for (op of operationOptions; track op) {
                <option [value]="op">{{ op }}</option>
              }
            </select>
          </div>

          <!-- Role & Date Range Combined -->
          <div class="grid grid-cols-2 gap-2">
            <select
              [value]="selectedRole()"
              (change)="onRoleChange($event)"
              aria-label="Filter by actor role"
              class="w-full px-2.5 py-2 text-xs bg-slate-50 border border-[#E2E8F0] rounded-xl text-slate-700 font-medium focus:bg-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="All">All Roles</option>
              @for (role of availableRoles(); track role) {
                <option [value]="role">{{ role }}</option>
              }
            </select>

            <select
              [value]="selectedDateRange()"
              (change)="onDateRangeChange($event)"
              aria-label="Filter activity by date range"
              class="w-full px-2.5 py-2 text-xs bg-slate-50 border border-[#E2E8F0] rounded-xl text-slate-700 font-medium focus:bg-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="Today">Today</option>
              <option value="Last 7 days">Last 7 days</option>
              <option value="Last 30 days">Last 30 days</option>
              <option value="All Time">All Time</option>
            </select>
          </div>
        </div>

        <!-- Category Filter Chips -->
        <div class="flex items-center justify-between gap-3 flex-wrap pt-1 border-t border-slate-100">
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            @for (category of categoryOptions; track category) {
              <button
                type="button"
                (click)="onCategorySelect(category)"
                class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border"
                [class]="selectedCategory() === category
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-[#E2E8F0]'"
              >
                {{ category }}
              </button>
            }
          </div>

          <span class="text-[11px] font-medium text-slate-500">
            Showing {{ displayedActivities().length }} of {{ filteredActivities().length }} events
          </span>
        </div>
      </div>

      <!-- 3. Activity Feed Card -->
      <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">

        @if (groupedActivities().length > 0) {
          @for (group of groupedActivities(); track group.title) {
            <div class="px-6 py-3.5 bg-slate-50/80 border-y border-[#E2E8F0] first:border-t-0 flex items-center justify-between">
              <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">{{ group.title }}</span>
              <span class="text-xs text-[#64748B] font-normal">{{ group.items.length }} {{ group.items.length === 1 ? 'event' : 'events' }}</span>
            </div>

            <div class="divide-y divide-[#E2E8F0]">
              @for (item of group.items; track item.id) {
                <button
                  type="button"
                  (click)="selectedActivity.set(item)"
                  class="w-full text-left px-6 py-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                >
                  <div class="flex items-start gap-4 min-w-0 flex-1">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" [class]="getIconChipClasses(item.category)">
                      <span class="material-icons text-base">{{ item.icon }}</span>
                    </div>

                    <div class="min-w-0 flex-1 space-y-1">
                      <p class="text-[13px] leading-relaxed text-slate-700">
                        <span class="font-semibold text-slate-900">{{ item.user }}</span>
                        <span class="text-slate-600"> {{ item.action }} </span>
                        <span class="font-medium text-slate-900">{{ item.target }}</span>
                      </p>

                      <div class="flex items-center gap-2 text-[11px] text-[#64748B] flex-wrap">
                        <span class="font-medium text-slate-600">{{ item.role }}</span>
                        <span class="text-slate-300">·</span>
                        <span>{{ item.module }}</span>
                        <span class="text-slate-300">·</span>
                        <span class="font-semibold text-indigo-600">{{ item.operationType }}</span>
                        @if (item.recordId) {
                          <span class="text-slate-300">·</span>
                          <span class="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{{ item.recordId }}</span>
                        }
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 pl-12 sm:pl-0">
                    <span class="text-xs text-[#64748B] font-normal whitespace-nowrap" [title]="item.exactTime">{{ item.relativeTime }}</span>
                    <span class="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full" [class]="getCategoryPillClasses(item.category)">
                      {{ item.category }}
                    </span>
                  </div>
                </button>
              }
            </div>
          }

          @if (hasMore()) {
            <div class="p-3.5 bg-white border-t border-[#E2E8F0] text-center">
              <button
                type="button"
                (click)="loadMore()"
                class="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
              >
                <span class="material-icons text-base">expand_more</span>
                <span>Load more activity ({{ remainingCount() }} remaining)</span>
              </button>
            </div>
          }
        } @else {
          <div class="py-20 px-6 text-center">
            <div class="w-12 h-12 rounded-full bg-slate-100 text-[#64748B] mx-auto flex items-center justify-center mb-3">
              <span class="material-icons text-2xl">history_toggle_off</span>
            </div>
            <h4 class="text-sm font-bold text-slate-800">No activity records found</h4>
            <p class="text-xs text-[#64748B] mt-1.5 max-w-sm mx-auto">
              No institutional events match your current filter or search criteria.
            </p>
            <button
              type="button"
              (click)="resetFilters()"
              class="mt-4 px-4 py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        }

      </div>

    </div>

    <!-- Activity Detail Modal -->
    @if (selectedActivity()) {
      @let act = selectedActivity()!;
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button type="button" aria-label="Close activity detail overlay" (click)="selectedActivity.set(null)" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs w-full h-full border-0"></button>
        <div class="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg z-10 space-y-4 text-xs text-slate-800">
          <div class="flex items-start justify-between border-b border-slate-200 pb-3">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" [class]="getIconChipClasses(act.category)">
                <span class="material-icons text-lg">{{ act.icon }}</span>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900">Institutional Activity Detail</h3>
                <p class="text-[11px] text-slate-500 mt-0.5">{{ act.exactTime }}</p>
              </div>
            </div>
            <button type="button" (click)="selectedActivity.set(null)" class="text-slate-400 hover:text-slate-700 cursor-pointer">
              <span class="material-icons">close</span>
            </button>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <p class="text-xs text-slate-700 leading-relaxed">
              <span class="font-bold text-slate-900">{{ act.user }}</span>
              <span> {{ act.action }} </span>
              <span class="font-semibold text-indigo-700">{{ act.target }}</span>
            </p>
            @if (act.details) {
              <p class="text-[11px] text-slate-600 pt-1 border-t border-slate-200/70">{{ act.details }}</p>
            }
          </div>

          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="p-3 rounded-xl border border-slate-200">
              <p class="text-[10px] font-bold uppercase text-slate-400">Actor & Role</p>
              <p class="font-semibold text-slate-900 mt-0.5">{{ act.user }}</p>
              <p class="text-[11px] text-slate-500">{{ act.role }}</p>
            </div>
            <div class="p-3 rounded-xl border border-slate-200">
              <p class="text-[10px] font-bold uppercase text-slate-400">Module & Operation</p>
              <p class="font-semibold text-slate-900 mt-0.5">{{ act.module }}</p>
              <p class="text-[11px] text-indigo-600 font-semibold">{{ act.operationType }} · {{ act.category }}</p>
            </div>
            <div class="p-3 rounded-xl border border-slate-200">
              <p class="text-[10px] font-bold uppercase text-slate-400">Related Record ID</p>
              <p class="font-mono font-bold text-slate-900 mt-0.5">{{ act.recordId || act.id }}</p>
            </div>
            <div class="p-3 rounded-xl border border-slate-200">
              <p class="text-[10px] font-bold uppercase text-slate-400">ISO Timestamp</p>
              <p class="font-mono text-[11px] text-slate-700 mt-0.5 truncate">{{ act.timestampIso }}</p>
            </div>
          </div>

          <div class="flex justify-end pt-2 border-t border-slate-100">
            <button type="button" (click)="selectedActivity.set(null)" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold cursor-pointer">
              Close
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class RecentActivity {
  private readonly activityService = inject(ActivityService);

  protected readonly categoryOptions = [
    'All',
    'Academic',
    'People',
    'Attendance',
    'Exams',
    'Fees',
    'Notices',
    'Security'
  ] as const;

  protected readonly operationOptions: ActivityOperationType[] = [
    'Create',
    'Update',
    'Delete',
    'Approve',
    'Reject',
    'Publish',
    'Export',
    'Security'
  ];

  protected readonly selectedCategory = signal<string>('All');
  protected readonly selectedOperation = signal<string>('All');
  protected readonly selectedRole = signal<string>('All');
  protected readonly selectedDateRange = signal<'Today' | 'Last 7 days' | 'Last 30 days' | 'All Time'>('Last 30 days');
  protected readonly searchQuery = signal<string>('');
  protected readonly visibleLimit = signal<number>(12);
  protected readonly selectedActivity = signal<ActivityItem | null>(null);

  private readonly allActivities = this.activityService.items;

  protected readonly availableRoles = computed(() => {
    const roles = new Set(this.allActivities().map(a => a.role));
    return Array.from(roles).sort();
  });

  protected readonly filteredActivities = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const category = this.selectedCategory();
    const operation = this.selectedOperation();
    const role = this.selectedRole();
    const range = this.selectedDateRange();

    return this.allActivities().filter(item => {
      if (category !== 'All' && item.category !== category) return false;
      if (operation !== 'All' && item.operationType !== operation) return false;
      if (role !== 'All' && item.role !== role) return false;

      if (range === 'Today' && item.daysAgo !== 0) return false;
      if (range === 'Last 7 days' && item.daysAgo > 7) return false;
      if (range === 'Last 30 days' && item.daysAgo > 30) return false;

      if (query) {
        const textToSearch = `${item.user} ${item.role} ${item.operationType} ${item.action} ${item.target} ${item.recordId ?? ''} ${item.module} ${item.category}`.toLowerCase();
        if (!textToSearch.includes(query)) return false;
      }

      return true;
    });
  });

  protected readonly displayedActivities = computed(() => {
    return this.filteredActivities().slice(0, this.visibleLimit());
  });

  protected readonly hasMore = computed(() => {
    return this.visibleLimit() < this.filteredActivities().length;
  });

  protected readonly remainingCount = computed(() => {
    return Math.max(0, this.filteredActivities().length - this.visibleLimit());
  });

  protected readonly groupedActivities = computed<GroupedActivity[]>(() => {
    const list = this.displayedActivities();
    const todayItems: ActivityItem[] = [];
    const yesterdayItems: ActivityItem[] = [];
    const earlierItems: ActivityItem[] = [];

    for (const item of list) {
      if (item.period === 'Today') todayItems.push(item);
      else if (item.period === 'Yesterday') yesterdayItems.push(item);
      else earlierItems.push(item);
    }

    const groups: GroupedActivity[] = [];
    if (todayItems.length > 0) groups.push({ title: 'Today', items: todayItems });
    if (yesterdayItems.length > 0) groups.push({ title: 'Yesterday', items: yesterdayItems });
    if (earlierItems.length > 0) groups.push({ title: 'Earlier', items: earlierItems });
    return groups;
  });

  protected onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.visibleLimit.set(12);
  }

  protected onSearchClear(): void {
    this.searchQuery.set('');
    this.visibleLimit.set(12);
  }

  protected onOperationChange(event: Event): void {
    this.selectedOperation.set((event.target as HTMLSelectElement).value);
    this.visibleLimit.set(12);
  }

  protected onRoleChange(event: Event): void {
    this.selectedRole.set((event.target as HTMLSelectElement).value);
    this.visibleLimit.set(12);
  }

  protected onCategorySelect(cat: string): void {
    this.selectedCategory.set(cat);
    this.visibleLimit.set(12);
  }

  protected onDateRangeChange(event: Event): void {
    const range = (event.target as HTMLSelectElement).value as 'Today' | 'Last 7 days' | 'Last 30 days' | 'All Time';
    this.selectedDateRange.set(range);
    this.visibleLimit.set(12);
  }

  protected loadMore(): void {
    this.visibleLimit.update(current => current + 12);
  }

  protected resetFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('All');
    this.selectedOperation.set('All');
    this.selectedRole.set('All');
    this.selectedDateRange.set('Last 30 days');
    this.visibleLimit.set(12);
  }

  protected exportExcel(): void {
    const rows = this.filteredActivities().map(a => ({
      Timestamp: a.exactTime,
      User: a.user,
      Role: a.role,
      Operation: a.operationType,
      Category: a.category,
      Module: a.module,
      Action: a.action,
      Target: a.target,
      RecordID: a.recordId || a.id
    }));
    exportToExcel(rows, `EduERP_Activity_Report_${new Date().toISOString().split('T')[0]}`);
  }

  protected exportPdf(): void {
    const rows = this.filteredActivities().map(a => [
      a.exactTime,
      a.user,
      a.role,
      a.operationType,
      a.module,
      a.recordId || a.id,
      `${a.action} ${a.target}`
    ]);
    exportToPdf(
      'Institutional Recent Activity Report',
      ['Timestamp', 'User', 'Role', 'Operation', 'Module', 'Record Ref', 'Event Details'],
      rows,
      `EduERP_Activity_Report_${new Date().toISOString().split('T')[0]}`,
      [`Total Matching Events: ${rows.length} | Category: ${this.selectedCategory()} | Operation: ${this.selectedOperation()}`]
    );
  }

  protected getIconChipClasses(category: ActivityCategory): string {
    switch (category) {
      case 'Academic':
        return 'bg-indigo-50 text-indigo-600 border border-indigo-100';
      case 'People':
        return 'bg-purple-50 text-purple-600 border border-purple-100';
      case 'Attendance':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
      case 'Exams':
        return 'bg-amber-50 text-amber-600 border border-amber-100';
      case 'Fees':
        return 'bg-blue-50 text-blue-600 border border-blue-100';
      case 'Notices':
        return 'bg-pink-50 text-pink-600 border border-pink-100';
      case 'Security':
        return 'bg-slate-100 text-slate-700 border border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-200';
    }
  }

  protected getCategoryPillClasses(category: ActivityCategory): string {
    switch (category) {
      case 'Academic':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      case 'People':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'Attendance':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'Exams':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'Fees':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'Notices':
        return 'bg-pink-50 text-pink-700 border border-pink-200';
      case 'Security':
        return 'bg-slate-100 text-slate-700 border border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-200';
    }
  }
}
