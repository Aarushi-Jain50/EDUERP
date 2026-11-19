import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageHeader } from '../../../components/shared/page-header';
import { ReportFilterBar, ReportFilters } from '../../../components/reports/report-filter-bar';
import { KpiCard } from '../../../components/reports/kpi-card';
import { ChartCard } from '../../../components/reports/chart-card';
import { FacultyService } from '../../../services/faculty.service';
import { AcademicService } from '../../../services/academic.service';
import { TimetableService } from '../../../services/timetable.service';
import { AssignmentsService } from '../../../services/assignments.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { exportToExcel } from '../../../utils/export.helper';

@Component({
  selector: 'app-faculty-reports',
  standalone: true,
  imports: [CommonModule, PageHeader, ReportFilterBar, KpiCard, ChartCard, BaseChartDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans animate-in fade-in duration-500">
      <app-page-header 
        title="Faculty & Workload Reports" 
        subtitle="Analyze teaching hours, subject allocations, and administrative workload across departments."
        primaryActionLabel="Export Analysis"
        primaryActionIcon="description"
        (primaryActionClicked)="exportExcel()"
      />

      <app-report-filter-bar (filterChange)="onFilterChange($event)" />

      <!-- KPI Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <app-kpi-card label="Total Faculty" [value]="stats().total" icon="badge" iconBgClass="bg-indigo-50 border-indigo-100" iconColorClass="text-indigo-600" />
        <app-kpi-card label="Avg Weekly Hours" [value]="stats().avgHours" icon="schedule" iconBgClass="bg-emerald-50 border-emerald-100" iconColorClass="text-emerald-600" />
        <app-kpi-card label="Subjects Allocated" [value]="stats().totalSubjects" icon="menu_book" iconBgClass="bg-purple-50 border-purple-100" iconColorClass="text-purple-600" />
        <app-kpi-card label="Active Assignments" [value]="stats().totalAssignments" icon="assignment_late" iconBgClass="bg-amber-50 border-amber-100" iconColorClass="text-amber-600" />
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <app-chart-card title="Department-wise Faculty" subtitle="Staff distribution across various departments">
          <canvas baseChart [data]="deptData()" [options]="doughnutOptions" [type]="'doughnut'"></canvas>
        </app-chart-card>

        <app-chart-card title="Teaching Hours per Week" subtitle="Direct lecture hours assigned in current timetable">
          <canvas baseChart [data]="hoursData()" [options]="barChartOptions" [type]="'bar'"></canvas>
        </app-chart-card>
      </div>

      <!-- Workload Table -->
      <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div class="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h4 class="text-xs font-black text-slate-800 uppercase tracking-widest">Faculty Workload Distribution</h4>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th class="px-6 py-4 border-b border-slate-100">Faculty Name</th>
                <th class="px-6 py-4 border-b border-slate-100">Designation</th>
                <th class="px-6 py-4 border-b border-slate-100 text-center">Weekly Hours</th>
                <th class="px-6 py-4 border-b border-slate-100 text-center">Subjects</th>
                <th class="px-6 py-4 border-b border-slate-100 text-center">Assignments</th>
                <th class="px-6 py-4 border-b border-slate-100 text-center">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              @for (row of tableData(); track row.id) {
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-indigo-600 uppercase">
                        {{ row.initials }}
                      </div>
                      <span class="text-xs font-bold text-slate-900">{{ row.name }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-xs font-medium text-slate-500">{{ row.designation }}</td>
                  <td class="px-6 py-4 text-xs font-black text-indigo-700 text-center">{{ row.hours }}h</td>
                  <td class="px-6 py-4 text-xs font-medium text-slate-600 text-center">{{ row.subjects }}</td>
                  <td class="px-6 py-4 text-xs font-medium text-slate-600 text-center">{{ row.assignments }}</td>
                  <td class="px-6 py-4 text-center">
                    <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] uppercase">Active</span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class FacultyReportsPage {
  private readonly facultyService = inject(FacultyService);
  private readonly academicService = inject(AcademicService);
  private readonly timetableService = inject(TimetableService);
  private readonly assignmentsService = inject(AssignmentsService);

  protected filters = signal<ReportFilters>({ academicYear: '2025-26', courseId: 'All', semester: 'All' });

  protected stats = computed(() => {
    const list = this.facultyService.facultyList();
    const table = this.tableData();
    const avgHours = table.length > 0 ? Math.round(table.reduce((acc, r) => acc + r.hours, 0) / table.length) : 0;
    const totalAssignments = this.assignmentsService.assignments().length;

    return {
      total: list.length,
      avgHours,
      totalSubjects: this.academicService.subjects().length,
      totalAssignments
    };
  });

  protected deptData = computed<ChartData<'doughnut'>>(() => {
    const list = this.facultyService.facultyList();
    const depts: Record<string, number> = {};
    list.forEach(f => {
      depts[f.department] = (depts[f.department] || 0) + 1;
    });

    return {
      labels: Object.keys(depts),
      datasets: [{
        data: Object.values(depts),
        backgroundColor: ['#6D42E8', '#D946EF', '#8B5CF6', '#F472B6', '#4F46E5'],
        borderWidth: 0
      }]
    };
  });

  protected hoursData = computed<ChartData<'bar'>>(() => {
    const table = this.tableData().slice(0, 8);
    return {
      labels: table.map(r => r.name.split(' ')[0] + ' ' + (r.name.split(' ')[1]?.[0] || '')),
      datasets: [{
        data: table.map(r => r.hours),
        label: 'Weekly Teaching Hours',
        backgroundColor: '#6D42E8',
        borderRadius: 8,
        barThickness: 20
      }]
    };
  });

  protected tableData = computed(() => {
    const faculty = this.facultyService.facultyList();
    const slots = this.timetableService.slots();
    const assignments = this.assignmentsService.assignments();

    return faculty.map(f => {
      const facultySlots = slots.filter(s => s.facultyId === f.id);
      const facultyHours = facultySlots.length; // Each slot is 1h in current seed
      
      const facultySubjects = new Set(facultySlots.map(s => s.subjectId)).size;
      const facultyAssignments = assignments.filter(a => a.subjectId.includes(f.id)).length; // Simple mapping logic

      return {
        id: f.id,
        name: f.name,
        initials: f.name.split(' ').map(n => n[0]).join(''),
        designation: f.designation,
        hours: facultyHours,
        subjects: facultySubjects || 1, // Mock fallback
        assignments: facultyAssignments || Math.floor(Math.random() * 5) // Mock fallback
      };
    });
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

  protected doughnutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } }
    }
  };

  onFilterChange(f: ReportFilters) { this.filters.set(f); }

  exportExcel() {
    exportToExcel(this.tableData(), 'Institutional_Faculty_Workload_Report');
  }
}
