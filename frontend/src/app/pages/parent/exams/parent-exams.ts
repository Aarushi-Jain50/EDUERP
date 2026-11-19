import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { EmptyState } from '../../../components/shared/empty-state';
import { ParentPortalFacade } from '../shared/parent-portal.facade';

@Component({
  selector: 'app-parent-exams',
  imports: [RouterLink, MatIconModule, PageHeader, StatStrip, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5 font-sans text-[#172554] text-[13px] pb-8 min-w-0">
      <app-page-header
        title="Examinations"
        [subtitle]="child() ? 'Examination date sheet and published result links for ' + child()!.name + ' (' + child()!.course + ' · ' + child()!.semester + ').' : 'Select a linked child to inspect exams.'"
      />

      @if (child()) {
        <app-stat-strip [items]="stats()" />

        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <!-- Tabs -->
          <div class="px-5 pt-3 border-b border-[#E2E8F0] flex items-center gap-6">
            <button
              type="button"
              (click)="activeTab.set('upcoming')"
              class="pb-3 text-[13px] font-semibold border-b-2 transition-colors cursor-pointer"
              [class]="activeTab() === 'upcoming' ? 'border-[#6D42E8] text-[#6D42E8]' : 'border-transparent text-[#64748B] hover:text-[#172554]'"
            >
              Upcoming ({{ examGroups().upcoming.length }})
            </button>
            <button
              type="button"
              (click)="activeTab.set('completed')"
              class="pb-3 text-[13px] font-semibold border-b-2 transition-colors cursor-pointer"
              [class]="activeTab() === 'completed' ? 'border-[#6D42E8] text-[#6D42E8]' : 'border-transparent text-[#64748B] hover:text-[#172554]'"
            >
              Completed ({{ examGroups().completed.length }})
            </button>
          </div>

          <!-- Upcoming Timeline -->
          @if (activeTab() === 'upcoming') {
            @if (examGroups().upcoming.length > 0) {
              <div class="p-5 space-y-4">
                @for (item of examGroups().upcoming; track item.exam.id) {
                  <div class="p-4 rounded-xl border border-[#E2E8F0] bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div class="flex items-start sm:items-center gap-4 min-w-0">
                      <div class="w-14 h-14 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col items-center justify-center shrink-0">
                        <span class="text-base font-bold text-[#172554] leading-none tabular-nums">{{ item.dayNumber }}</span>
                        <span class="text-[11px] font-semibold uppercase text-[#6D42E8] mt-1">{{ item.monthShort }}</span>
                      </div>

                      <div class="space-y-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <h2 class="text-sm font-bold text-[#172554]">{{ item.exam.title }}</h2>
                          <span class="px-2 py-0.5 rounded-full bg-purple-50 text-[#6D42E8] border border-purple-200 text-[11px] font-semibold">
                            {{ item.exam.type }}
                          </span>
                        </div>
                        <p class="text-xs font-medium text-[#172554]">
                          {{ item.exam.subjectName }}
                          <span class="font-mono text-[#64748B] ml-1">({{ item.subjectCode }})</span>
                        </p>
                        <p class="text-xs text-[#64748B] tabular-nums">
                          Time: {{ item.exam.time }} · Duration: {{ item.exam.duration }} mins · Max Marks: {{ item.exam.maxMarks }}
                        </p>
                      </div>
                    </div>

                    <span class="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold shrink-0 self-start sm:self-center">
                      {{ item.countdownLabel }}
                    </span>
                  </div>
                }
              </div>
            } @else {
              <app-empty-state
                icon="event_note"
                title="No upcoming exams scheduled"
                message="No upcoming examinations are scheduled for this semester yet."
              />
            }
          }

          <!-- Completed List -->
          @if (activeTab() === 'completed') {
            @if (examGroups().completed.length > 0) {
              <div class="divide-y divide-[#E2E8F0]">
                @for (item of examGroups().completed; track item.exam.id) {
                  <div class="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                    <div class="space-y-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-sm font-bold text-[#172554]">{{ item.exam.title }}</span>
                        <span class="px-2 py-0.5 rounded-full bg-slate-100 text-[#64748B] border border-[#E2E8F0] text-[11px] font-medium">
                          {{ item.exam.semester }}
                        </span>
                      </div>
                      <p class="text-xs text-[#64748B]">
                        {{ item.exam.subjectName }} · Held on {{ facade.formatShortDate(item.exam.date) }} · Max {{ item.exam.maxMarks }} marks
                      </p>
                    </div>

                    <div class="shrink-0">
                      @if (item.hasPublishedResult) {
                        <a
                          routerLink="/parent/results"
                          [queryParams]="{ semester: item.exam.semester }"
                          class="px-3.5 py-2 rounded-xl border border-[#6D42E8]/30 bg-purple-50 hover:bg-purple-100/70 text-xs font-semibold text-[#6D42E8] inline-flex items-center gap-1.5 transition-colors"
                        >
                          <mat-icon class="text-sm">grade</mat-icon>
                          <span>View Result</span>
                        </a>
                      } @else {
                        <span class="text-xs text-[#64748B] font-medium">Result pending</span>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else {
              <app-empty-state
                icon="history_edu"
                title="No completed exams"
                message="Completed examinations for this child's course will appear here."
              />
            }
          }
        </div>
      } @else {
        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
          <app-empty-state
            icon="family_restroom"
            title="No linked child selected"
            message="Select a linked student to view their examination schedule."
          />
        </div>
      }
    </div>
  `
})
export class ParentExams {
  protected readonly facade = inject(ParentPortalFacade);

  protected readonly child = this.facade.selectedChild;
  protected readonly activeTab = signal<'upcoming' | 'completed'>('upcoming');
  protected readonly examGroups = this.facade.selectedExamGroups;

  protected readonly stats = computed<StatItem[]>(() => {
    const groups = this.examGroups();
    const nextExam = groups.upcoming[0];
    return [
      {
        label: 'Upcoming',
        value: groups.upcoming.length,
        subtext: this.child()?.semester || 'Current semester',
        icon: 'event_note',
        iconColorClass: 'text-[#6D42E8]',
        iconBgClass: 'bg-purple-50 border-purple-100'
      },
      {
        label: 'Completed',
        value: groups.completed.length,
        subtext: 'All semesters recorded',
        icon: 'task_alt',
        iconColorClass: 'text-emerald-600',
        iconBgClass: 'bg-emerald-50 border-emerald-100'
      },
      {
        label: 'Next Exam',
        value: nextExam ? this.facade.formatShortDate(nextExam.exam.date) : 'None',
        subtext: nextExam ? nextExam.exam.subjectName : 'No upcoming schedule',
        icon: 'schedule',
        iconColorClass: 'text-indigo-600',
        iconBgClass: 'bg-indigo-50 border-indigo-100'
      }
    ];
  });
}
