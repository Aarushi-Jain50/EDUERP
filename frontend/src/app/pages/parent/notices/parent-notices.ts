import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { EmptyState } from '../../../components/shared/empty-state';
import { Notice, NoticePriority } from '../../../models/communication.model';
import { ParentPortalFacade } from '../shared/parent-portal.facade';

@Component({
  selector: 'app-parent-notices',
  imports: [MatIconModule, PageHeader, StatStrip, FormDrawer, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-[#172554] pb-20 text-[13px]">
      <app-page-header
        title="Notice Board & Circulars"
        [subtitle]="child() ? 'Institutional circulars and parent announcements relevant to ' + child()!.name + ' (' + child()!.course + ').' : 'Institutional circulars and parent announcements.'"
      />

      <!-- Top Stat Strip -->
      <app-stat-strip [items]="stats()" />

      <!-- Toolbar & Filters -->
      <div class="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <!-- Tabs with counts -->
        <div class="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            (click)="activeTab.set('all')"
            [class]="activeTab() === 'all' ? 'bg-[#6D42E8] text-white font-bold shadow-xs' : 'bg-slate-50 text-[#64748B] hover:bg-slate-100 font-medium'"
            class="px-3.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>All</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold" [class]="activeTab() === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#64748B]'">
              {{ tabCounts().all }}
            </span>
          </button>

          <button
            type="button"
            (click)="activeTab.set('important')"
            [class]="activeTab() === 'important' ? 'bg-[#6D42E8] text-white font-bold shadow-xs' : 'bg-slate-50 text-[#64748B] hover:bg-slate-100 font-medium'"
            class="px-3.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Important</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold" [class]="activeTab() === 'important' ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#64748B]'">
              {{ tabCounts().important }}
            </span>
          </button>

          <button
            type="button"
            (click)="activeTab.set('urgent')"
            [class]="activeTab() === 'urgent' ? 'bg-[#6D42E8] text-white font-bold shadow-xs' : 'bg-slate-50 text-[#64748B] hover:bg-slate-100 font-medium'"
            class="px-3.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Urgent</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold" [class]="activeTab() === 'urgent' ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#64748B]'">
              {{ tabCounts().urgent }}
            </span>
          </button>

          <button
            type="button"
            (click)="activeTab.set('pinned')"
            [class]="activeTab() === 'pinned' ? 'bg-[#6D42E8] text-white font-bold shadow-xs' : 'bg-slate-50 text-[#64748B] hover:bg-slate-100 font-medium'"
            class="px-3.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <mat-icon class="text-xs">push_pin</mat-icon>
            <span>Pinned</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold" [class]="activeTab() === 'pinned' ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#64748B]'">
              {{ tabCounts().pinned }}
            </span>
          </button>
        </div>

        <!-- Search Input -->
        <div class="relative min-w-[240px] flex-1 max-w-md">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <mat-icon class="text-sm">search</mat-icon>
          </span>
          <input
            type="text"
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            placeholder="Search circulars by subject, keyword or authority..."
            aria-label="Search circulars"
            class="w-full h-9 pl-9 pr-8 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
          />
          @if (searchQuery()) {
            <button
              type="button"
              (click)="searchQuery.set('')"
              aria-label="Clear search"
              class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <mat-icon class="text-sm">close</mat-icon>
            </button>
          }
        </div>
      </div>

      <!-- Notice Card List -->
      <div class="space-y-3">
        @for (notice of filteredNotices(); track notice.id) {
          @let isUnread = !currentParentReadSet().has(notice.id);

          <div
            (click)="openNotice(notice)"
            (keydown.enter)="openNotice(notice)"
            tabindex="0"
            role="button"
            class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer relative group"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="space-y-2 flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  @if (notice.isPinned) {
                    <span class="px-2 py-0.5 rounded-lg bg-purple-50 text-[#6D42E8] font-bold text-[10px] uppercase flex items-center gap-1 border border-purple-100">
                      <mat-icon class="text-xs">push_pin</mat-icon> Pinned
                    </span>
                  }
                  <span [class]="getPriorityBadgeClass(notice.priority)" class="px-2.5 py-0.5 rounded-full font-extrabold text-[10px] uppercase tracking-wider">
                    {{ notice.priority }} Priority
                  </span>
                  <span class="text-xs text-[#64748B]">• {{ facade.formatShortDate(notice.publishDate) }}</span>
                  <span class="text-xs text-[#64748B]">• Issued by {{ notice.createdBy }}</span>
                  @if (notice.audience === 'Course-wise' && child()) {
                    <span class="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px]">
                      {{ child()!.course }}
                    </span>
                  } @else if (notice.audience === 'Parents') {
                    <span class="px-2 py-0.5 rounded bg-purple-50 text-[#6D42E8] font-semibold text-[10px]">
                      Parents
                    </span>
                  }
                </div>

                <div class="flex items-center gap-2">
                  @if (isUnread) {
                    <span class="w-2.5 h-2.5 rounded-full bg-[#6D42E8] shrink-0" title="Unread Circular"></span>
                  }
                  <h3 [class]="isUnread ? 'font-black text-[#172554]' : 'font-bold text-slate-800'" class="text-sm group-hover:text-[#6D42E8] transition-colors truncate">
                    {{ notice.title }}
                  </h3>
                </div>

                <p class="text-xs text-[#64748B] line-clamp-2 leading-relaxed">
                  {{ notice.body }}
                </p>
              </div>

              <div class="flex items-center gap-1.5 text-slate-400 group-hover:text-[#6D42E8] shrink-0 pt-1">
                <span class="text-xs font-bold hidden sm:inline">Read Circular</span>
                <mat-icon class="text-sm">arrow_forward</mat-icon>
              </div>
            </div>
          </div>
        } @empty {
          <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
            <app-empty-state
              icon="campaign"
              title="No notices found matching your criteria"
              message="Check back later or adjust your search and tab filters."
              [actionLabel]="searchQuery() || activeTab() !== 'all' ? 'Reset Filters' : ''"
              (actionClicked)="searchQuery.set(''); activeTab.set('all')"
            />
          </div>
        }
      </div>

      <!-- Read-only Detail Slide-Over Drawer -->
      <app-form-drawer
        [isOpen]="selectedNotice() !== null"
        title="Institutional Circular Details"
        subtitle="Official read-only parent announcement"
        [showSaveButton]="false"
        (closed)="selectedNotice.set(null)"
      >
        @if (selectedNotice(); as notice) {
          <div class="space-y-5">
            <div class="flex items-center gap-2 flex-wrap pb-3 border-b border-[#E2E8F0]">
              <span [class]="getPriorityBadgeClass(notice.priority)" class="px-2.5 py-0.5 rounded-full font-extrabold text-[10px] uppercase">
                {{ notice.priority }} Priority
              </span>
              @if (notice.isPinned) {
                <span class="px-2 py-0.5 rounded-lg bg-purple-50 text-[#6D42E8] font-bold text-[10px] uppercase flex items-center gap-1">
                  <mat-icon class="text-xs">push_pin</mat-icon> Pinned
                </span>
              }
              <span class="text-xs font-semibold text-[#64748B]">Audience: {{ notice.audience }}</span>
            </div>

            <div class="space-y-2">
              <h2 class="text-base font-black text-[#172554] leading-snug">
                {{ notice.title }}
              </h2>

              <div class="p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs space-y-1 text-[#64748B]">
                <p>Issued By: <strong class="text-[#172554] font-semibold">{{ notice.createdBy }}</strong></p>
                <p>Published Date: <strong class="text-[#172554] font-semibold">{{ facade.formatShortDate(notice.publishDate) }}</strong></p>
                <p>Valid Through: <strong class="text-[#172554] font-semibold">{{ facade.formatShortDate(notice.expiryDate) }}</strong></p>
              </div>
            </div>

            <div class="pt-2">
              <h4 class="text-xs font-bold text-[#172554] uppercase tracking-wider mb-2">Circular Text</h4>
              <div class="p-4 rounded-xl bg-purple-50/30 border border-purple-100 text-xs text-[#172554] leading-relaxed whitespace-pre-line">
                {{ notice.body }}
              </div>
            </div>

            <div class="p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-[11px] text-[#64748B] flex items-center gap-2">
              <mat-icon class="text-sm text-[#6D42E8]">verified</mat-icon>
              <span>Authenticated circular published by {{ facade.instituteProfile().name }}.</span>
            </div>
          </div>
        }
      </app-form-drawer>
    </div>
  `
})
export class ParentNotices {
  protected readonly facade = inject(ParentPortalFacade);

  protected readonly child = this.facade.selectedChild;
  protected readonly eligibleNotices = this.facade.selectedNotices;

  protected readonly searchQuery = signal<string>('');
  protected readonly activeTab = signal<'all' | 'important' | 'urgent' | 'pinned'>('all');
  protected readonly selectedNotice = signal<Notice | null>(null);

  // Per-parent read state map
  private readonly readByParent = signal<Record<string, string[]>>({
    'par-1': ['n-1']
  });

  protected readonly currentParentReadSet = computed<Set<string>>(() => {
    const pid = this.facade.currentParent().id || 'par-1';
    return new Set(this.readByParent()[pid] || []);
  });

  protected readonly tabCounts = computed(() => {
    const list = this.eligibleNotices();
    return {
      all: list.length,
      important: list.filter(n => n.priority === 'High' || n.priority === 'Urgent').length,
      urgent: list.filter(n => n.priority === 'Urgent').length,
      pinned: list.filter(n => n.isPinned).length
    };
  });

  protected readonly filteredNotices = computed(() => {
    let list = this.eligibleNotices();
    const q = this.searchQuery().trim().toLowerCase();
    const tab = this.activeTab();

    if (q) {
      list = list.filter(
        n =>
          n.title.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q) ||
          n.createdBy.toLowerCase().includes(q)
      );
    }

    if (tab === 'important') {
      list = list.filter(n => n.priority === 'High' || n.priority === 'Urgent');
    } else if (tab === 'urgent') {
      list = list.filter(n => n.priority === 'Urgent');
    } else if (tab === 'pinned') {
      list = list.filter(n => n.isPinned);
    }

    return [...list].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
    });
  });

  protected readonly stats = computed<StatItem[]>(() => {
    const list = this.eligibleNotices();
    const readSet = this.currentParentReadSet();
    const important = list.filter(n => n.priority === 'High' || n.priority === 'Urgent').length;
    const unread = list.filter(n => !readSet.has(n.id)).length;

    return [
      {
        label: 'Total',
        value: list.length,
        icon: 'campaign',
        iconColorClass: 'text-indigo-600',
        iconBgClass: 'bg-indigo-50 border-indigo-100'
      },
      {
        label: 'Important',
        value: important,
        icon: 'priority_high',
        iconColorClass: 'text-rose-600',
        iconBgClass: 'bg-rose-50 border-rose-100'
      },
      {
        label: 'Unread',
        value: unread,
        icon: 'mark_email_unread',
        iconColorClass: 'text-[#6D42E8]',
        iconBgClass: 'bg-purple-50 border-purple-100'
      }
    ];
  });

  protected onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected openNotice(notice: Notice): void {
    this.selectedNotice.set(notice);
    const pid = this.facade.currentParent().id || 'par-1';
    this.readByParent.update(map => {
      const existing = map[pid] || [];
      if (existing.includes(notice.id)) return map;
      return { ...map, [pid]: [...existing, notice.id] };
    });
  }

  protected getPriorityBadgeClass(p: NoticePriority): string {
    switch (p) {
      case 'Urgent':
        return 'bg-rose-100 text-rose-800';
      case 'High':
        return 'bg-amber-100 text-amber-800';
      case 'Medium':
        return 'bg-purple-100 text-[#6D42E8]';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }
}
