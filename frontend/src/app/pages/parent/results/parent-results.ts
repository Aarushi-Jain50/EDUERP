import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { PageHeader } from '../../../components/shared/page-header';
import { StatusBadge } from '../../../components/shared/status-badge';
import { EmptyState } from '../../../components/shared/empty-state';
import { ChartCard } from '../../../components/reports/chart-card';
import { exportToPdf } from '../../../utils/export.helper';
import { ParentPortalFacade } from '../shared/parent-portal.facade';

@Component({
  selector: 'app-parent-results',
  imports: [MatIconModule, BaseChartDirective, PageHeader, StatusBadge, EmptyState, ChartCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5 font-sans text-[#172554] text-[13px] pb-8 min-w-0">
      <app-page-header
        title="Results & Grade Card"
        [subtitle]="child() ? 'Published examination marks, SGPA/CGPA, and score trend for ' + child()!.name + '.' : 'Select a linked child to inspect results.'"
        [actionLabel]="semesterResults().length > 0 ? 'Download PDF' : ''"
        actionIcon="picture_as_pdf"
        (actionClicked)="downloadGradeCardPdf()"
      />

      @if (child(); as c) {
        <!-- Semester Selector -->
        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2 text-xs text-[#64748B]">
            <mat-icon class="text-base text-[#6D42E8]">school</mat-icon>
            <span>
              <strong class="text-[#172554]">{{ c.enrollmentNo }}</strong> · {{ c.course }}
            </span>
          </div>

          <div class="flex items-center gap-2.5">
            <label for="parent-semester-filter" class="text-xs font-semibold text-[#64748B] whitespace-nowrap">Semester:</label>
            <select
              id="parent-semester-filter"
              [value]="selectedSemester()"
              (change)="onSemesterChange($event)"
              class="h-9 px-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#172554] focus:outline-none focus:border-[#6D42E8] cursor-pointer"
            >
              @for (sem of semesterOptions(); track sem) {
                <option [value]="sem">{{ sem === 'All' ? 'All Semesters' : sem }}</option>
              }
            </select>
          </div>
        </div>

        <!-- 4 Stat Cards: SGPA, CGPA, Pass %, Backlogs -->
        <section class="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div class="bg-white rounded-xl border border-[#E2E8F0] p-3.5 sm:p-4 shadow-sm flex items-center justify-between gap-2.5">
            <div class="min-w-0">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">SGPA</p>
              <p class="text-xl sm:text-2xl font-bold text-[#172554] mt-1 tabular-nums">
                {{ semesterResults().length > 0 ? sgpa().toFixed(2) : 'N/A' }}
              </p>
              <p class="text-[11px] text-[#64748B] mt-0.5 truncate">{{ selectedSemester() === 'All' ? 'Across semesters' : selectedSemester() }}</p>
            </div>
            <div class="w-9 h-9 rounded-xl bg-purple-50 text-[#6D42E8] border border-purple-100 flex items-center justify-center shrink-0">
              <mat-icon class="text-lg">grade</mat-icon>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-[#E2E8F0] p-3.5 sm:p-4 shadow-sm flex items-center justify-between gap-2.5">
            <div class="min-w-0">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">CGPA</p>
              <p class="text-xl sm:text-2xl font-bold text-[#172554] mt-1 tabular-nums">
                {{ allPublished().length > 0 ? cgpa().toFixed(2) : 'N/A' }}
              </p>
              <p class="text-[11px] text-[#64748B] mt-0.5 truncate">Cumulative grade point</p>
            </div>
            <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
              <mat-icon class="text-lg">workspace_premium</mat-icon>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-[#E2E8F0] p-3.5 sm:p-4 shadow-sm flex items-center justify-between gap-2.5">
            <div class="min-w-0">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Pass %</p>
              <p class="text-xl sm:text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
                {{ semesterResults().length > 0 ? passPct() + '%' : 'N/A' }}
              </p>
              <p class="text-[11px] text-[#64748B] mt-0.5 truncate">Threshold {{ facade.passingPercentage() }}%</p>
            </div>
            <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <mat-icon class="text-lg">verified</mat-icon>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-[#E2E8F0] p-3.5 sm:p-4 shadow-sm flex items-center justify-between gap-2.5">
            <div class="min-w-0">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Backlogs</p>
              <p
                class="text-xl sm:text-2xl font-bold mt-1 tabular-nums"
                [class]="backlogsCount() > 0 ? 'text-rose-600' : 'text-[#172554]'"
              >
                {{ backlogsCount() }}
              </p>
              <p class="text-[11px] text-[#64748B] mt-0.5 truncate">Unpassed subjects</p>
            </div>
            <div class="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
              <mat-icon class="text-lg">warning</mat-icon>
            </div>
          </div>
        </section>

        @if (semesterResults().length > 0) {
          <!-- Published Results Table -->
          <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div class="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-2">
              <h2 class="text-sm font-bold text-[#172554]">Published Examination Marks</h2>
              <span class="text-xs font-semibold text-[#64748B]">{{ semesterResults().length }} Published</span>
            </div>

            <!-- Mobile Card View (< md) -->
            <div class="md:hidden divide-y divide-[#E2E8F0]">
              @for (res of semesterResults(); track res.record.id) {
                <div class="p-4 space-y-2.5">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="font-semibold text-[#172554]">{{ res.subjectName }}</p>
                      <p class="text-[11px] font-mono text-[#64748B] mt-0.5">{{ res.subjectCode }} · {{ res.examTitle }}</p>
                    </div>
                    <app-status-badge [status]="res.passed ? 'Pass' : 'Fail'" />
                  </div>
                  <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                    <span class="text-[#64748B] tabular-nums">
                      Marks: <strong class="text-[#172554]">{{ res.record.marksObtained }}</strong>/{{ res.record.maxMarks }} ({{ res.percentage }}%)
                    </span>
                    <span class="px-2.5 py-0.5 rounded-full bg-purple-50 text-[#6D42E8] border border-purple-200 text-xs font-bold whitespace-nowrap">
                      Grade {{ res.grade }}
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
                    <th scope="col" class="px-4 py-3 whitespace-nowrap">Exam</th>
                    <th scope="col" class="px-4 py-3 text-right whitespace-nowrap">Marks</th>
                    <th scope="col" class="px-4 py-3 text-right whitespace-nowrap">Max</th>
                    <th scope="col" class="px-4 py-3 text-right whitespace-nowrap">%</th>
                    <th scope="col" class="px-4 py-3 text-center whitespace-nowrap">Grade</th>
                    <th scope="col" class="px-4 py-3 text-right whitespace-nowrap">Result</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#E2E8F0] text-[13px]">
                  @for (res of semesterResults(); track res.record.id) {
                    <tr class="hover:bg-slate-50/70 transition-colors">
                      <td class="px-4 py-3.5">
                        <p class="font-semibold text-[#172554]">{{ res.subjectName }}</p>
                        <p class="text-[11px] font-mono text-[#64748B]">{{ res.subjectCode }}</p>
                      </td>
                      <td class="px-4 py-3.5">
                        <p class="font-medium text-[#172554]">{{ res.examTitle }}</p>
                        <p class="text-[11px] text-[#64748B]">{{ res.semester }} · {{ facade.formatShortDate(res.examDate) }}</p>
                      </td>
                      <td class="px-4 py-3.5 text-right tabular-nums font-bold text-[#172554] whitespace-nowrap">{{ res.record.marksObtained }}</td>
                      <td class="px-4 py-3.5 text-right tabular-nums text-[#64748B] whitespace-nowrap">{{ res.record.maxMarks }}</td>
                      <td class="px-4 py-3.5 text-right tabular-nums font-semibold text-[#172554] whitespace-nowrap">{{ res.percentage }}%</td>
                      <td class="px-4 py-3.5 text-center whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-purple-50 text-[#6D42E8] border border-purple-200 text-xs font-bold whitespace-nowrap">
                          {{ res.grade }}
                        </span>
                      </td>
                      <td class="px-4 py-3.5 text-right whitespace-nowrap">
                        <app-status-badge [status]="res.passed ? 'Pass' : 'Fail'" />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Exam-wise Percentage Trend Line Chart -->
          <app-chart-card
            title="Exam-wise Percentage Trend"
            subtitle="Published score progression across examinations"
            [isEmpty]="semesterResults().length === 0"
          >
            <div class="w-full h-full">
              <canvas baseChart [data]="trendChartData()" [options]="lineOptions" [type]="'line'"></canvas>
            </div>
          </app-chart-card>
        } @else {
          <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
            <app-empty-state
              icon="grade"
              title="No published results for this semester"
              message="Once faculty publish examination scores, grade card and SGPA metrics will appear here."
            />
          </div>
        }
      } @else {
        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
          <app-empty-state
            icon="family_restroom"
            title="No linked child selected"
            message="Select a linked student to view published examination results."
          />
        </div>
      }
    </div>
  `
})
export class ParentResults implements OnInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly facade = inject(ParentPortalFacade);

  protected readonly child = this.facade.selectedChild;
  protected readonly allPublished = this.facade.selectedPublishedResults;
  protected readonly selectedSemester = signal<string>('All');

  private lastChildId = '';

  constructor() {
    effect(() => {
      const c = this.child();
      if (!c) return;
      if (c.id !== this.lastChildId) {
        this.lastChildId = c.id;
        this.selectedSemester.set(c.semester);
      }
    });
  }

  ngOnInit(): void {
    const querySem = this.route.snapshot.queryParamMap.get('semester');
    if (querySem) {
      this.selectedSemester.set(querySem);
    }
  }

  protected readonly semesterOptions = computed<string[]>(() => {
    const c = this.child();
    const set = new Set<string>(c ? [c.semester] : []);
    for (const r of this.allPublished()) {
      set.add(r.semester);
    }
    const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
    return [...sorted, 'All'];
  });

  protected readonly semesterResults = computed(() => {
    const sem = this.selectedSemester();
    const list = this.allPublished();
    if (sem === 'All') return list;
    return list.filter(r => r.semester === sem);
  });

  protected readonly sgpa = computed(() => this.facade.computeGpa(this.semesterResults()));
  protected readonly cgpa = computed(() => this.facade.computeGpa(this.allPublished()));

  protected readonly passPct = computed(() => {
    const list = this.semesterResults();
    if (list.length === 0) return 0;
    const passed = list.filter(r => r.passed).length;
    return Math.round((passed / list.length) * 100);
  });

  protected readonly backlogsCount = computed(() =>
    this.semesterResults().filter(r => !r.passed).length
  );

  protected readonly trendChartData = computed<ChartData<'line'>>(() => {
    const chronological = this.semesterResults().slice().reverse();
    return {
      labels: chronological.map(r => (r.examTitle.length > 20 ? r.examTitle.slice(0, 20) + '...' : r.examTitle)),
      datasets: [
        {
          label: 'Percentage (%)',
          data: chronological.map(r => r.percentage),
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

  protected onSemesterChange(event: Event): void {
    this.selectedSemester.set((event.target as HTMLSelectElement).value);
  }

  protected downloadGradeCardPdf(): void {
    const c = this.child();
    const list = this.semesterResults();
    if (!c || list.length === 0) return;

    const semLabel = this.selectedSemester() === 'All' ? 'All Semesters' : this.selectedSemester();
    const columns = ['Subject', 'Exam', 'Marks', 'Max', '%', 'Grade', 'Status'];
    const rows = list.map(r => [
      `${r.subjectCode} - ${r.subjectName}`,
      r.examTitle,
      r.record.marksObtained,
      r.record.maxMarks,
      `${r.percentage}%`,
      r.grade,
      r.passed ? 'Pass' : 'Fail'
    ]);

    exportToPdf(
      `Student Grade Card (${semLabel})`,
      columns,
      rows,
      `${c.enrollmentNo}-${semLabel.replace(/\s+/g, '-').toLowerCase()}-grade-card`,
      [
        `Student: ${c.name} (${c.enrollmentNo}) | Section: ${c.section}`,
        `Course: ${c.course} | Scope: ${semLabel} | SGPA: ${this.sgpa().toFixed(2)} | CGPA: ${this.cgpa().toFixed(2)}`
      ]
    );
  }
}
