import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { StatusBadge } from '../../../components/shared/status-badge';
import { EmptyState } from '../../../components/shared/empty-state';
import { StudentPortalFacade } from '../shared/student-portal.facade';

interface SubjectCardSummary {
  subjectId: string;
  code: string;
  name: string;
  totalAssignments: number;
  pendingCount: number;
  totalQuestions: number;
  answeredQuestions: number;
}

@Component({
  selector: 'app-student-assignments',
  imports: [RouterLink, MatIconModule, PageHeader, DataToolbar, StatusBadge, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-[#172554] text-[13px] pb-10 min-w-0">
      <app-page-header
        title="Multi-Subject Assignments"
        [subtitle]="'Select any subject below to complete its 25-question interactive worksheet, attach lab files, and submit coursework for ' + facade.currentStudent().section + '.'"
      />

      <!-- Four Stat Cards: Total, Pending, Submitted, Overdue -->
      <section class="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div class="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm flex items-center justify-between gap-3">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Total Subjects Tasks</p>
            <p class="text-2xl font-bold text-[#172554] mt-1 tabular-nums">{{ counts().total }}</p>
          </div>
          <div class="w-9 h-9 rounded-xl bg-purple-50 text-[#6D42E8] border border-purple-100 flex items-center justify-center shrink-0">
            <mat-icon class="text-lg">assignment</mat-icon>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm flex items-center justify-between gap-3">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Pending</p>
            <p class="text-2xl font-bold text-amber-700 mt-1 tabular-nums">{{ counts().pending }}</p>
          </div>
          <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <mat-icon class="text-lg">pending_actions</mat-icon>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm flex items-center justify-between gap-3">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Submitted</p>
            <p class="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">{{ counts().submitted }}</p>
          </div>
          <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <mat-icon class="text-lg">task_alt</mat-icon>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm flex items-center justify-between gap-3">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Overdue</p>
            <p class="text-2xl font-bold text-rose-600 mt-1 tabular-nums">{{ counts().overdue }}</p>
          </div>
          <div class="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
            <mat-icon class="text-lg">assignment_late</mat-icon>
          </div>
        </div>
      </section>

      <!-- Select Subject Card Picker -->
      @if (subjectSummaries().length > 0) {
        <section class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 sm:p-5 space-y-3.5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 class="text-sm font-bold text-[#172554]">Select Subject</h2>
              <p class="text-xs text-[#64748B]">Switch between enrolled subjects — each assignment contains 25 structured questions to complete.</p>
            </div>
            @if (subjectFilter() !== 'All') {
              <button
                type="button"
                (click)="selectSubject('All')"
                class="text-xs font-semibold text-[#6D42E8] hover:underline cursor-pointer self-start sm:self-auto whitespace-nowrap"
              >
                Show All Subjects ({{ counts().total }})
              </button>
            }
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              type="button"
              (click)="selectSubject('All')"
              class="p-3.5 rounded-xl border text-left transition-all cursor-pointer space-y-2"
              [class]="subjectFilter() === 'All'
                ? 'border-[#6D42E8] bg-purple-50/70 shadow-xs'
                : 'border-[#E2E8F0] bg-slate-50/70 hover:border-[#6D42E8]/50'"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-mono text-[11px] font-bold text-[#6D42E8]">ALL SUBJECTS</span>
                <span class="text-[11px] font-semibold text-[#64748B] tabular-nums">{{ counts().total }} tasks</span>
              </div>
              <p class="font-bold text-[13px] text-[#172554]">Combined Coursework View</p>
              <p class="text-[11px] text-[#64748B]">Browse pending, submitted, and overdue sheets across every course.</p>
            </button>

            @for (sub of subjectSummaries(); track sub.subjectId) {
              <button
                type="button"
                (click)="selectSubject(sub.subjectId)"
                class="p-3.5 rounded-xl border text-left transition-all cursor-pointer space-y-2"
                [class]="subjectFilter() === sub.subjectId
                  ? 'border-[#6D42E8] bg-purple-50/70 shadow-xs'
                  : 'border-[#E2E8F0] bg-white hover:border-[#6D42E8]/50 hover:bg-slate-50/60'"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="font-mono text-[11px] font-bold text-[#6D42E8]">{{ sub.code }}</span>
                  <span class="text-[11px] font-semibold text-[#64748B] tabular-nums">
                    {{ sub.answeredQuestions }}/{{ sub.totalQuestions }} Qs
                  </span>
                </div>
                <p class="font-bold text-[13px] text-[#172554] line-clamp-1">{{ sub.name }}</p>
                <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-[#6D42E8] rounded-full transition-all"
                    [style.width.%]="sub.totalQuestions > 0 ? (sub.answeredQuestions / sub.totalQuestions) * 100 : 0"
                  ></div>
                </div>
              </button>
            }
          </div>
        </section>
      }

      <!-- Tabs + Filter Toolbar -->
      <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 space-y-4">
        <div class="flex items-center gap-6 border-b border-[#E2E8F0] overflow-x-auto">
          <button
            type="button"
            (click)="activeTab.set('All')"
            class="pb-3 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer"
            [class]="activeTab() === 'All' ? 'border-[#6D42E8] text-[#6D42E8]' : 'border-transparent text-[#64748B] hover:text-[#172554]'"
          >
            All ({{ counts().total }})
          </button>
          <button
            type="button"
            (click)="activeTab.set('Pending')"
            class="pb-3 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer"
            [class]="activeTab() === 'Pending' ? 'border-[#6D42E8] text-[#6D42E8]' : 'border-transparent text-[#64748B] hover:text-[#172554]'"
          >
            Pending ({{ counts().pending }})
          </button>
          <button
            type="button"
            (click)="activeTab.set('Submitted')"
            class="pb-3 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer"
            [class]="activeTab() === 'Submitted' ? 'border-[#6D42E8] text-[#6D42E8]' : 'border-transparent text-[#64748B] hover:text-[#172554]'"
          >
            Submitted ({{ counts().submitted }})
          </button>
          <button
            type="button"
            (click)="activeTab.set('Overdue')"
            class="pb-3 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer"
            [class]="activeTab() === 'Overdue' ? 'border-[#6D42E8] text-[#6D42E8]' : 'border-transparent text-[#64748B] hover:text-[#172554]'"
          >
            Overdue ({{ counts().overdue }})
          </button>
        </div>

        <app-data-toolbar
          searchPlaceholder="Search assignments by title or description..."
          [searchValue]="searchQuery()"
          (searchChange)="searchQuery.set($event)"
          [filter1Value]="subjectFilter()"
          [filter1Options]="subjectOptions()"
          (filter1Change)="subjectFilter.set($event)"
          [hasActiveFilters]="hasActiveFilters()"
          (resetClicked)="resetFilters()"
        />
      </div>

      <!-- Clickable Assignment Card List -->
      @if (filteredItems().length > 0) {
        <div class="space-y-4">
          @for (item of filteredItems(); track item.assignment.id) {
            <a
              [routerLink]="['/student/assignments', item.assignment.id]"
              class="block bg-white rounded-xl border border-[#E2E8F0] hover:border-[#6D42E8] shadow-sm p-4 sm:p-5 transition-colors group"
            >
              <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="space-y-2.5 min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="px-2 py-0.5 rounded-lg bg-slate-100 font-mono text-[11px] font-semibold text-[#172554] whitespace-nowrap">
                      {{ item.subjectCode }}
                    </span>
                    <h2 class="text-sm font-bold text-[#172554] group-hover:text-[#6D42E8] transition-colors">
                      {{ item.assignment.title }}
                    </h2>
                    <app-status-badge [status]="item.displayStatus" />
                    @if (item.version > 0) {
                      <span class="px-2 py-0.5 rounded-full bg-slate-100 text-[#64748B] border border-[#E2E8F0] text-[11px] font-semibold whitespace-nowrap">
                        v{{ item.version }}
                      </span>
                    }
                  </div>

                  <p class="text-xs text-[#64748B] leading-relaxed line-clamp-2">{{ item.assignment.description }}</p>

                  <!-- Worksheet 25-Question Progress Bar -->
                  <div class="max-w-md space-y-1">
                    <div class="flex items-center justify-between text-[11px]">
                      <span class="font-semibold text-[#172554]">Question Worksheet Progress</span>
                      <span class="font-bold text-[#6D42E8] tabular-nums">
                        {{ item.answeredQuestions }} / {{ item.totalQuestions }} Questions Answered
                      </span>
                    </div>
                    <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        class="h-full bg-[#6D42E8] rounded-full transition-all"
                        [style.width.%]="item.totalQuestions > 0 ? (item.answeredQuestions / item.totalQuestions) * 100 : 0"
                      ></div>
                    </div>
                  </div>

                  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748B]">
                    <span>{{ item.assignment.subjectName }}</span>
                    <span aria-hidden="true">·</span>
                    <span>Faculty: <strong class="text-[#172554] font-medium">{{ item.facultyName }}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span [class]="item.isOverdue ? 'text-rose-600 font-semibold' : 'text-[#172554] font-medium'">
                      {{ item.dueText }}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Max {{ item.assignment.maxMarks }} marks</span>
                    @if (item.attachmentsCount > 0) {
                      <span aria-hidden="true">·</span>
                      <span class="inline-flex items-center gap-1 text-[#172554] font-medium">
                        <mat-icon class="text-sm text-[#6D42E8]">attach_file</mat-icon>
                        <span>{{ item.attachmentsCount }} {{ item.attachmentsCount === 1 ? 'file' : 'files' }}</span>
                      </span>
                    }
                  </div>

                  @if (item.marksObtained !== undefined) {
                    <div class="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-[#6D42E8] max-w-full">
                      <span class="font-bold whitespace-nowrap">Evaluated: {{ item.marksObtained }} / {{ item.assignment.maxMarks }} marks</span>
                      @if (item.evaluationFeedback) {
                        <span class="text-[#172554] break-words sm:truncate sm:max-w-md">· {{ item.evaluationFeedback }}</span>
                      }
                    </div>
                  }
                </div>

                <div class="shrink-0 flex items-center gap-2 w-full md:w-auto">
                  @if (item.bucket !== 'Submitted') {
                    <span class="w-full md:w-auto justify-center gradient-accent text-white px-4 py-2.5 md:py-2 rounded-xl text-xs font-semibold shadow-sm inline-flex items-center gap-1.5 whitespace-nowrap">
                      <mat-icon class="text-sm">edit_note</mat-icon>
                      <span>{{ item.displayStatus === 'Draft' ? 'Continue 25-Q Worksheet' : 'Open 25 Questions' }}</span>
                    </span>
                  } @else {
                    <span class="w-full md:w-auto justify-center px-3.5 py-2.5 md:py-2 rounded-xl bg-slate-50 border border-[#E2E8F0] group-hover:border-[#6D42E8] text-xs font-semibold text-[#172554] group-hover:text-[#6D42E8] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap">
                      <span>{{ item.displayStatus === 'Evaluated' ? 'View Evaluation' : 'Review Answers' }}</span>
                      <mat-icon class="text-sm">chevron_right</mat-icon>
                    </span>
                  }
                </div>
              </div>
            </a>
          }
        </div>
      } @else {
        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
          <app-empty-state
            icon="assignment_turned_in"
            [title]="'No ' + activeTab().toLowerCase() + ' assignments'"
            message="No assignments match your current tab and subject selection."
            [actionLabel]="hasActiveFilters() ? 'Reset Filters' : ''"
            (actionClicked)="resetFilters()"
          />
        </div>
      }
    </div>
  `,
})
export class StudentAssignments {
  protected readonly facade = inject(StudentPortalFacade);

  protected readonly activeTab = signal<'All' | 'Pending' | 'Submitted' | 'Overdue'>('All');
  protected readonly searchQuery = signal<string>('');
  protected readonly subjectFilter = signal<string>('All');

  protected readonly counts = computed(() => {
    const list = this.facade.studentAssignments();
    return {
      total: list.length,
      pending: list.filter(a => a.bucket === 'Pending').length,
      submitted: list.filter(a => a.bucket === 'Submitted').length,
      overdue: list.filter(a => a.bucket === 'Overdue').length,
    };
  });

  protected readonly subjectSummaries = computed<SubjectCardSummary[]>(() => {
    const map = new Map<string, SubjectCardSummary>();
    for (const item of this.facade.studentAssignments()) {
      const existing = map.get(item.assignment.subjectId);
      const isPending = item.bucket !== 'Submitted' ? 1 : 0;
      if (existing) {
        existing.totalAssignments += 1;
        existing.pendingCount += isPending;
        existing.totalQuestions += item.totalQuestions;
        existing.answeredQuestions += item.answeredQuestions;
      } else {
        map.set(item.assignment.subjectId, {
          subjectId: item.assignment.subjectId,
          code: item.subjectCode,
          name: item.assignment.subjectName,
          totalAssignments: 1,
          pendingCount: isPending,
          totalQuestions: item.totalQuestions,
          answeredQuestions: item.answeredQuestions,
        });
      }
    }
    return Array.from(map.values());
  });

  protected readonly subjectOptions = computed<FilterOption[]>(() => {
    return [
      { label: 'All Subjects', value: 'All' },
      ...this.subjectSummaries().map(s => ({ label: `${s.code} — ${s.name}`, value: s.subjectId })),
    ];
  });

  protected readonly hasActiveFilters = computed(
    () => this.searchQuery().trim().length > 0 || this.subjectFilter() !== 'All' || this.activeTab() !== 'All'
  );

  protected readonly filteredItems = computed(() => {
    const tab = this.activeTab();
    const q = this.searchQuery().trim().toLowerCase();
    const subId = this.subjectFilter();

    return this.facade.studentAssignments().filter(item => {
      if (tab !== 'All' && item.bucket !== tab) return false;
      if (subId !== 'All' && item.assignment.subjectId !== subId) return false;
      if (q) {
        const matches =
          item.assignment.title.toLowerCase().includes(q) ||
          item.assignment.description.toLowerCase().includes(q) ||
          item.assignment.subjectName.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  });

  protected selectSubject(subjectId: string): void {
    this.subjectFilter.set(subjectId);
    if (subjectId !== 'All') {
      this.activeTab.set('All');
    }
  }

  protected resetFilters(): void {
    this.activeTab.set('All');
    this.searchQuery.set('');
    this.subjectFilter.set('All');
  }
}
