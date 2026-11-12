import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageHeader } from '../../../components/shared/page-header';
import { ReportFilterBar, ReportFilters } from '../../../components/reports/report-filter-bar';
import { KpiCard } from '../../../components/reports/kpi-card';
import { ChartCard } from '../../../components/reports/chart-card';
import { StudentsService } from '../../../services/students.service';
import { AttendanceService } from '../../../services/attendance.service';
import { ResultsService } from '../../../services/results.service';
import { FinanceService } from '../../../services/finance.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { formatCurrency } from '../../../utils/money.helper';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

interface CourseSummary {
  course: string;
  students: number;
  attendance: number;
  avgResult: number;
  fees: number;
}

@Component({
  selector: 'app-analytics-overview',
  standalone: true,
  imports: [CommonModule, PageHeader, ReportFilterBar, KpiCard, ChartCard, BaseChartDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans animate-in fade-in duration-500">
      <app-page-header 
        title="Analytics Overview" 
        subtitle="Executive summary of institutional performance, enrollment, and financial metrics."
        primaryActionLabel="Export PDF"
        primaryActionIcon="picture_as_pdf"
        secondaryActionLabel="Export Excel"
        secondaryActionIcon="description"
        (primaryActionClicked)="exportPdf()"
        (secondaryActionClicked)="exportExcel()"
      />

      <app-report-filter-bar (filterChange)="onFilterChange($event)" />

      <!-- KPI Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <app-kpi-card label="Total Students" [value]="kpis().totalStudents" icon="people" iconBgClass="bg-indigo-50 border-indigo-100" iconColorClass="text-indigo-600" />
        <app-kpi-card label="Avg Attendance %" [value]="kpis().avgAttendance + '%'" icon="how_to_reg" iconBgClass="bg-emerald-50 border-emerald-100" iconColorClass="text-emerald-600" />
        <app-kpi-card label="Pass Percentage" [value]="kpis().passRate + '%'" icon="grade" iconBgClass="bg-purple-50 border-purple-100" iconColorClass="text-purple-600" />
        <app-kpi-card label="Fees Collected" [value]="formatCurrency(kpis().totalFees)" icon="payments" iconBgClass="bg-amber-50 border-amber-100" iconColorClass="text-amber-600" />
      </div>

      <!-- Charts Row 1 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <app-chart-card title="Enrollment Trend" subtitle="New student admissions over last 6 months">
          <canvas baseChart [data]="enrollmentChartData" [options]="lineChartOptions" [type]="'line'"></canvas>
        </app-chart-card>

        <app-chart-card title="Department Distribution" subtitle="Student enrollment by department">
          <canvas baseChart [data]="deptChartData()" [options]="doughnutOptions" [type]="'doughnut'"></canvas>
        </app-chart-card>
      </div>

      <!-- Charts Row 2 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <app-chart-card title="Monthly Fee Collection" subtitle="Total institutional revenue (₹)">
          <canvas baseChart [data]="feeChartData" [options]="barChartOptions" [type]="'bar'"></canvas>
        </app-chart-card>

        <app-chart-card title="Attendance by Course" subtitle="Average attendance percentage per program">
          <canvas baseChart [data]="attendanceByCourseData()" [options]="barChartOptions" [type]="'bar'"></canvas>
        </app-chart-card>
      </div>

      <!-- Course-wise Table -->
      <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div class="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h4 class="text-xs font-black text-slate-800 uppercase tracking-widest">Institutional Summary by Course</h4>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th class="px-6 py-4 border-b border-slate-100">Course / Program</th>
                <th class="px-6 py-4 border-b border-slate-100 text-center">Students</th>
                <th class="px-6 py-4 border-b border-slate-100 text-center">Attendance %</th>
                <th class="px-6 py-4 border-b border-slate-100 text-center">Avg Result</th>
                <th class="px-6 py-4 border-b border-slate-100 text-right">Fee Collected</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              @for (row of tableData(); track row.course) {
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-6 py-4 text-xs font-bold text-slate-900">{{ row.course }}</td>
                  <td class="px-6 py-4 text-xs font-medium text-slate-600 text-center">{{ row.students }}</td>
                  <td class="px-6 py-4 text-center">
                    <span class="text-xs font-bold" [class]="row.attendance < 75 ? 'text-rose-600' : 'text-emerald-600'">{{ row.attendance }}%</span>
                  </td>
                  <td class="px-6 py-4 text-xs font-medium text-slate-600 text-center">{{ row.avgResult }}%</td>
                  <td class="px-6 py-4 text-xs font-black text-slate-800 text-right">{{ formatCurrency(row.fees) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class AnalyticsOverviewPage {
  private readonly studentsService = inject(StudentsService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly resultsService = inject(ResultsService);
  private readonly financeService = inject(FinanceService);

  protected filters = signal<ReportFilters>({
    academicYear: '2025-26',
    courseId: 'All',
    semester: 'All'
  });

  protected kpis = computed(() => {
    const students = this.studentsService.students().length;
    const sessions = this.attendanceService.sessions();
    const avgAttendance = sessions.length > 0 
      ? Math.round(sessions.reduce((acc, s) => acc + s.percentage, 0) / sessions.length)
      : 0;
    
    const results = this.resultsService.results().filter(r => r.status === 'Published');
    const passRate = results.length > 0
      ? Math.round((results.filter(r => (r.marksObtained/r.maxMarks) >= 0.4).length / results.length) * 100)
      : 0;

    const totalFees = this.financeService.payments()
      .filter(p => p.status === 'Paid')
      .reduce((acc, p) => acc + p.total, 0);

    return { totalStudents: students, avgAttendance, passRate, totalFees };
  });

  // Enrollment Trend (Line) - Seeded for visual appeal
  protected enrollmentChartData: ChartData<'line'> = {
    labels: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
    datasets: [
      {
        data: [120, 180, 450, 60, 40, 25],
        label: 'New Admissions',
        borderColor: '#6D42E8',
        backgroundColor: 'rgba(109, 66, 232, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#6D42E8'
      }
    ]
  };

  // Department Distribution (Doughnut)
  protected deptChartData = computed<ChartData<'doughnut'>>(() => {
    const students = this.studentsService.students();
    const depts: Record<string, number> = {};
    students.forEach(s => {
      depts[s.department] = (depts[s.department] || 0) + 1;
    });

    return {
      labels: Object.keys(depts),
      datasets: [{
        data: Object.values(depts),
        backgroundColor: ['#6D42E8', '#D946EF', '#8B5CF6', '#F472B6', '#4F46E5'],
        hoverOffset: 4,
        borderWidth: 0
      }]
    };
  });

  // Fee Collection (Bar)
  protected feeChartData: ChartData<'bar'> = {
    labels: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
    datasets: [
      {
        data: [450000, 850000, 1200000, 300000, 250000, 180000],
        label: 'Collected Fee (₹)',
        backgroundColor: '#6D42E8',
        borderRadius: 8,
        barThickness: 20
      }
    ]
  };

  // Attendance by Course (Bar)
  protected attendanceByCourseData = computed<ChartData<'bar'>>(() => {
    const sessions = this.attendanceService.sessions();
    const courses: Record<string, { total: number, count: number }> = {};
    
    sessions.forEach(s => {
      if (!courses[s.courseId]) courses[s.courseId] = { total: 0, count: 0 };
      courses[s.courseId].total += s.percentage;
      courses[s.courseId].count += 1;
    });

    return {
      labels: Object.keys(courses).map(id => id.replace('course-', '').toUpperCase()),
      datasets: [{
        data: Object.values(courses).map(c => Math.round(c.total / c.count)),
        label: 'Avg Attendance %',
        backgroundColor: '#D946EF',
        borderRadius: 8,
        barThickness: 20
      }]
    };
  });

  protected tableData = computed<CourseSummary[]>(() => {
    const students = this.studentsService.students();
    const sessions = this.attendanceService.sessions();
    const results = this.resultsService.results();
    const payments = this.financeService.payments().filter(p => p.status === 'Paid');

    const courseSummary: CourseSummary[] = [];
    const courseGroups = new Set(students.map(s => s.course));

    courseGroups.forEach(courseName => {
      const courseStudents = students.filter(s => s.course === courseName);
      const courseId = courseStudents[0]?.courseId;
      
      const courseSessions = sessions.filter(s => s.courseId === courseId);
      const avgAtt = courseSessions.length > 0 
        ? Math.round(courseSessions.reduce((acc, s) => acc + s.percentage, 0) / courseSessions.length)
        : 0;

      const courseResults = results.filter(r => courseStudents.some(s => s.id === r.studentId));
      const avgRes = courseResults.length > 0
        ? Math.round(courseResults.reduce((acc, r) => acc + (r.marksObtained/r.maxMarks)*100, 0) / courseResults.length)
        : 0;

      const courseFees = payments.filter(p => p.courseName === courseId).reduce((acc, p) => acc + p.total, 0);

      courseSummary.push({
        course: courseName,
        students: courseStudents.length,
        attendance: avgAtt,
        avgResult: avgRes,
        fees: courseFees
      });
    });

    return courseSummary;
  });

  // Chart Options
  protected lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 } } },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } }
    }
  };

  protected barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 } } },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } }
    }
  };

  protected doughnutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } }
    }
  };

  onFilterChange(f: ReportFilters) {
    this.filters.set(f);
  }

  exportExcel() {
    exportToExcel(this.tableData(), 'Institutional_Analytics_Overview');
  }

  exportPdf() {
    const cols = ['Course', 'Students', 'Attendance %', 'Avg Result %', 'Fee Collected (₹)'];
    const rows = this.tableData().map(r => [r.course, r.students, r.attendance + '%', r.avgResult + '%', formatCurrency(r.fees)]);
    exportToPdf('Analytics Overview - Course Summary', cols, rows, 'Institutional_Analytics_Overview');
  }

  formatCurrency(amt: number) { return formatCurrency(amt); }
}

