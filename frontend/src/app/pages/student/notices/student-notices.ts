import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { CommunicationService } from '../../../services/communication.service';
import { CurrentUserService } from '../../../services/current-user.service';
import { Notice, NoticePriority } from '../../../models/communication.model';

@Component({
  selector: 'app-student-notices',
  imports: [CommonModule, MatIconModule, PageHeader, StatStrip, FormDrawer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-[#172554] pb-20 text-[13px]">
      <app-page-header
        title="Notice Board & Circulars"
        subtitle="Institutional circulars, examination updates, department advisories and academic notices."
      />

      <!-- Top Stat Strip -->
      <app-stat-strip [items]="stats()" />

      <!-- Toolbar & Filters -->
      <div class="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4">
        <!-- Tabs with counts -->
        <div class="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            (click)="activeTab.set('all')"
            [class]="activeTab() === 'all' ? 'bg-[#6D42E8] text-white font-bold shadow-xs' : 'bg-slate-50 text-[#64748B] hover:bg-slate-100 font-medium'"
            class="px-3.5 py-2 sm:py-1.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <span>All Circulars</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold" [class]="activeTab() === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#64748B]'">
              {{ tabCounts().all }}
            </span>
          </button>

          <button
            type="button"
            (click)="activeTab.set('important')"
            [class]="activeTab() === 'important' ? 'bg-[#6D42E8] text-white font-bold shadow-xs' : 'bg-slate-50 text-[#64748B] hover:bg-slate-100 font-medium'"
            class="px-3.5 py-2 sm:py-1.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <span>Important & Urgent</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold" [class]="activeTab() === 'important' ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#64748B]'">
              {{ tabCounts().important }}
            </span>
          </button>

          <button
            type="button"
            (click)="activeTab.set('urgent')"
            [class]="activeTab() === 'urgent' ? 'bg-[#6D42E8] text-white font-bold shadow-xs' : 'bg-slate-50 text-[#64748B] hover:bg-slate-100 font-medium'"
            class="px-3.5 py-2 sm:py-1.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <span>Urgent Only</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold" [class]="activeTab() === 'urgent' ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#64748B]'">
              {{ tabCounts().urgent }}
            </span>
          </button>

          <button
            type="button"
            (click)="activeTab.set('pinned')"
            [class]="activeTab() === 'pinned' ? 'bg-[#6D42E8] text-white font-bold shadow-xs' : 'bg-slate-50 text-[#64748B] hover:bg-slate-100 font-medium'"
            class="px-3.5 py-2 sm:py-1.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <mat-icon class="text-xs">push_pin</mat-icon>
            <span>Pinned</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold" [class]="activeTab() === 'pinned' ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#64748B]'">
              {{ tabCounts().pinned }}
            </span>
          </button>
        </div>

        <!-- Search Input -->
        <div class="relative w-full lg:min-w-[260px] lg:flex-1 lg:max-w-md">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <mat-icon class="text-sm">search</mat-icon>
          </span>
          <input
            type="text"
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            placeholder="Search circulars by subject, keyword or authority..."
            class="w-full h-10 sm:h-9 pl-9 pr-8 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
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
      <div class="space-y-4">
        @for (notice of filteredNotices(); track notice.id) {
          @let isUnread = !readNoticeIds().has(notice.id);

          <div
            (click)="openNotice(notice)"
            (keydown.enter)="openNotice(notice)"
            tabindex="0"
            role="button"
            class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 sm:p-5 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer relative group"
          >
            <div class="flex items-start justify-between gap-3 sm:gap-4">
              <div class="space-y-2 flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  @if (notice.isPinned) {
                    <span class="px-2 py-0.5 rounded-lg bg-purple-50 text-[#6D42E8] font-bold text-[10px] uppercase flex items-center gap-1 border border-purple-100 whitespace-nowrap">
                      <mat-icon class="text-xs">push_pin</mat-icon> Pinned
                    </span>
                  }
                  <span [class]="getPriorityBadgeClass(notice.priority)" class="px-2.5 py-0.5 rounded-full font-extrabold text-[10px] uppercase tracking-wider whitespace-nowrap">
                    {{ notice.priority }} Priority
                  </span>
                  <span class="text-xs text-[#64748B]">• {{ notice.publishDate }}</span>
                  <span class="text-xs text-[#64748B]">• Issued by {{ notice.createdBy }}</span>
                  @if (notice.audience === 'Course-wise') {
                    <span class="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px] whitespace-nowrap">
                      {{ currentStudent().course }}
                    </span>
                  }
                </div>

                <div class="flex items-start sm:items-center gap-2">
                  @if (isUnread) {
                    <span class="w-2.5 h-2.5 rounded-full bg-[#6D42E8] shrink-0 mt-1 sm:mt-0" title="Unread Circular"></span>
                  }
                  <h3 [class]="isUnread ? 'font-black text-[#172554]' : 'font-bold text-slate-800'" class="text-sm group-hover:text-[#6D42E8] transition-colors line-clamp-2 sm:truncate">
                    {{ notice.title }}
                  </h3>
                </div>

                <p class="text-xs text-[#64748B] line-clamp-2 leading-relaxed">
                  {{ notice.body }}
                </p>
              </div>

              <div class="flex items-center gap-1.5 text-slate-400 group-hover:text-[#6D42E8] shrink-0 pt-1">
                <span class="text-xs font-bold hidden sm:inline whitespace-nowrap">Read Circular</span>
                <mat-icon class="text-sm">arrow_forward</mat-icon>
              </div>
            </div>
          </div>
        } @empty {
          <div class="py-16 bg-white rounded-xl border border-dashed border-[#E2E8F0] text-center p-6">
            <div class="w-12 h-12 rounded-xl bg-purple-50 text-[#6D42E8] flex items-center justify-center mx-auto mb-3">
              <mat-icon class="text-2xl">campaign</mat-icon>
            </div>
            <p class="font-bold text-sm text-[#172554]">No notices found matching your criteria.</p>
            <p class="text-xs text-[#64748B] mt-1">Check back later or adjust your search filter.</p>
          </div>
        }
      </div>

      <!-- Detail Slide-Over Drawer -->
      <app-form-drawer
        [isOpen]="selectedNotice() !== null"
        title="Institutional Circular Details"
        subtitle="Official announcement issued to students"
        [showSaveButton]="false"
        (closed)="selectedNotice.set(null)"
      >
        @if (selectedNotice()) {
          @let notice = selectedNotice()!;
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
                <p>Published Date: <strong class="text-[#172554] font-semibold">{{ notice.publishDate }}</strong></p>
                <p>Valid Through: <strong class="text-[#172554] font-semibold">{{ notice.expiryDate }}</strong></p>
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
              <span>Authenticated document verified by Apex Institute Academic Administration.</span>
            </div>
          </div>
        }
      </app-form-drawer>
    </div>
  `
})
export class StudentNotices {
  private readonly commsService = inject(CommunicationService);
  private readonly userService = inject(CurrentUserService);

  protected readonly searchQuery = signal<string>('');
  protected readonly activeTab = signal<'all' | 'important' | 'urgent' | 'pinned'>('all');
  protected readonly selectedNotice = signal<Notice | null>(null);

  // In-memory per-student read notice tracking
  protected readonly readNoticeIds = signal<Set<string>>(new Set(['n-1', 'n-5']));

  protected readonly currentStudent = this.userService.currentStudent;

  // Student is eligible for notices targeted to All, Students, or their specific course
  protected readonly eligibleNotices = computed(() => {
    const student = this.currentStudent();
    const allNotices = this.commsService.notices();

    return allNotices.filter(n => {
      // Must be Published and non-expired
      if (n.status !== 'Published') return false;

      // Audience checks
      if (n.audience === 'All' || n.audience === 'Students') return true;
      if (n.audience === 'Course-wise' && n.courseId && n.courseId === student.courseId) return true;
      return false;
    });
  });

  // Tab counts
  protected readonly tabCounts = computed(() => {
    const list = this.eligibleNotices();
    return {
      all: list.length,
      important: list.filter(n => n.priority === 'High' || n.priority === 'Urgent').length,
      urgent: list.filter(n => n.priority === 'Urgent').length,
      pinned: list.filter(n => n.isPinned).length
    };
  });

  // Filtered and sorted notices
  protected readonly filteredNotices = computed(() => {
    let list = this.eligibleNotices();
    const q = this.searchQuery().trim().toLowerCase();
    const tab = this.activeTab();

    if (q) {
      list = list.filter(n =>
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

    // Pinned notices on top, then sorted by publishDate descending
    return [...list].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
    });
  });

  protected readonly stats = computed<StatItem[]>(() => {
    const list = this.eligibleNotices();
    const important = list.filter(n => n.priority === 'High' || n.priority === 'Urgent').length;
    const unread = list.filter(n => !this.readNoticeIds().has(n.id)).length;

    return [
      {
        label: 'Total Circulars',
        value: list.length,
        icon: 'campaign',
        iconColorClass: 'text-indigo-600',
        iconBgClass: 'bg-indigo-50 border-indigo-100'
      },
      {
        label: 'Important & Urgent',
        value: important,
        icon: 'priority_high',
        iconColorClass: 'text-rose-600',
        iconBgClass: 'bg-rose-50 border-rose-100'
      },
      {
        label: 'Unread Circulars',
        value: unread,
        icon: 'mark_email_unread',
        iconColorClass: 'text-[#6D42E8]',
        iconBgClass: 'bg-purple-50 border-purple-100'
      }
    ];
  });

  protected onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  protected openNotice(notice: Notice): void {
    this.selectedNotice.set(notice);
    this.readNoticeIds.update(set => {
      const updated = new Set(set);
      updated.add(notice.id);
      return updated;
    });
  }

  protected getPriorityBadgeClass(p: NoticePriority): string {
    switch (p) {
      case 'Urgent': return 'bg-rose-100 text-rose-800';
      case 'High': return 'bg-amber-100 text-amber-800';
      case 'Medium': return 'bg-purple-100 text-[#6D42E8]';
      default: return 'bg-slate-100 text-slate-700';
    }
  }
}
