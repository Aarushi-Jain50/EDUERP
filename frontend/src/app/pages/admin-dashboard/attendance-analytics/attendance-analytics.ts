import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageHeader } from '../../../components/shared/page-header';
import { ReportFilterBar, ReportFilters } from '../../../components/reports/report-filter-bar';
import { KpiCard } from '../../../components/reports/kpi-card';
import { ChartCard } from '../../../components/reports/chart-card';
import { AttendanceService } from '../../../services/attendance.service';
import { AcademicService } from '../../../services/academic.service';
import { StudentsService } from '../../../services/students.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { exportToExcel } from '../../../utils/export.helper';

interface ShortageStudent {
  id: string;
  name: string;
  course: string;
  semester: string;
  percentage: number;
}

@Component({
  selector: 'app-attendance-analytics',
  standalone: true,
  imports: [CommonModule, PageHeader, ReportFilterBar, KpiCard, ChartCard, BaseChartDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans animate-in fade-in duration-500">
      <app-page-header 
        title="Attendance Analytics" 
        subtitle="Institutional attendance monitoring with trend analysis and shortage tracking."
        primaryActionLabel="Export Analysis"
        primaryActionIcon="file_download"
        (primaryActionClicked)="exportExcel()"
      />

      <app-report-filter-bar (filterChange)="onFilterChange($event)" />

      <!-- KPI Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <app-kpi-card label="Institutional Avg" [value]="stats().avg + '%'" icon="how_to_reg" iconBgClass="bg-indigo-50 border-indigo-100" iconColorClass="text-indigo-600" />
        <app-kpi-card label="Shortage (Below 75%)" [value]="stats().shortageCount" icon="report" iconBgClass="bg-rose-50 border-rose-100" iconColorClass="text-rose-600" />
        <app-kpi-card label="Best Section" [value]="stats().bestSection" icon="verified" iconBgClass="bg-emerald-50 border-emerald-100" iconColorClass="text-emerald-600" />
        <app-kpi-card label="Lowest Section" [value]="stats().lowestSection" icon="trending_down" iconBgClass="bg-amber-50 border-amber-100" iconColorClass="text-amber-600" />
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <app-chart-card title="Monthly Attendance Trend" subtitle="Overall institutional attendance over time">
          <canvas baseChart [data]="trendData" [options]="lineChartOptions" [type]="'line'"></canvas>
        </app-chart-card>

        <app-chart-card title="Subject-wise Attendance" subtitle="Average attendance by subject (Selected Filters)">
          <canvas baseChart [data]="subjectData()" [options]="barChartOptions" [type]="'bar'"></canvas>
        </app-chart-card>
      </div>

      <!-- Low Attendance Table -->
      <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div class="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h4 class="text-xs font-black text-slate-800 uppercase tracking-widest text-rose-600 flex items-center gap-2">
            <span class="material-icons text-sm">warning</span>
            Attendance Shortage (Below 75%)
          </h4>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th class="px-6 py-4 border-b border-slate-100">Student Name</th>
                <th class="px-6 py-4 border-b border-slate-100">Course</th>
                <th class="px-6 py-4 border-b border-slate-100 text-center">Semester</th>
                <th class="px-6 py-4 border-b border-slate-100 text-center">Attendance %</th>
                <th class="px-6 py-4 border-b border-slate-100 text-center">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              @for (row of shortageList(); track row.id) {
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-6 py-4 text-xs font-bold text-slate-900">{{ row.name }}</td>
                  <td class="px-6 py-4 text-xs font-medium text-slate-500">{{ row.course }}</td>
                  <td class="px-6 py-4 text-xs text-slate-500 text-center">{{ row.semester }}</td>
                  <td class="px-6 py-4 text-center">
                    <span class="text-xs font-black text-rose-600">{{ row.percentage }}%</span>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px] uppercase">Shortage</span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="p-10 text-center text-slate-300 italic text-xs">No students currently in shortage category.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class AttendanceAnalyticsPage {
  private readonly attendanceService = inject(AttendanceService);
  private readonly academicService = inject(AcademicService);
  private readonly studentsService = inject(StudentsService);

  protected filters = signal<ReportFilters>({ academicYear: '2025-26', courseId: 'All', semester: 'All' });

  protected stats = computed(() => {
    const sessions = this.attendanceService.sessions();
    const avg = sessions.length > 0 ? Math.round(sessions.reduce((acc, s) => acc + s.percentage, 0) / sessions.length) : 0;
    
    // Grouping by section to find best/lowest
    const sectionStats: Record<string, { total: number, count: number }> = {};
    sessions.forEach(s => {
      const key = `${s.courseId}-${s.sectionId}`;
      if (!sectionStats[key]) sectionStats[key] = { total: 0, count: 0 };
      sectionStats[key].total += s.percentage;
      sectionStats[key].count++;
    });

    const sections = Object.entries(sectionStats).map(([key, val]) => ({ key, avg: val.total / val.count }));
    sections.sort((a, b) => b.avg - a.avg);

    return {
      avg,
      shortageCount: this.shortageList().length,
      bestSection: sections[0]?.key.split('-')[1].toUpperCase() || 'N/A',
      lowestSection: sections[sections.length - 1]?.key.split('-')[1].toUpperCase() || 'N/A'
    };
  });

  protected trendData: ChartData<'line'> = {
    labels: ['Aug', 'Sep', 'Oct', 'Nov'],
    datasets: [{
      data: [82, 88, 76, 91],
      label: 'Avg Attendance %',
      borderColor: '#6D42E8',
      backgroundColor: 'rgba(109, 66, 232, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  protected subjectData = computed<ChartData<'bar'>>(() => {
    const sessions = this.attendanceService.sessions();
    const subjects = this.academicService.subjects();
    const subStats: Record<string, { total: number, count: number }> = {};

    sessions.forEach(s => {
      if (!subStats[s.subjectId]) subStats[s.subjectId] = { total: 0, count: 0 };
      subStats[s.subjectId].total += s.percentage;
      subStats[s.subjectId].count++;
    });

    return {
      labels: Object.keys(subStats).map(id => subjects.find(sub => sub.id === id)?.name || id),
      datasets: [{
        data: Object.values(subStats).map(v => Math.round(v.total / v.count)),
        label: 'Attendance %',
        backgroundColor: '#D946EF',
        borderRadius: 8
      }]
    };
  });

  protected shortageList = computed<ShortageStudent[]>(() => {
    return this.studentsService.students().map(s => {
      const att = this.attendanceService.getStudentAttendanceStats();
      if (att.percentage < 75) {
        return { id: s.id, name: s.name, course: s.course, semester: s.semester, percentage: att.percentage };
      }
      return null;
    }).filter((s): s is ShortageStudent => s !== null);
  });

  protected lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 0, max: 100, grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 } } },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } }
    }
  };

  protected barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 0, max: 100, grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 } } },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } }
    }
  };

  onFilterChange(f: ReportFilters) { this.filters.set(f); }

  exportExcel() {
    exportToExcel(this.shortageList(), 'Institutional_Attendance_Shortage_Report');
  }
}

