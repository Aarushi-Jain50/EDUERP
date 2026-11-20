import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { PageHeader } from '../../../components/shared/page-header';
import { ReportFilterBar, ReportFilters } from '../../../components/reports/report-filter-bar';
import { KpiCard } from '../../../components/reports/kpi-card';
import { ChartCard } from '../../../components/reports/chart-card';
import { StudentsService } from '../../../services/students.service';
import { ResultsService } from '../../../services/results.service';
import { ExaminationsService } from '../../../services/examinations.service';
import { AttendanceService } from '../../../services/attendance.service';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

export interface AtRiskStudent {
  id: string;
  name: string;
  enrollmentNo: string;
  course: string;
  attendance: number;
  result: number | null;
  reason: string;
}

@Component({
  selector: 'app-student-performance',
  imports: [CommonModule, MatIconModule, PageHeader, ReportFilterBar, KpiCard, ChartCard, BaseChartDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans animate-in fade-in duration-500">
      <app-page-header
        title="Student Performance"
        subtitle="Track academic outcomes, grade distribution, and identify academically or attendance at-risk students."
        actionLabel="Export PDF"
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
        <app-kpi-card label="Institutional Avg" [value]="stats().avgPercentage + '%'" icon="analytics" iconBgClass="bg-indigo-50 border-indigo-100" iconColorClass="text-indigo-600" />
        <app-kpi-card label="Pass Rate" [value]="stats().passRate + '%'" icon="check_circle" iconBgClass="bg-emerald-50 border-emerald-100" iconColorClass="text-emerald-600" />
        <app-kpi-card label="O-Grade Toppers" [value]="stats().topperCount" icon="workspace_premium" iconBgClass="bg-amber-50 border-amber-100" iconColorClass="text-amber-600" />
        <app-kpi-card label="At-Risk Students" [value]="stats().atRiskCount" icon="report_problem" iconBgClass="bg-rose-50 border-rose-100" iconColorClass="text-rose-600" />
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <app-chart-card title="Grade Distribution" subtitle="Count of published evaluations per grade tier">
          <canvas baseChart [data]="gradeDistributionData()" [options]="barChartOptions" [type]="'bar'"></canvas>
        </app-chart-card>

        <app-chart-card title="Course-wise Average" subtitle="Comparison of academic scores by program" [isEmpty]="courseAverageData().labels?.length === 0">
          <canvas baseChart [data]="courseAverageData()" [options]="barChartOptions" [type]="'bar'"></canvas>
        </app-chart-card>
      </div>

      <!-- Performance Tables (Tabs) -->
      <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div class="p-2 border-b border-slate-100 bg-slate-50/50 flex gap-2">
          <button type="button" (click)="activeTab.set('toppers')" [class]="activeTab() === 'toppers' ? 'bg-white shadow-sm text-[#6D42E8] font-bold' : 'text-slate-500 hover:text-slate-800'" class="px-6 py-2.5 rounded-xl text-xs transition-all cursor-pointer">Top Performers ({{ toppers().length }})</button>
          <button type="button" (click)="activeTab.set('at-risk')" [class]="activeTab() === 'at-risk' ? 'bg-white shadow-sm text-rose-600 font-bold' : 'text-slate-500 hover:text-slate-800'" class="px-6 py-2.5 rounded-xl text-xs transition-all cursor-pointer">At-Risk Students ({{ atRiskStudents().length }})</button>
        </div>

        <div class="overflow-x-auto">
          @if (activeTab() === 'toppers') {
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th class="px-6 py-4 border-b border-slate-100">Student Name</th>
                  <th class="px-6 py-4 border-b border-slate-100">Subject</th>
                  <th class="px-6 py-4 border-b border-slate-100 text-center">Enrollment No</th>
                  <th class="px-6 py-4 border-b border-slate-100 text-center">Score %</th>
                  <th class="px-6 py-4 border-b border-slate-100 text-center">Grade</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                @for (s of toppers(); track s.id) {
                  <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-6 py-4 text-xs font-bold text-slate-900">{{ s.studentName }}</td>
                    <td class="px-6 py-4 text-xs text-slate-500">{{ getSubjectName(s.examId) }}</td>
                    <td class="px-6 py-4 text-xs font-mono text-slate-500 text-center">{{ s.enrollmentNo }}</td>
                    <td class="px-6 py-4 text-center">
                      <span class="px-2 py-1 rounded bg-indigo-50 text-indigo-700 font-black text-[10px]">{{ Math.round((s.marksObtained / s.maxMarks) * 100) }}%</span>
                    </td>
                    <td class="px-6 py-4 text-center">
                      <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">{{ s.grade }}</span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="p-10 text-center text-slate-400 text-xs italic">No published student scores match active filters.</td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th class="px-6 py-4 border-b border-slate-100">Student Name</th>
                  <th class="px-6 py-4 border-b border-slate-100">Course</th>
                  <th class="px-6 py-4 border-b border-slate-100 text-center">Attendance %</th>
                  <th class="px-6 py-4 border-b border-slate-100 text-center">Avg Result %</th>
                  <th class="px-6 py-4 border-b border-slate-100 text-center">Alert Reason</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                @for (s of atRiskStudents(); track s.id) {
                  <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-6 py-4 text-xs font-bold text-slate-900">{{ s.name }}</td>
                    <td class="px-6 py-4 text-xs text-slate-500">{{ s.course }}</td>
                    <td class="px-6 py-4 text-center">
                      <span class="text-xs font-bold" [class]="s.attendance < 75 ? 'text-rose-600' : 'text-emerald-600'">{{ s.attendance }}%</span>
                    </td>
                    <td class="px-6 py-4 text-center">
                      @if (s.result !== null) {
                        <span class="text-xs font-bold" [class]="s.result < 40 ? 'text-rose-600' : 'text-slate-700'">{{ s.result }}%</span>
                      } @else {
                        <span class="text-xs text-slate-400">—</span>
                      }
                    </td>
                    <td class="px-6 py-4 text-center">
                      <span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]">{{ s.reason }}</span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="p-10 text-center text-emerald-600 text-xs font-semibold">No students currently flagged as at-risk for selected filters.</td>
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
  private readonly examinationsService = inject(ExaminationsService);
  private readonly attendanceService = inject(AttendanceService);

  protected readonly activeTab = signal<'toppers' | 'at-risk'>('toppers');
  protected readonly filters = signal<ReportFilters>({
    academicYear: 'All',
    courseId: 'All',
    semester: 'All'
  });

  protected readonly Math = Math;

  protected readonly filteredStudents = computed(() => {
    const f = this.filters();
    return this.studentsService.students().filter(s => {
      if (f.academicYear !== 'All' && s.academicYear !== f.academicYear) return false;
      if (f.courseId !== 'All' && s.courseId !== f.courseId) return false;
      if (f.semester !== 'All' && s.semester !== f.semester) return false;
      return true;
    });
  });

  protected readonly filteredResults = computed(() => {
    const studentIds = new Set(this.filteredStudents().map(s => s.id));
    return this.resultsService
      .results()
      .filter(r => r.status === 'Published' && studentIds.has(r.studentId));
  });

  protected readonly stats = computed(() => {
    const res = this.filteredResults();
    const avg =
      res.length > 0
        ? Math.round(res.reduce((acc, r) => acc + (r.marksObtained / r.maxMarks) * 100, 0) / res.length)
        : 0;
    const pass =
      res.length > 0
        ? Math.round((res.filter(r => r.marksObtained / r.maxMarks >= 0.4).length / res.length) * 100)
        : 0;
    const toppers = res.filter(r => r.grade === 'O').length;
    const atRisk = this.atRiskStudents().length;

    return { avgPercentage: avg, passRate: pass, topperCount: toppers, atRiskCount: atRisk };
  });

  protected readonly gradeDistributionData = computed<ChartData<'bar'>>(() => {
    const res = this.filteredResults();
    const grades: Record<string, number> = { O: 0, 'A+': 0, A: 0, 'B+': 0, B: 0, C: 0, F: 0 };
    res.forEach(r => {
      if (grades[r.grade] !== undefined) grades[r.grade]++;
    });

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

  protected readonly courseAverageData = computed<ChartData<'bar'>>(() => {
    const students = this.filteredStudents();
    const res = this.filteredResults();
    const courseGroups: Record<string, { total: number; count: number }> = {};

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

  protected readonly toppers = computed(() => {
    return [...this.filteredResults()]
      .sort((a, b) => b.marksObtained / b.maxMarks - a.marksObtained / a.maxMarks)
      .slice(0, 15);
  });

  protected readonly atRiskStudents = computed(() => {
    const students = this.filteredStudents();
    const results = this.filteredResults();

    return students
      .map(s => {
        const stuResults = results.filter(r => r.studentId === s.id);
        const avgRes =
          stuResults.length > 0
            ? Math.round(
                stuResults.reduce((acc, r) => acc + (r.marksObtained / r.maxMarks) * 100, 0) /
                  stuResults.length
              )
            : null;

        const attStats = this.attendanceService.getStudentAttendanceStats(s.id);
        const lowMarks = avgRes !== null && avgRes < 40;
        const lowAttendance = attStats.total > 0 && attStats.percentage < 75;

        let reason = '';
        if (lowMarks && lowAttendance) reason = 'Low Score & Attendance';
        else if (lowMarks) reason = 'Low Academic Score';
        else if (lowAttendance) reason = 'Low Attendance (<75%)';

        if (reason) {
          return {
            id: s.id,
            name: s.name,
            enrollmentNo: s.enrollmentNo,
            course: s.course,
            attendance: attStats.percentage,
            result: avgRes,
            reason
          };
        }
        return null;
      })
      .filter((s): s is AtRiskStudent => s !== null);
  });

  protected readonly barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 } } },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } }
    }
  };

  onFilterChange(f: ReportFilters) {
    this.filters.set(f);
  }

  getSubjectName(examId: string): string {
    const exam = this.examinationsService.exams().find(e => e.id === examId);
    return exam?.subjectName || exam?.title || examId;
  }

  exportExcel() {
    if (this.activeTab() === 'toppers') {
      exportToExcel(
        this.toppers().map(t => ({
          Student: t.studentName,
          EnrollmentNo: t.enrollmentNo,
          Subject: this.getSubjectName(t.examId),
          ScorePct: `${Math.round((t.marksObtained / t.maxMarks) * 100)}%`,
          Grade: t.grade
        })),
        'Top_Performers_Report'
      );
    } else {
      exportToExcel(
        this.atRiskStudents().map(s => ({
          Student: s.name,
          EnrollmentNo: s.enrollmentNo,
          Course: s.course,
          AttendancePct: `${s.attendance}%`,
          AvgScorePct: s.result !== null ? `${s.result}%` : 'N/A',
          RiskReason: s.reason
        })),
        'At_Risk_Students_Report'
      );
    }
  }

  exportPdf() {
    const cols = ['Student', 'Enrollment', 'Course', 'Attendance %', 'Result %', 'Alert Reason'];
    const rows = this.atRiskStudents().map(s => [
      s.name,
      s.enrollmentNo,
      s.course,
      `${s.attendance}%`,
      s.result !== null ? `${s.result}%` : 'N/A',
      s.reason
    ]);
    exportToPdf('Student Performance & Risk Report', cols, rows, 'Student_Performance_Risks');
  }
}
