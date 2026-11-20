import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { PageHeader } from '../../../components/shared/page-header';
import { ReportFilterBar, ReportFilters } from '../../../components/reports/report-filter-bar';
import { KpiCard } from '../../../components/reports/kpi-card';
import { ChartCard } from '../../../components/reports/chart-card';
import { ExaminationsService } from '../../../services/examinations.service';
import { ResultsService } from '../../../services/results.service';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

interface ExamSummary {
  id: string;
  title: string;
  course: string;
  subject: string;
  appeared: number;
  passed: number;
  failed: number;
  avg: number;
  passRate: number;
}

@Component({
  selector: 'app-exam-reports',
  imports: [
    CommonModule,
    MatIconModule,
    PageHeader,
    ReportFilterBar,
    KpiCard,
    ChartCard,
    BaseChartDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans animate-in fade-in duration-500">
      <app-page-header
        title="Examination Reports"
        subtitle="Consolidated analysis of examination outcomes, subject averages, and pass rate distributions."
        actionLabel="Export Exam PDF"
        actionIcon="picture_as_pdf"
        (actionClicked)="exportPdf()"
      />

      <div class="flex justify-end -mt-2">
        <button
          type="button"
          (click)="exportExcel()"
          class="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
        >
          <mat-icon class="!text-sm !w-4 !h-4 text-emerald-600">table_view</mat-icon>
          Export Excel
        </button>
      </div>

      <app-report-filter-bar (filterChange)="onFilterChange($event)" />

      <!-- KPI Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <app-kpi-card label="Evaluated Exams" [value]="stats().totalExams" icon="assignment" iconBgClass="bg-indigo-50 border-indigo-100" iconColorClass="text-indigo-600" />
        <app-kpi-card label="Institutional Pass %" [value]="stats().passRate + '%'" icon="verified" iconBgClass="bg-emerald-50 border-emerald-100" iconColorClass="text-emerald-600" />
        <app-kpi-card label="Avg Marks %" [value]="stats().avgPercentage + '%'" icon="analytics" iconBgClass="bg-purple-50 border-purple-100" iconColorClass="text-purple-600" />
        <app-kpi-card label="Top Exam Avg" [value]="stats().highestScore + '%'" icon="workspace_premium" iconBgClass="bg-amber-50 border-amber-100" iconColorClass="text-amber-600" />
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <app-chart-card title="Exam-wise Pass Percentage" subtitle="Passing percentage across conducted evaluations" [isEmpty]="examPassData().labels?.length === 0">
          <canvas baseChart [data]="examPassData()" [options]="barChartOptions" [type]="'bar'"></canvas>
        </app-chart-card>

        <app-chart-card title="Subject-wise Average" subtitle="Mean scores achieved per academic subject" [isEmpty]="subjectAverageData().labels?.length === 0">
          <canvas baseChart [data]="subjectAverageData()" [options]="barChartOptions" [type]="'bar'"></canvas>
        </app-chart-card>
      </div>

      <!-- Detailed Exam Table -->
      <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div class="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h4 class="text-xs font-black text-slate-800 uppercase tracking-widest">Examination Summary Breakdown</h4>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th class="px-6 py-4 border-b border-slate-100">Exam Title</th>
                <th class="px-6 py-4 border-b border-slate-100 text-center">Appeared</th>
                <th class="px-6 py-4 border-b border-slate-100 text-center">Passed</th>
                <th class="px-6 py-4 border-b border-slate-100 text-center">Failed</th>
                <th class="px-6 py-4 border-b border-slate-100 text-center">Average %</th>
                <th class="px-6 py-4 border-b border-slate-100 text-right">Pass %</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              @for (row of summaryData(); track row.id) {
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-6 py-4">
                    <div class="flex flex-col">
                      <span class="text-xs font-bold text-slate-900">{{ row.title }}</span>
                      <span class="text-[10px] text-slate-400 font-medium">{{ row.course }} • {{ row.subject }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-xs font-medium text-slate-600 text-center">{{ row.appeared }}</td>
                  <td class="px-6 py-4 text-xs font-bold text-emerald-600 text-center">{{ row.passed }}</td>
                  <td class="px-6 py-4 text-xs font-bold text-rose-600 text-center">{{ row.failed }}</td>
                  <td class="px-6 py-4 text-xs font-medium text-slate-600 text-center">{{ row.avg }}%</td>
                  <td class="px-6 py-4 text-right">
                    <span class="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-black text-[10px]">{{ row.passRate }}%</span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="p-10 text-center text-slate-400 italic text-xs">No published exam results match current filters.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class ExaminationReportsPage {
  private readonly examService = inject(ExaminationsService);
  private readonly resultsService = inject(ResultsService);

  protected readonly filters = signal<ReportFilters>({
    academicYear: 'All',
    courseId: 'All',
    semester: 'All',
  });

  protected readonly summaryData = computed<ExamSummary[]>(() => {
    const f = this.filters();
    const exams = this.examService.exams().filter(e => {
      if (f.courseId !== 'All' && e.courseId !== f.courseId) return false;
      if (f.semester !== 'All' && e.semester !== f.semester) return false;
      return true;
    });
    const results = this.resultsService.results().filter(r => r.status === 'Published');

    return exams
      .map(e => {
        const examResults = results.filter(r => r.examId === e.id);
        if (examResults.length === 0) return null;

        const appeared = examResults.length;
        const passed = examResults.filter(r => r.marksObtained / r.maxMarks >= 0.4).length;
        const failed = appeared - passed;
        const avg = Math.round(examResults.reduce((acc, r) => acc + (r.marksObtained / r.maxMarks) * 100, 0) / appeared);
        const passRate = Math.round((passed / appeared) * 100);

        return {
          id: e.id,
          title: e.title,
          course: e.courseName,
          subject: e.subjectName,
          appeared,
          passed,
          failed,
          avg,
          passRate,
        };
      })
      .filter((r): r is ExamSummary => r !== null);
  });

  protected readonly stats = computed(() => {
    const data = this.summaryData();
    const totalExams = data.length;
    const avgPercentage = data.length > 0 ? Math.round(data.reduce((acc, r) => acc + r.avg, 0) / data.length) : 0;
    const passRate = data.length > 0 ? Math.round(data.reduce((acc, r) => acc + r.passRate, 0) / data.length) : 0;
    const highestScore = data.length > 0 ? Math.max(...data.map(r => r.avg)) : 0;

    return { totalExams, avgPercentage, passRate, highestScore };
  });

  protected readonly examPassData = computed<ChartData<'bar'>>(() => {
    const data = this.summaryData();
    return {
      labels: data.map(r => (r.title.length > 16 ? r.title.substring(0, 16) + '...' : r.title)),
      datasets: [
        {
          data: data.map(r => r.passRate),
          label: 'Pass %',
          backgroundColor: '#6D42E8',
          borderRadius: 8,
          barThickness: 22,
        },
      ],
    };
  });

  protected readonly subjectAverageData = computed<ChartData<'bar'>>(() => {
    const data = this.summaryData();
    const subGroups: Record<string, { total: number; count: number }> = {};

    data.forEach(r => {
      if (!subGroups[r.subject]) subGroups[r.subject] = { total: 0, count: 0 };
      subGroups[r.subject].total += r.avg;
      subGroups[r.subject].count++;
    });

    return {
      labels: Object.keys(subGroups),
      datasets: [
        {
          data: Object.values(subGroups).map(v => Math.round(v.total / v.count)),
          label: 'Avg Score %',
          backgroundColor: '#D946EF',
          borderRadius: 8,
          barThickness: 22,
        },
      ],
    };
  });

  protected readonly barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 0, max: 100, grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 } } },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
    },
  };

  onFilterChange(f: ReportFilters) {
    this.filters.set(f);
  }

  exportExcel() {
    exportToExcel(this.summaryData(), 'Institutional_Exam_Reports');
  }

  exportPdf() {
    const cols = ['Exam', 'Course', 'Subject', 'Appeared', 'Passed', 'Failed', 'Avg %', 'Pass %'];
    const rows = this.summaryData().map(r => [
      r.title,
      r.course,
      r.subject,
      r.appeared,
      r.passed,
      r.failed,
      `${r.avg}%`,
      `${r.passRate}%`,
    ]);
    exportToPdf('Examination Performance Report', cols, rows, 'Institutional_Exam_Reports');
  }
}

export { ExaminationReportsPage as ExamReportsPage };
