import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageHeader } from '../../../components/shared/page-header';
import { ReportFilterBar, ReportFilters } from '../../../components/reports/report-filter-bar';
import { KpiCard } from '../../../components/reports/kpi-card';
import { ChartCard } from '../../../components/reports/chart-card';
import { StudentsService } from '../../../services/students.service';
import { ResultsService } from '../../../services/results.service';
import { AttendanceService } from '../../../services/attendance.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { exportToPdf } from '../../../utils/export.helper';

export interface AtRiskStudent {
  id: string;
  name: string;
  attendance: number;
  result: number;
  reason: string;
}

@Component({
  selector: 'app-student-performance',
  standalone: true,
  imports: [CommonModule, PageHeader, ReportFilterBar, KpiCard, ChartCard, BaseChartDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans animate-in fade-in duration-500">
      <app-page-header 
        title="Student Performance" 
        subtitle="Track academic outcomes, grade distribution, and identify at-risk students."
        primaryActionLabel="Export Report"
        primaryActionIcon="file_download"
        (primaryActionClicked)="exportPdf()"
      />

      <app-report-filter-bar (filterChange)="onFilterChange($event)" />

      <!-- KPI Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <app-kpi-card label="Institutional Avg" [value]="stats().avgPercentage + '%'" icon="analytics" iconBgClass="bg-indigo-50 border-indigo-100" iconColorClass="text-indigo-600" />
        <app-kpi-card label="Pass Rate" [value]="stats().passRate + '%'" icon="check_circle" iconBgClass="bg-emerald-50 border-emerald-100" iconColorClass="text-emerald-600" />
        <app-kpi-card label="Gold Medalists" [value]="stats().topperCount" icon="workspace_premium" iconBgClass="bg-amber-50 border-amber-100" iconColorClass="text-amber-600" />
        <app-kpi-card label="At-Risk Students" [value]="stats().atRiskCount" icon="report_problem" iconBgClass="bg-rose-50 border-rose-100" iconColorClass="text-rose-600" />
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <app-chart-card title="Grade Distribution" subtitle="Count of students per grade tier">
          <canvas baseChart [data]="gradeDistributionData()" [options]="barChartOptions" [type]="'bar'"></canvas>
        </app-chart-card>

        <app-chart-card title="Course-wise Average" subtitle="Comparison of academic scores by program">
          <canvas baseChart [data]="courseAverageData()" [options]="barChartOptions" [type]="'bar'"></canvas>
        </app-chart-card>
      </div>

      <!-- Performance Tables (Tabs) -->
      <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div class="p-2 border-b border-slate-100 bg-slate-50/50 flex gap-2">
          <button (click)="activeTab.set('toppers')" [class]="activeTab() === 'toppers' ? 'bg-white shadow-sm text-[#6D42E8] font-bold' : 'text-slate-500 hover:text-slate-800'" class="px-6 py-2.5 rounded-xl text-xs transition-all">Top Performers</button>
          <button (click)="activeTab.set('at-risk')" [class]="activeTab() === 'at-risk' ? 'bg-white shadow-sm text-rose-600 font-bold' : 'text-slate-500 hover:text-slate-800'" class="px-6 py-2.5 rounded-xl text-xs transition-all">At-Risk Students</button>
        </div>

        <div class="overflow-x-auto">
          @if (activeTab() === 'toppers') {
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th class="px-6 py-4 border-b border-slate-100">Student Name</th>
                  <th class="px-6 py-4 border-b border-slate-100 text-center">Enrollment No</th>
                  <th class="px-6 py-4 border-b border-slate-100 text-center">Score %</th>
                  <th class="px-6 py-4 border-b border-slate-100 text-center">Grade</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                @for (s of toppers(); track s.id) {
                  <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-6 py-4 text-xs font-bold text-slate-900">{{ s.studentName }}</td>
                    <td class="px-6 py-4 text-xs font-mono text-slate-500 text-center">{{ s.enrollmentNo }}</td>
                    <td class="px-6 py-4 text-center">
                       <span class="px-2 py-1 rounded bg-indigo-50 text-indigo-700 font-black text-[10px]">{{ Math.round((s.marksObtained/s.maxMarks)*100) }}%</span>
                    </td>
                    <td class="px-6 py-4 text-center">
                       <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">{{ s.grade }}</span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th class="px-6 py-4 border-b border-slate-100">Student Name</th>
                  <th class="px-6 py-4 border-b border-slate-100 text-center">Attendance %</th>
                  <th class="px-6 py-4 border-b border-slate-100 text-center">Avg Result %</th>
                  <th class="px-6 py-4 border-b border-slate-100 text-center">Alert Reason</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                @for (s of atRiskStudents(); track s.id) {
                  <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-6 py-4 text-xs font-bold text-slate-900">{{ s.name }}</td>
                    <td class="px-6 py-4 text-center">
                       <span class="text-xs font-bold" [class.text-rose-600]="s.attendance < 75">{{ s.attendance }}%</span>
                    </td>
                    <td class="px-6 py-4 text-center">
                       <span class="text-xs font-bold" [class.text-rose-600]="s.result < 40">{{ s.result }}%</span>
                    </td>
                    <td class="px-6 py-4 text-center">
                       <span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]">{{ s.reason }}</span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </div>
    </div>
  `
})
export class StudentPerformancePage {
  private readonly studentsService = inject(StudentsService);
  private readonly resultsService = inject(ResultsService);
  private readonly attendanceService = inject(AttendanceService);

  protected activeTab = signal<'toppers' | 'at-risk'>('toppers');
  protected filters = signal<ReportFilters>({ academicYear: '2025-26', courseId: 'All', semester: 'All' });

  protected readonly Math = Math;

  protected stats = computed(() => {
    const res = this.resultsService.results().filter(r => r.status === 'Published');
    const avg = res.length > 0 ? Math.round(res.reduce((acc, r) => acc + (r.marksObtained/r.maxMarks)*100, 0) / res.length) : 0;
    const pass = res.length > 0 ? Math.round((res.filter(r => (r.marksObtained/r.maxMarks) >= 0.4).length / res.length) * 100) : 0;
    const toppers = res.filter(r => r.grade === 'O').length;
    const atRisk = this.atRiskStudents().length;

    return { avgPercentage: avg, passRate: pass, topperCount: toppers, atRiskCount: atRisk };
  });

  protected gradeDistributionData = computed<ChartData<'bar'>>(() => {
    const res = this.resultsService.results().filter(r => r.status === 'Published');
    const grades: Record<string, number> = { 'O': 0, 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'F': 0 };
    res.forEach(r => { if (grades[r.grade] !== undefined) grades[r.grade]++; });

    return {
      labels: Object.keys(grades),
      datasets: [{
        data: Object.values(grades),
        label: 'Student Count',
        backgroundColor: '#6D42E8',
        borderRadius: 8
      }]
    };
  });

  protected courseAverageData = computed<ChartData<'bar'>>(() => {
    const students = this.studentsService.students();
    const res = this.resultsService.results().filter(r => r.status === 'Published');
    const courseGroups: Record<string, { total: number, count: number }> = {};

    res.forEach(r => {
      const stu = students.find(s => s.id === r.studentId);
      if (stu) {
        if (!courseGroups[stu.course]) courseGroups[stu.course] = { total: 0, count: 0 };
        courseGroups[stu.course].total += (r.marksObtained / r.maxMarks) * 100;
        courseGroups[stu.course].count++;
      }
    });

    return {
      labels: Object.keys(courseGroups).map(c => c.split(' ').map(w => w[0]).join('')),
      datasets: [{
        data: Object.values(courseGroups).map(g => Math.round(g.total / g.count)),
        label: 'Avg Score %',
        backgroundColor: '#D946EF',
        borderRadius: 8
      }]
    };
  });

  protected toppers = computed(() => {
    return this.resultsService.results()
      .filter(r => r.status === 'Published')
      .sort((a, b) => (b.marksObtained / b.maxMarks) - (a.marksObtained / a.maxMarks))
      .slice(0, 10);
  });

  protected atRiskStudents = computed(() => {
    const students = this.studentsService.students();
    const results = this.resultsService.results();
    
    return students.map(s => {
      const stuResults = results.filter(r => r.studentId === s.id && r.status === 'Published');
      const avgRes = stuResults.length > 0 ? Math.round(stuResults.reduce((acc, r) => acc + (r.marksObtained/r.maxMarks)*100, 0) / stuResults.length) : 0;
      
      const attStats = this.attendanceService.getStudentAttendanceStats();
      
      let reason = '';
      if (avgRes < 40) reason = 'Low Academic Score';
      else if (attStats.percentage < 75) reason = 'Low Attendance';

      if (reason) {
        return { id: s.id, name: s.name, attendance: attStats.percentage, result: avgRes, reason };
      }
      return null;
    }).filter((s): s is AtRiskStudent => s !== null);
  });

  protected barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 } } },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } }
    }
  };

  onFilterChange(f: ReportFilters) { this.filters.set(f); }

  exportPdf() {
    const cols = ['Student', 'Attendance %', 'Result %', 'Reason'];
    const rows = this.atRiskStudents().map(s => [s.name, s.attendance + '%', s.result + '%', s.reason]);
    exportToPdf('At-Risk Students Report', cols, rows, 'Student_Performance_Risks');
  }
}
