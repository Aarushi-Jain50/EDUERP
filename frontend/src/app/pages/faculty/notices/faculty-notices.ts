import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { CommunicationService } from '../../../services/communication.service';
import { AcademicService } from '../../../services/academic.service';
import { CurrentUserService } from '../../../services/current-user.service';
import { Notice, NoticePriority } from '../../../models/communication.model';

@Component({
  selector: 'app-faculty-notices',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, PageHeader, StatStrip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-slate-800 pb-20">
      <app-page-header
        title="Notice Board"
        subtitle="Official institutional circulars, academic advisories and faculty announcements."
      />

      <div class="mb-6 sm:mb-8">
        <app-stat-strip [items]="stats()" />
      </div>

      <!-- Toolbar & Filters -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div class="flex items-center gap-2 flex-wrap">
          <button
            (click)="activeTab.set('all')"
            [class]="activeTab() === 'all' ? 'bg-[#6D42E8] text-white font-bold' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 font-medium'"
            class="px-3.5 sm:px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            All Notices
          </button>
          <button
            (click)="activeTab.set('important')"
            [class]="activeTab() === 'important' ? 'bg-[#6D42E8] text-white font-bold' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 font-medium'"
            class="px-3.5 sm:px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            High & Urgent
          </button>
          <button
            (click)="activeTab.set('urgent')"
            [class]="activeTab() === 'urgent' ? 'bg-[#6D42E8] text-white font-bold' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 font-medium'"
            class="px-3.5 sm:px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            Urgent Only
          </button>
          <button
            (click)="activeTab.set('pinned')"
            [class]="activeTab() === 'pinned' ? 'bg-[#6D42E8] text-white font-bold' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 font-medium'"
            class="px-3.5 sm:px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            Pinned Notices
          </button>
        </div>

        <div class="relative w-full sm:min-w-[240px] sm:flex-1 sm:max-w-md">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <mat-icon class="text-sm">search</mat-icon>
          </span>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Search notice title or content..."
            class="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]"
          />
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
            class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer relative group"
          >
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
              <div class="space-y-2 flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  @if (notice.isPinned) {
                    <span class="px-2 py-0.5 rounded bg-purple-50 text-[#6D42E8] font-bold text-[10px] uppercase flex items-center gap-1 border border-purple-100 whitespace-nowrap">
                      <mat-icon class="text-xs shrink-0">push_pin</mat-icon> Pinned
                    </span>
                  }
                  <span [class]="getPriorityBadgeClass(notice.priority)" class="px-2.5 py-0.5 rounded-full font-extrabold text-[10px] uppercase tracking-wider whitespace-nowrap">
                    {{ notice.priority }} Priority
                  </span>
                  <span class="text-xs text-slate-400 whitespace-nowrap">• {{ notice.publishDate }}</span>
                  <span class="text-xs text-slate-400">• By {{ notice.createdBy }}</span>
                </div>

                <div class="flex items-center gap-2 min-w-0">
                  @if (isUnread) {
                    <span class="w-2.5 h-2.5 rounded-full bg-[#6D42E8] shrink-0" title="Unread Notice"></span>
                  }
                  <h3 [class]="isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-800'" class="text-sm group-hover:text-[#6D42E8] transition-colors">
                    {{ notice.title }}
                  </h3>
                </div>

                <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {{ notice.body }}
                </p>
              </div>

              <div class="flex items-center gap-1.5 text-slate-400 group-hover:text-[#6D42E8] shrink-0 sm:pt-1 whitespace-nowrap">
                <span class="text-xs font-bold">Read Circular</span>
                <mat-icon class="text-sm shrink-0">arrow_forward</mat-icon>
              </div>
            </div>
          </div>
        } @empty {
          <div class="py-12 sm:py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-300 text-center">
            <mat-icon class="text-4xl text-slate-300 mb-2">campaign</mat-icon>
            <p class="font-bold text-sm text-slate-700">No notices found matching your criteria.</p>
            <p class="text-xs text-slate-400 mt-1">Check back later or try adjusting your search filters.</p>
          </div>
        }
      </div>

      <!-- Notice Detail Drawer -->
      @if (selectedNotice()) {
        <div class="fixed inset-0 z-50 flex justify-end">
          <button type="button" aria-label="Close circular drawer" (click)="selectedNotice.set(null)" class="fixed inset-0 bg-black/50 w-full h-full border-0"></button>
          <div class="relative w-full max-w-xl bg-white h-full shadow-2xl z-10 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6">
            <div class="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div class="flex items-center flex-wrap gap-2 min-w-0">
                <span [class]="getPriorityBadgeClass(selectedNotice()!.priority)" class="px-2.5 py-0.5 rounded-full font-extrabold text-[10px] uppercase whitespace-nowrap">
                  {{ selectedNotice()!.priority }}
                </span>
                <span class="text-xs font-bold text-slate-500">Target: {{ selectedNotice()!.audience }}</span>
              </div>
              <button (click)="selectedNotice.set(null)" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer shrink-0">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="space-y-4">
              <h2 class="text-lg font-black text-slate-900 leading-snug">
                {{ selectedNotice()!.title }}
              </h2>

              <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1 text-slate-600">
                <p>Issued By: <strong class="text-slate-900">{{ selectedNotice()!.createdBy }}</strong></p>
                <p>Published On: <strong class="text-slate-900">{{ selectedNotice()!.publishDate }}</strong> (Valid until {{ selectedNotice()!.expiryDate }})</p>
              </div>

              <div class="prose text-xs text-slate-700 leading-relaxed space-y-3 pt-2">
                <p class="whitespace-pre-line">{{ selectedNotice()!.body }}</p>
              </div>
            </div>

            <div class="mt-auto pt-6 border-t border-slate-100 flex justify-end">
              <button
                (click)="selectedNotice.set(null)"
                class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Close Circular
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class FacultyNoticesPage {
  private readonly commsService = inject(CommunicationService);
  private readonly academicService = inject(AcademicService);
  private readonly userService = inject(CurrentUserService);

  protected searchQuery = '';
  protected readonly activeTab = signal<'all' | 'important' | 'urgent' | 'pinned'>('all');
  protected readonly selectedNotice = signal<Notice | null>(null);

  // Per-user read notice tracking
  protected readonly readNoticeIds = signal<Set<string>>(new Set(['n-1']));

  protected readonly currentFaculty = this.userService.currentFaculty;

  // Faculty's allocated courses for filtering
  protected readonly myAllocatedCourses = computed(() => {
    const fac = this.currentFaculty();
    const allocs = this.academicService.subjectAllocations().filter(a => a.faculty.toLowerCase().trim() === fac.name.toLowerCase().trim());
    return new Set(allocs.map(a => a.course));
  });

  // Eligible notices for this faculty
  protected readonly eligibleNotices = computed(() => {
    const allNotices = this.commsService.notices();
    const myCourses = this.myAllocatedCourses();

    return allNotices.filter(n => {
      if (n.status !== 'Published') return false;

      // Audience check
      if (n.audience === 'All' || n.audience === 'Faculty') return true;
      if (n.audience === 'Course-wise' && n.courseId && myCourses.has(n.courseId)) return true;
      return false;
    });
  });

  // Filtered and sorted notices
  protected readonly filteredNotices = computed(() => {
    let list = this.eligibleNotices();
    const q = this.searchQuery.trim().toLowerCase();
    const tab = this.activeTab();

    if (q) {
      list = list.filter(n => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
    }

    if (tab === 'important') {
      list = list.filter(n => n.priority === 'High' || n.priority === 'Urgent');
    } else if (tab === 'urgent') {
      list = list.filter(n => n.priority === 'Urgent');
    } else if (tab === 'pinned') {
      list = list.filter(n => n.isPinned);
    }

    // Sort pinned notices on top, then by date descending
    return [...list].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
    });
  });

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
      case 'Medium': return 'bg-purple-100 text-purple-800';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  protected readonly stats = computed<StatItem[]>(() => {
    const list = this.eligibleNotices();
    const important = list.filter(n => n.priority === 'High' || n.priority === 'Urgent').length;
    const unread = list.filter(n => !this.readNoticeIds().has(n.id)).length;

    return [
      { label: 'Total Circulars', value: list.length, icon: 'campaign', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Important & Urgent', value: important, icon: 'priority_high', iconColorClass: 'text-rose-600', iconBgClass: 'bg-rose-50 border-rose-100' },
      { label: 'Unread Notices', value: unread, icon: 'mark_email_unread', iconColorClass: 'text-[#6D42E8]', iconBgClass: 'bg-purple-50 border-purple-100' }
    ];
  });
}
