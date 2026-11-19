import { ChangeDetectionStrategy, Component, inject, signal, computed, effect } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { StatusBadge } from '../../../components/shared/status-badge';
import { EmptyState } from '../../../components/shared/empty-state';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ParentPortalFacade, ParentAssignmentItem } from '../shared/parent-portal.facade';

@Component({
  selector: 'app-parent-assignments',
  imports: [MatIconModule, PageHeader, DataToolbar, StatusBadge, EmptyState, FormDrawer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5 font-sans text-[#172554] text-[13px] pb-8 min-w-0">
      <app-page-header
        title="Assignments"
        [subtitle]="child() ? 'Read-only coursework status, submissions, and faculty feedback for ' + child()!.name + ' (' + child()!.section + ').' : 'Select a linked child to view assignments.'"
      />

      @if (child()) {
        <!-- Four Stat Cards: Total, Pending, Submitted, Overdue -->
        <section class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm flex items-center justify-between gap-3">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Total</p>
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

        <!-- Tabs + Subject Filter Toolbar -->
        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 space-y-4">
          <div class="flex items-center gap-6 border-b border-[#E2E8F0] overflow-x-auto">
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

        <!-- Read-only Assignment Cards -->
        @if (filteredItems().length > 0) {
          <div class="space-y-4">
            @for (item of filteredItems(); track item.assignment.id) {
              <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div class="space-y-2 min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="px-2 py-0.5 rounded-lg bg-slate-100 font-mono text-[11px] font-semibold text-[#172554]">
                        {{ item.subjectCode }}
                      </span>
                      <h2 class="text-sm font-bold text-[#172554]">{{ item.assignment.title }}</h2>
                      <app-status-badge [status]="item.displayStatus" />
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
                    </div>

                    @if (item.marksObtained !== undefined) {
                      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-[#6D42E8]">
                        <span class="font-bold">Evaluated: {{ item.marksObtained }} / {{ item.assignment.maxMarks }} marks</span>
                        @if (item.evaluationFeedback) {
                          <span class="text-[#172554] truncate max-w-md">· {{ item.evaluationFeedback }}</span>
                        }
                      </div>
                    }
                  </div>

                  <div class="shrink-0">
                    <button
                      type="button"
                      (click)="selectedItem.set(item)"
                      class="px-3.5 py-2 rounded-xl bg-slate-50 border border-[#E2E8F0] hover:border-[#6D42E8] text-xs font-semibold text-[#172554] hover:text-[#6D42E8] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <mat-icon class="text-sm">visibility</mat-icon>
                      <span>View</span>
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
            <app-empty-state
              icon="assignment_turned_in"
              [title]="'No ' + activeTab().toLowerCase() + ' assignments'"
              message="No assignments match your current tab and subject filter."
              [actionLabel]="hasActiveFilters() ? 'Reset Filters' : ''"
              (actionClicked)="resetFilters()"
            />
          </div>
        }

        <!-- Read-only Detail Drawer (NO Submit Action) -->
        <app-form-drawer
          [isOpen]="selectedItem() !== null"
          title="Assignment Details"
          [subtitle]="'Read-only guardian view for ' + child()!.name"
          [showSaveButton]="false"
          (closed)="selectedItem.set(null)"
        >
          @if (selectedItem(); as detail) {
            <div class="space-y-5">
              <div class="flex items-center gap-2 flex-wrap pb-3 border-b border-[#E2E8F0]">
                <span class="px-2 py-0.5 rounded-lg bg-slate-100 font-mono text-[11px] font-semibold text-[#172554]">
                  {{ detail.subjectCode }}
                </span>
                <app-status-badge [status]="detail.displayStatus" />
                <span class="text-xs text-[#64748B] ml-auto">Max {{ detail.assignment.maxMarks }} marks</span>
              </div>

              <div class="space-y-1">
                <h3 class="text-base font-bold text-[#172554]">{{ detail.assignment.title }}</h3>
                <p class="text-xs text-[#64748B]">
                  {{ detail.assignment.subjectName }} · Faculty: <strong class="text-[#172554]">{{ detail.facultyName }}</strong>
                </p>
              </div>

              <div class="grid grid-cols-2 gap-3 text-xs">
                <div class="p-3 rounded-xl bg-slate-50 border border-[#E2E8F0]">
                  <p class="text-[11px] text-[#64748B] font-semibold uppercase">Assigned On</p>
                  <p class="font-bold text-[#172554] mt-0.5">{{ facade.formatShortDate(detail.assignment.assignedOn) }}</p>
                </div>
                <div class="p-3 rounded-xl bg-slate-50 border border-[#E2E8F0]">
                  <p class="text-[11px] text-[#64748B] font-semibold uppercase">Due Date</p>
                  <p class="font-bold text-[#172554] mt-0.5">{{ facade.formatShortDate(detail.assignment.dueDate) }}</p>
                </div>
              </div>

              <div class="space-y-1.5">
                <p class="text-xs font-bold uppercase tracking-wider text-[#64748B]">Instructions</p>
                <div class="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs text-[#172554] leading-relaxed whitespace-pre-line">
                  {{ detail.assignment.description }}
                </div>
              </div>

              @if (detail.submission && detail.submission.status !== 'Draft') {
                <div class="space-y-3 pt-2 border-t border-[#E2E8F0]">
                  <p class="text-xs font-bold uppercase tracking-wider text-[#64748B]">Student Submission</p>

                  <div class="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs space-y-1">
                    <p class="text-[#64748B]">
                      Submitted Time:
                      <strong class="text-[#172554] ml-1">{{ detail.submittedAtDisplay || '-' }}</strong>
                    </p>
                    @if (detail.submission.answerText) {
                      <p class="text-[#172554] pt-1 leading-relaxed">{{ detail.submission.answerText }}</p>
                    }
                  </div>

                  <div class="space-y-1.5">
                    <p class="text-xs font-semibold text-[#172554]">Attachments</p>
                    @if (detail.attachmentNames.length > 0) {
                      <div class="space-y-1.5">
                        @for (fname of detail.attachmentNames; track fname) {
                          <div class="px-3 py-2 rounded-xl bg-slate-50 border border-[#E2E8F0] flex items-center gap-2 text-xs text-[#172554]">
                            <mat-icon class="text-sm text-[#6D42E8]">attach_file</mat-icon>
                            <span class="font-mono truncate">{{ fname }}</span>
                          </div>
                        }
                      </div>
                    } @else {
                      <p class="text-xs text-[#64748B]">No files attached.</p>
                    }
                  </div>
                </div>
              } @else {
                <div class="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                  <mat-icon class="text-base text-amber-700 shrink-0">info</mat-icon>
                  <span>No submitted work recorded yet. Students submit coursework via the Student Portal.</span>
                </div>
              }

              @if (detail.marksObtained !== undefined || detail.evaluationFeedback) {
                <div class="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-1.5 text-xs">
                  <p class="font-bold text-[#6D42E8]">
                    Faculty Evaluation: {{ detail.marksObtained ?? 0 }} / {{ detail.assignment.maxMarks }} marks
                  </p>
                  @if (detail.evaluationFeedback) {
                    <p class="text-[#172554] leading-relaxed">{{ detail.evaluationFeedback }}</p>
                  }
                  @if (detail.evaluatedBy) {
                    <p class="text-[11px] text-[#64748B]">Evaluated by {{ detail.evaluatedBy }}</p>
                  }
                </div>
              }
            </div>
          }
        </app-form-drawer>
      } @else {
        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
          <app-empty-state
            icon="family_restroom"
            title="No linked child selected"
            message="Select a linked student to view their assignments."
          />
        </div>
      }
    </div>
  `
})
export class ParentAssignments {
  protected readonly facade = inject(ParentPortalFacade);

  protected readonly child = this.facade.selectedChild;
  protected readonly activeTab = signal<'Pending' | 'Submitted' | 'Overdue'>('Pending');
  protected readonly searchQuery = signal<string>('');
  protected readonly subjectFilter = signal<string>('All');
  protected readonly selectedItem = signal<ParentAssignmentItem | null>(null);

  constructor() {
    effect(() => {
      this.child();
      this.subjectFilter.set('All');
      this.selectedItem.set(null);
    });
  }

  protected readonly counts = computed(() => {
    const list = this.facade.selectedAssignments();
    return {
      total: list.length,
      pending: list.filter(a => a.bucket === 'Pending').length,
      submitted: list.filter(a => a.bucket === 'Submitted').length,
      overdue: list.filter(a => a.bucket === 'Overdue').length
    };
  });

  protected readonly subjectOptions = computed<FilterOption[]>(() => {
    const map = new Map<string, string>();
    for (const item of this.facade.selectedAssignments()) {
      map.set(item.assignment.subjectId, item.assignment.subjectName);
    }
    return [
      { label: 'All Subjects', value: 'All' },
      ...Array.from(map.entries()).map(([value, label]) => ({ label, value }))
    ];
  });

  protected readonly hasActiveFilters = computed(
    () => this.searchQuery().trim().length > 0 || this.subjectFilter() !== 'All'
  );

  protected readonly filteredItems = computed(() => {
    const tab = this.activeTab();
    const q = this.searchQuery().trim().toLowerCase();
    const subId = this.subjectFilter();

    return this.facade.selectedAssignments().filter(item => {
      if (item.bucket !== tab) return false;
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

  protected resetFilters(): void {
    this.searchQuery.set('');
    this.subjectFilter.set('All');
  }
}
