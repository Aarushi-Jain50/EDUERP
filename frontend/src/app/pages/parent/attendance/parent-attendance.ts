import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { EmptyState } from '../../../components/shared/empty-state';
import { ChartCard } from '../../../components/reports/chart-card';
import { exportToPdf } from '../../../utils/export.helper';
import { ParentPortalFacade } from '../shared/parent-portal.facade';
import { AttendanceCalendar } from '../shared/attendance-calendar';

@Component({
  selector: 'app-parent-attendance',
  imports: [MatIconModule, BaseChartDirective, PageHeader, StatStrip, EmptyState, ChartCard, AttendanceCalendar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5 font-sans text-[#172554] text-[13px] pb-8 min-w-0">
      <app-page-header
        title="Attendance"
        [subtitle]="child() ? 'Lecture-wise attendance summary, trend chart, and calendar log for ' + child()!.name + ' (' + child()!.course + ' · ' + child()!.section + ').' : 'Select a linked child to view attendance records.'"
        [actionLabel]="child() && subjectAttendances().length > 0 ? 'Download Report PDF' : ''"
        actionIcon="picture_as_pdf"
        (actionClicked)="downloadAttendancePdf()"
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
            <button
              type="button"
              (click)="activeTab.set('trend')"
              class="pb-3 text-[13px] font-semibold border-b-2 transition-colors cursor-pointer"
              [class]="activeTab() === 'trend' ? 'border-[#6D42E8] text-[#6D42E8]' : 'border-transparent text-[#64748B] hover:text-[#172554]'"
            >
              Trend Chart
            </button>
          </div>

          @if (activeTab() === 'subject') {
            @if (subjectAttendances().length > 0) {
              <!-- Mobile Card View (< md) -->
              <div class="md:hidden divide-y divide-[#E2E8F0]">
                @for (sub of subjectAttendances(); track sub.subjectId) {
                  <div class="p-4 space-y-2.5">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0 flex-1">
                        <p class="font-semibold text-[#172554] leading-snug">{{ sub.name }}</p>
                        <p class="text-[11px] font-mono text-[#64748B] mt-0.5">{{ sub.code }}</p>
                      </div>
                      @if (sub.isLow) {
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold whitespace-nowrap shrink-0">
                          Low
                        </span>
                      } @else {
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold whitespace-nowrap shrink-0">
                          On Track
                        </span>
                      }
                    </div>

                    <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        class="h-full rounded-full"
                        [style.width.%]="sub.percentage"
                        [class]="sub.isLow ? 'bg-rose-500' : 'bg-[#6D42E8]'"
                      ></div>
                    </div>

                    <div class="flex items-center justify-between text-xs">
                      <span class="text-[#64748B] tabular-nums">
                        Attended: <strong class="text-[#172554]">{{ sub.attended }}</strong> / {{ sub.held }} classes
                      </span>
                      <span
                        class="font-bold tabular-nums"
                        [class]="sub.isLow ? 'text-rose-600' : 'text-[#172554]'"
                      >
                        {{ sub.percentage }}%
                      </span>
                    </div>
                  </div>
                }
              </div>

              <!-- Desktop Table View (>= md) -->
              <div class="hidden md:block overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead class="bg-slate-50 border-b border-[#E2E8F0]">
                    <tr class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th scope="col" class="px-4 py-3 whitespace-nowrap">Subject</th>
                      <th scope="col" class="px-4 py-3 text-right whitespace-nowrap">Held</th>
                      <th scope="col" class="px-4 py-3 text-right whitespace-nowrap">Attended</th>
                      <th scope="col" class="px-4 py-3 text-right whitespace-nowrap">%</th>
                      <th scope="col" class="px-4 py-3 min-w-[160px] whitespace-nowrap">Progress</th>
                      <th scope="col" class="px-4 py-3 text-right whitespace-nowrap">Status</th>
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
                        <td class="px-4 py-3.5 text-right whitespace-nowrap">
                          @if (sub.isLow) {
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold whitespace-nowrap">
                              Low
                            </span>
                          } @else {
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold whitespace-nowrap">
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

          @if (activeTab() === 'trend') {
            <div class="p-4 sm:p-5">
              <app-chart-card
                title="Cumulative Attendance Trajectory"
                [subtitle]="'Checkpoint attendance progression vs ' + overall().threshold + '% minimum requirement'"
                [isEmpty]="trendPoints().length === 0"
              >
                <div class="w-full h-full">
                  <canvas baseChart [data]="trendChartData()" [options]="lineOptions" [type]="'line'"></canvas>
                </div>
              </app-chart-card>
            </div>
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
  protected readonly trendPoints = computed(() => this.facade.selectedSnapshot()?.attendanceTrend || []);

  protected readonly activeTab = signal<'subject' | 'calendar' | 'trend'>('subject');
  protected readonly circumference = 2 * Math.PI * 40;

  protected readonly dashOffset = computed(() => {
    const pct = Math.max(0, Math.min(100, this.overall().percentage));
    return this.circumference * (1 - pct / 100);
  });

  protected readonly trendChartData = computed<ChartData<'line'>>(() => {
    const pts = this.trendPoints();
    return {
      labels: pts.map(p => p.label),
      datasets: [
        {
          label: 'Attendance %',
          data: pts.map(p => p.percentage),
          borderColor: '#6D42E8',
          backgroundColor: 'rgba(109, 66, 232, 0.12)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointBackgroundColor: '#D946EF'
        }
      ]
    };
  });

  protected readonly lineOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 0, max: 100, grid: { color: '#F1F5F9' }, ticks: { font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } }
    }
  };

  protected downloadAttendancePdf(): void {
    const c = this.child();
    if (!c) return;
    const o = this.overall();
    const cols = ['Subject Code', 'Subject Name', 'Held', 'Attended', 'Absent', 'Leave', 'Percentage', 'Standing'];
    const rows = this.subjectAttendances().map(s => [
      s.code,
      s.name,
      s.held,
      s.attended,
      s.absent,
      s.leave,
      `${s.percentage}%`,
      s.isLow ? 'Low' : 'On Track'
    ]);

    exportToPdf(
      'Official Attendance Monitoring Report',
      cols,
      rows.length > 0 ? rows : [['-', 'No subject sessions recorded', 0, 0, 0, 0, '0%', '-']],
      `${c.enrollmentNo}-attendance-report`,
      [
        `Student: ${c.name} (${c.enrollmentNo}) | ${c.course} · ${c.semester} · Section ${c.section}`,
        `Overall Attendance: ${o.percentage}% (${o.present} Present / ${o.total} Sessions) | Threshold: ${o.threshold}%`
      ]
    );
  }

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
