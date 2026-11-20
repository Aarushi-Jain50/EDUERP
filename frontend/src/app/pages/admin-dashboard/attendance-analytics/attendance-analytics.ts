import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { PageHeader } from '../../../components/shared/page-header';
import { ReportFilterBar, ReportFilters } from '../../../components/reports/report-filter-bar';
import { KpiCard } from '../../../components/reports/kpi-card';
import { ChartCard } from '../../../components/reports/chart-card';
import { AttendanceService } from '../../../services/attendance.service';
import { AcademicService } from '../../../services/academic.service';
import { StudentsService } from '../../../services/students.service';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

interface ShortageStudent {
  id: string;
  enrollmentNo: string;
  name: string;
  course: string;
  semester: string;
  attended: number;
  total: number;
  percentage: number;
}

@Component({
  selector: 'app-attendance-analytics',
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
        title="Attendance Analytics"
        subtitle="Live session trend analytics, subject attendance comparison, and <75% shortage tracking."
        actionLabel="Export Shortage PDF"
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

      <app-report-filter-bar [showDateRange]="true" (filterChange)="onFilterChange($event)" />

      <!-- KPI Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <app-kpi-card label="Institutional Avg" [value]="stats().avg + '%'" icon="how_to_reg" iconBgClass="bg-indigo-50 border-indigo-100" iconColorClass="text-indigo-600" />
        <app-kpi-card label="Shortage (< 75%)" [value]="stats().shortageCount" icon="report" iconBgClass="bg-rose-50 border-rose-100" iconColorClass="text-rose-600" />
        <app-kpi-card label="Best Section" [value]="stats().bestSection" icon="verified" iconBgClass="bg-emerald-50 border-emerald-100" iconColorClass="text-emerald-600" />
        <app-kpi-card label="Lowest Section" [value]="stats().lowestSection" icon="trending_down" iconBgClass="bg-amber-50 border-amber-100" iconColorClass="text-amber-600" />
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <app-chart-card title="Chronological Attendance Trend" subtitle="Average attendance across recorded session dates" [isEmpty]="trendData().labels?.length === 0">
          <canvas baseChart [data]="trendData()" [options]="lineChartOptions" [type]="'line'"></canvas>
        </app-chart-card>

        <app-chart-card title="Subject-wise Attendance" subtitle="Average attendance by subject for active filters" [isEmpty]="subjectData().labels?.length === 0">
          <canvas baseChart [data]="subjectData()" [options]="barChartOptions" [type]="'bar'"></canvas>
        </app-chart-card>
      </div>

      <!-- Low Attendance Table -->
      <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div class="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h4 class="text-xs font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
            <mat-icon class="!text-sm !w-4 !h-4">warning</mat-icon>
            Attendance Shortage (Below 75%)
          </h4>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th class="px-6 py-4 border-b border-slate-100">Roll No</th>
                <th class="px-6 py-4 border-b border-slate-100">Student Name</th>
                <th class="px-6 py-4 border-b border-slate-100">Course</th>
                <th class="px-6 py-4 border-b border-slate-100 text-center">Semester</th>
                <th class="px-6 py-4 border-b border-slate-100 text-center">Attended</th>
                <th class="px-6 py-4 border-b border-slate-100 text-center">Attendance %</th>
                <th class="px-6 py-4 border-b border-slate-100 text-center">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              @for (row of shortageList(); track row.id) {
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-6 py-4 text-xs font-mono text-slate-600">{{ row.enrollmentNo }}</td>
                  <td class="px-6 py-4 text-xs font-bold text-slate-900">{{ row.name }}</td>
                  <td class="px-6 py-4 text-xs font-medium text-slate-500">{{ row.course }}</td>
                  <td class="px-6 py-4 text-xs text-slate-500 text-center">{{ row.semester }}</td>
                  <td class="px-6 py-4 text-xs text-slate-600 text-center">{{ row.attended }} / {{ row.total }}</td>
                  <td class="px-6 py-4 text-center">
                    <span class="text-xs font-black text-rose-600">{{ row.percentage }}%</span>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px] uppercase">Shortage</span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="p-10 text-center text-slate-400 italic text-xs">No students currently fall below the 75% attendance threshold.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class AttendanceAnalyticsPage {
  private readonly attendanceService = inject(AttendanceService);
  private readonly academicService = inject(AcademicService);
  private readonly studentsService = inject(StudentsService);

  protected readonly filters = signal<ReportFilters>({
    academicYear: 'All',
    courseId: 'All',
    semester: 'All',
  });

  protected readonly filteredSessions = computed(() => {
    const f = this.filters();
    return this.attendanceService.sessions().filter(s => {
      if (f.courseId !== 'All' && s.courseId !== f.courseId) return false;
      if (f.semester !== 'All' && s.semester !== f.semester) return false;
      if (f.startDate && s.date < f.startDate) return false;
      if (f.endDate && s.date > f.endDate) return false;
      return true;
    });
  });

  protected readonly stats = computed(() => {
    const sessions = this.filteredSessions();
    const avg = sessions.length > 0 ? Math.round(sessions.reduce((acc, s) => acc + s.percentage, 0) / sessions.length) : 0;

    const sectionStats: Record<string, { label: string; total: number; count: number }> = {};
    const sectionsCatalog = this.academicService.sections();
    sessions.forEach(s => {
      const key = `${s.courseId}-${s.sectionId}`;
      const secName = sectionsCatalog.find(sec => sec.id === s.sectionId)?.section || s.sectionId.toUpperCase();
      if (!sectionStats[key]) sectionStats[key] = { label: secName, total: 0, count: 0 };
      sectionStats[key].total += s.percentage;
      sectionStats[key].count++;
    });

    const ranked = Object.values(sectionStats)
      .map(val => ({ label: val.label, avg: val.total / val.count }))
      .sort((a, b) => b.avg - a.avg);

    return {
      avg,
      shortageCount: this.shortageList().length,
      bestSection: ranked[0] ? `${ranked[0].label} (${Math.round(ranked[0].avg)}%)` : 'N/A',
      lowestSection: ranked[ranked.length - 1]
        ? `${ranked[ranked.length - 1].label} (${Math.round(ranked[ranked.length - 1].avg)}%)`
        : 'N/A',
    };
  });

  protected readonly trendData = computed<ChartData<'line'>>(() => {
    const dateGroups: Record<string, { total: number; count: number }> = {};
    for (const s of this.filteredSessions()) {
      if (!dateGroups[s.date]) dateGroups[s.date] = { total: 0, count: 0 };
      dateGroups[s.date].total += s.percentage;
      dateGroups[s.date].count++;
    }
    const dates = Object.keys(dateGroups).sort();
    return {
      labels: dates,
      datasets: [
        {
          data: dates.map(d => Math.round(dateGroups[d].total / dateGroups[d].count)),
          label: 'Avg Attendance %',
          borderColor: '#6D42E8',
          backgroundColor: 'rgba(109, 66, 232, 0.1)',
          fill: true,
          tension: 0.35,
        },
      ],
    };
  });

  protected readonly subjectData = computed<ChartData<'bar'>>(() => {
    const sessions = this.filteredSessions();
    const subjects = this.academicService.subjects();
    const subStats: Record<string, { total: number; count: number }> = {};

    sessions.forEach(s => {
      if (!subStats[s.subjectId]) subStats[s.subjectId] = { total: 0, count: 0 };
      subStats[s.subjectId].total += s.percentage;
      subStats[s.subjectId].count++;
    });

    return {
      labels: Object.keys(subStats).map(id => subjects.find(sub => sub.id === id)?.code || id),
      datasets: [
        {
          data: Object.values(subStats).map(v => Math.round(v.total / v.count)),
          label: 'Attendance %',
          backgroundColor: '#D946EF',
          borderRadius: 8,
        },
      ],
    };
  });

  protected readonly shortageList = computed<ShortageStudent[]>(() => {
    const f = this.filters();
    return this.studentsService
      .students()
      .filter(s => {
        if (f.academicYear !== 'All' && s.academicYear !== f.academicYear) return false;
        if (f.courseId !== 'All' && s.courseId !== f.courseId) return false;
        if (f.semester !== 'All' && s.semester !== f.semester) return false;
        return true;
      })
      .map(s => {
        const att = this.attendanceService.getStudentAttendanceStats(s.id);
        if (att.total > 0 && att.percentage < 75) {
          return {
            id: s.id,
            enrollmentNo: s.enrollmentNo,
            name: s.name,
            course: s.course,
            semester: s.semester,
            attended: att.attended,
            total: att.total,
            percentage: att.percentage,
          };
        }
        return null;
      })
      .filter((s): s is ShortageStudent => s !== null);
  });

  protected readonly lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 0, max: 100, grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 } } },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
    },
  };

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
    exportToExcel(this.shortageList(), 'Institutional_Attendance_Shortage_Report');
  }

  exportPdf() {
    exportToPdf(
      'Attendance Shortage Report (<75%)',
      ['Roll No', 'Student', 'Course', 'Semester', 'Attended', 'Percentage'],
      this.shortageList().map(r => [
        r.enrollmentNo,
        r.name,
        r.course,
        r.semester,
        `${r.attended}/${r.total}`,
        `${r.percentage}%`,
      ]),
      'Attendance_Shortage_Report'
    );
  }
}
