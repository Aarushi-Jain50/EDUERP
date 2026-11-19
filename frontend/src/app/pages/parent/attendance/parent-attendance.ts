import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { EmptyState } from '../../../components/shared/empty-state';
import { ParentPortalFacade } from '../shared/parent-portal.facade';
import { AttendanceCalendar } from '../shared/attendance-calendar';

@Component({
  selector: 'app-parent-attendance',
  imports: [MatIconModule, PageHeader, StatStrip, EmptyState, AttendanceCalendar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5 font-sans text-[#172554] text-[13px] pb-8 min-w-0">
      <app-page-header
        title="Attendance"
        [subtitle]="child() ? 'Lecture-wise attendance summary and calendar log for ' + child()!.name + ' (' + child()!.course + ' · ' + child()!.section + ').' : 'Select a linked child to view attendance records.'"
      />

      @if (child(); as c) {
        <!-- Top Summary: SVG Ring + 3 Stat Cards -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div class="lg:col-span-4 bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 flex items-center gap-5">
            <div class="relative w-24 h-24 shrink-0">
              <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#E2E8F0" stroke-width="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  [attr.stroke]="overall().isBelowThreshold ? '#E11D48' : '#6D42E8'"
                  stroke-width="10"
                  stroke-linecap="round"
                  [attr.stroke-dasharray]="circumference"
                  [attr.stroke-dashoffset]="dashOffset()"
                />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span
                  class="text-lg font-bold tabular-nums"
                  [class]="overall().isBelowThreshold ? 'text-rose-600' : 'text-[#172554]'"
                >
                  {{ overall().percentage }}%
                </span>
              </div>
            </div>

            <div class="space-y-1 min-w-0">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Overall Standing</p>
              <p class="text-sm font-bold text-[#172554]">
                {{ overall().isBelowThreshold ? 'Below Minimum Threshold' : 'On Track' }}
              </p>
              <p class="text-xs text-[#64748B]">
                Minimum required: {{ overall().threshold }}%
              </p>
            </div>
          </div>

          <div class="lg:col-span-8 flex flex-col justify-center">
            <app-stat-strip [items]="stats()" />
          </div>
        </div>

        <!-- Calm Threshold Recovery Strip -->
        @if (overall().isBelowThreshold) {
          <div class="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start sm:items-center gap-3 text-amber-900">
            <mat-icon class="text-lg text-amber-700 shrink-0">info</mat-icon>
            <p class="text-[13px] font-medium">
              <strong class="font-bold">{{ c.name }}</strong> needs
              <strong class="font-bold">{{ overall().classesNeeded }}</strong>
              more {{ overall().classesNeeded === 1 ? 'class' : 'classes' }} needed to reach {{ overall().threshold }}% overall attendance.
            </p>
          </div>
        }

        <!-- View Tabs -->
        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div class="px-5 pt-3 border-b border-[#E2E8F0] flex items-center gap-6">
            <button
              type="button"
              (click)="activeTab.set('subject')"
              class="pb-3 text-[13px] font-semibold border-b-2 transition-colors cursor-pointer"
              [class]="activeTab() === 'subject' ? 'border-[#6D42E8] text-[#6D42E8]' : 'border-transparent text-[#64748B] hover:text-[#172554]'"
            >
              Subject-wise
            </button>
            <button
              type="button"
              (click)="activeTab.set('calendar')"
              class="pb-3 text-[13px] font-semibold border-b-2 transition-colors cursor-pointer"
              [class]="activeTab() === 'calendar' ? 'border-[#6D42E8] text-[#6D42E8]' : 'border-transparent text-[#64748B] hover:text-[#172554]'"
            >
              Calendar
            </button>
          </div>

          @if (activeTab() === 'subject') {
            @if (subjectAttendances().length > 0) {
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead class="bg-slate-50 border-b border-[#E2E8F0]">
                    <tr class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th scope="col" class="px-4 py-3">Subject</th>
                      <th scope="col" class="px-4 py-3 text-right">Held</th>
                      <th scope="col" class="px-4 py-3 text-right">Attended</th>
                      <th scope="col" class="px-4 py-3 text-right">%</th>
                      <th scope="col" class="px-4 py-3 min-w-[160px]">Progress</th>
                      <th scope="col" class="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#E2E8F0] text-[13px]">
                    @for (sub of subjectAttendances(); track sub.subjectId) {
                      <tr class="hover:bg-slate-50/70 transition-colors">
                        <td class="px-4 py-3.5">
                          <p class="font-semibold text-[#172554]">{{ sub.name }}</p>
                          <p class="text-[11px] font-mono text-[#64748B]">{{ sub.code }}</p>
                        </td>
                        <td class="px-4 py-3.5 text-right tabular-nums text-[#64748B]">{{ sub.held }}</td>
                        <td class="px-4 py-3.5 text-right tabular-nums font-medium text-[#172554]">{{ sub.attended }}</td>
                        <td
                          class="px-4 py-3.5 text-right tabular-nums font-bold"
                          [class]="sub.isLow ? 'text-rose-600' : 'text-[#172554]'"
                        >
                          {{ sub.percentage }}%
                        </td>
                        <td class="px-4 py-3.5">
                          <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              class="h-full rounded-full"
                              [style.width.%]="sub.percentage"
                              [class]="sub.isLow ? 'bg-rose-500' : 'bg-[#6D42E8]'"
                            ></div>
                          </div>
                        </td>
                        <td class="px-4 py-3.5 text-right">
                          @if (sub.isLow) {
                            <span class="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold">
                              Low
                            </span>
                          } @else {
                            <span class="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                              On Track
                            </span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <app-empty-state
                icon="how_to_reg"
                title="No attendance sessions recorded"
                message="Subject-wise records will appear here once faculty mark lecture attendance for this section."
              />
            }
          }

          @if (activeTab() === 'calendar') {
            <app-attendance-calendar [logs]="logs()" />
          }
        </div>
      } @else {
        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
          <app-empty-state
            icon="family_restroom"
            title="No linked child selected"
            message="Link or select a student from My Children to view attendance logs."
          />
        </div>
      }
    </div>
  `
})
export class ParentAttendance {
  protected readonly facade = inject(ParentPortalFacade);

  protected readonly child = this.facade.selectedChild;
  protected readonly overall = this.facade.selectedOverallAttendance;
  protected readonly subjectAttendances = this.facade.selectedSubjectAttendances;
  protected readonly logs = this.facade.selectedAttendanceLogs;

  protected readonly activeTab = signal<'subject' | 'calendar'>('subject');
  protected readonly circumference = 2 * Math.PI * 40;

  protected readonly dashOffset = computed(() => {
    const pct = Math.max(0, Math.min(100, this.overall().percentage));
    return this.circumference * (1 - pct / 100);
  });

  protected readonly stats = computed<StatItem[]>(() => {
    const o = this.overall();
    return [
      {
        label: 'Total Classes',
        value: o.total,
        subtext: 'Sessions held for section',
        icon: 'event_note',
        iconColorClass: 'text-[#6D42E8]',
        iconBgClass: 'bg-purple-50 border-purple-100'
      },
      {
        label: 'Present',
        value: o.present,
        subtext: o.leave > 0 ? o.leave + ' approved leave' : 'Attended lectures',
        icon: 'check_circle',
        iconColorClass: 'text-emerald-600',
        iconBgClass: 'bg-emerald-50 border-emerald-100'
      },
      {
        label: 'Absent',
        value: o.absent,
        subtext: 'Missed sessions',
        icon: 'cancel',
        iconColorClass: 'text-rose-600',
        iconBgClass: 'bg-rose-50 border-rose-100'
      }
    ];
  });
}
