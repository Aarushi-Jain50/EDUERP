import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivityCategory, ActivityItem, ActivityService } from '../../../services/activity.service';

interface GroupedActivity {
  title: string;
  items: ActivityItem[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-recent-activity',
  imports: [FormsModule],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto font-sans">
      
      <!-- 1. Page Header (Title + exact one-line subtitle, no big button) -->
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Recent Activity</h1>
        <p class="text-xs sm:text-[13px] text-[#64748B] mt-1.5 leading-relaxed">
          Latest actions across students, faculty, attendance, exams and fees.
        </p>
      </div>

      <!-- 2. Toolbar (Spacious, open single row layout) -->
      <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
        
        <!-- Left: Search input & Date-range dropdown -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 flex-1 max-w-2xl">
          <!-- Search Input -->
          <div class="relative flex-1">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
              <span class="material-icons text-base">search</span>
            </span>
            <input
              type="text"
              [ngModel]="searchQuery()"
              (ngModelChange)="onSearchChange($event)"
              placeholder="Search by user, action, target, or module..."
              class="w-full pl-10 pr-9 py-2.5 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-800 placeholder-[#64748B] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xs transition-colors"
            />
            @if (searchQuery()) {
              <button
                (click)="onSearchChange('')"
                aria-label="Clear search"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-slate-800 cursor-pointer"
              >
                <span class="material-icons text-sm">close</span>
              </button>
            }
          </div>

          <!-- Date-Range Dropdown -->
          <div class="relative shrink-0 sm:w-44">
            <select
              [ngModel]="selectedDateRange()"
              (ngModelChange)="onDateRangeChange($event)"
              aria-label="Filter activity by date range"
              class="w-full appearance-none pl-3.5 pr-8 py-2.5 text-xs sm:text-[13px] bg-white border border-[#E2E8F0] rounded-xl text-slate-700 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xs cursor-pointer transition-colors"
            >
              <option value="Today">Today</option>
              <option value="Last 7 days">Last 7 days</option>
              <option value="Last 30 days">Last 30 days</option>
            </select>
            <span class="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[#64748B]">
              <span class="material-icons text-base">expand_more</span>
            </span>
          </div>
        </div>

        <!-- Right: Category Filter Chips (All, Academic, People, Attendance, Exams, Fees, Notices, Security) -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none shrink-0">
          @for (category of categoryOptions; track category) {
            <button
              (click)="onCategorySelect(category)"
              class="px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border"
              [class]="selectedCategory() === category
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-[#E2E8F0]'"
            >
              {{ category }}
            </button>
          }
        </div>
      </div>

      <!-- 3. Activity Feed inside ONE White Card (Spacious, un-cluttered open design) -->
      <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        
        @if (groupedActivities().length > 0) {
          @for (group of groupedActivities(); track group.title) {
            <!-- Group Header with Inter font 12px #64748B counter -->
            <div class="px-6 py-3.5 bg-slate-50/80 border-y border-[#E2E8F0] first:border-t-0 flex items-center justify-between">
              <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">{{ group.title }}</span>
              <span class="text-xs text-[#64748B] font-normal">{{ group.items.length }} {{ group.items.length === 1 ? 'event' : 'events' }}</span>
            </div>

            <!-- Group Rows with generous vertical padding and breathing room -->
            <div class="divide-y divide-[#E2E8F0]">
              @for (item of group.items; track item.id) {
                <div class="px-6 py-4.5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  <!-- Left: 32px Tinted Icon Chip + Line 1 & Line 2 -->
                  <div class="flex items-start gap-4 min-w-0 flex-1">
                    <!-- Small 32px tinted icon chip -->
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" [class]="getIconChipClasses(item.category)">
                      <span class="material-icons text-base">{{ item.icon }}</span>
                    </div>

                    <div class="min-w-0 flex-1 space-y-1.5">
                      <!-- Line 1: <User> <action> <target> with target in medium weight -->
                      <p class="text-[13px] leading-relaxed text-slate-700">
                        <span class="font-semibold text-slate-900">{{ item.user }}</span>
                        <span class="text-slate-600"> {{ item.action }} </span>
                        <span class="font-medium text-slate-900">{{ item.target }}</span>
                      </p>

                      <!-- Line 2: muted small text (role + module) -->
                      <div class="flex items-center gap-2 text-[11px] text-[#64748B] flex-wrap">
                        <span class="font-medium text-slate-600">{{ item.role }}</span>
                        <span class="text-slate-300">·</span>
                        <span>{{ item.module }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Right: relative time (Inter 12px #64748B) & small category pill -->
                  <div class="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 pl-12 sm:pl-0">
                    <span class="text-xs text-[#64748B] font-normal whitespace-nowrap" [title]="item.exactTime">{{ item.relativeTime }}</span>
                    <span class="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full" [class]="getCategoryPillClasses(item.category)">
                      {{ item.category }}
                    </span>
                  </div>

                </div>
              }
            </div>
          }

          <!-- 4. "Load more" ghost button at bottom (10 items at a time) -->
          @if (hasMore()) {
            <div class="p-3.5 bg-white border-t border-[#E2E8F0] text-center">
              <button
                (click)="loadMore()"
                class="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
              >
                <span class="material-icons text-base">expand_more</span>
                <span>Load more activity ({{ remainingCount() }} remaining)</span>
              </button>
            </div>
          }
        } @else {
          <!-- 5. Empty state (icon + short text) when search/filter returns nothing -->
          <div class="py-20 px-6 text-center">
            <div class="w-12 h-12 rounded-full bg-slate-100 text-[#64748B] mx-auto flex items-center justify-center mb-3">
              <span class="material-icons text-2xl">history_toggle_off</span>
            </div>
            <h4 class="text-sm font-bold text-slate-800">No activity records found</h4>
            <p class="text-xs text-[#64748B] mt-1.5 max-w-sm mx-auto">
              No institutional events match your current filter or search criteria.
            </p>
            <button
              (click)="resetFilters()"
              class="mt-4 px-4 py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        }

      </div>

    </div>
  `
})
export class RecentActivity {
  private readonly activityService = inject(ActivityService);

  // Exact chip order: All, Academic, People, Attendance, Exams, Fees, Notices, Security
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

  protected readonly selectedCategory = signal<string>('All');
  protected readonly selectedDateRange = signal<'Today' | 'Last 7 days' | 'Last 30 days'>('Last 30 days');
  protected readonly searchQuery = signal<string>('');
  protected readonly visibleLimit = signal<number>(10);

  // All activities from the typed service
  private readonly allActivities = computed(() => this.activityService.getActivities());

  // Filtered activities based on category, date range and search string
  protected readonly filteredActivities = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const category = this.selectedCategory();
    const range = this.selectedDateRange();

    return this.allActivities().filter(item => {
      // 1. Category Filter
      if (category !== 'All' && item.category !== category) {
        return false;
      }

      // 2. Date Range Filter
      if (range === 'Today' && item.daysAgo !== 0) {
        return false;
      }
      if (range === 'Last 7 days' && item.daysAgo > 7) {
        return false;
      }
      if (range === 'Last 30 days' && item.daysAgo > 30) {
        return false;
      }

      // 3. Search Query Filter
      if (query) {
        const textToSearch = `${item.user} ${item.role} ${item.action} ${item.target} ${item.module} ${item.category}`.toLowerCase();
        if (!textToSearch.includes(query)) {
          return false;
        }
      }

      return true;
    });
  });

  // Client-side pagination slice
  protected readonly displayedActivities = computed(() => {
    return this.filteredActivities().slice(0, this.visibleLimit());
  });

  // Has more items for "Load more"
  protected readonly hasMore = computed(() => {
    return this.visibleLimit() < this.filteredActivities().length;
  });

  // Remaining count for the load more button label
  protected readonly remainingCount = computed(() => {
    return Math.max(0, this.filteredActivities().length - this.visibleLimit());
  });

  // Grouped by Today, Yesterday, Earlier
  protected readonly groupedActivities = computed<GroupedActivity[]>(() => {
    const list = this.displayedActivities();
    const todayItems: ActivityItem[] = [];
    const yesterdayItems: ActivityItem[] = [];
    const earlierItems: ActivityItem[] = [];

    for (const item of list) {
      if (item.period === 'Today') {
        todayItems.push(item);
      } else if (item.period === 'Yesterday') {
        yesterdayItems.push(item);
      } else {
        earlierItems.push(item);
      }
    }

    const groups: GroupedActivity[] = [];
    if (todayItems.length > 0) {
      groups.push({ title: 'Today', items: todayItems });
    }
    if (yesterdayItems.length > 0) {
      groups.push({ title: 'Yesterday', items: yesterdayItems });
    }
    if (earlierItems.length > 0) {
      groups.push({ title: 'Earlier', items: earlierItems });
    }

    return groups;
  });

  protected onSearchChange(val: string): void {
    this.searchQuery.set(val);
    this.visibleLimit.set(10);
  }

  protected onCategorySelect(cat: string): void {
    this.selectedCategory.set(cat);
    this.visibleLimit.set(10);
  }

  protected onDateRangeChange(range: 'Today' | 'Last 7 days' | 'Last 30 days'): void {
    this.selectedDateRange.set(range);
    this.visibleLimit.set(10);
  }

  protected loadMore(): void {
    this.visibleLimit.update(current => current + 10);
  }

  protected resetFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('All');
    this.selectedDateRange.set('Last 30 days');
    this.visibleLimit.set(10);
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
