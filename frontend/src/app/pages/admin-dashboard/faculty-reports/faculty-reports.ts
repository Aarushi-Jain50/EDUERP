import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { PageHeader } from '../../../components/shared/page-header';
import { ReportFilterBar, ReportFilters } from '../../../components/reports/report-filter-bar';
import { KpiCard } from '../../../components/reports/kpi-card';
import { ChartCard } from '../../../components/reports/chart-card';
import { FacultyService } from '../../../services/faculty.service';
import { AcademicService } from '../../../services/academic.service';
import { TimetableService } from '../../../services/timetable.service';
import { AssignmentsService } from '../../../services/assignments.service';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

@Component({
  selector: 'app-faculty-reports',
  imports: [CommonModule, MatIconModule, PageHeader, ReportFilterBar, KpiCard, ChartCard, BaseChartDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans animate-in fade-in duration-500">
      <app-page-header
        title="Faculty & Workload Reports"
        subtitle="Analyze teaching hours, subject allocations, and assignment workload derived from live timetable and allocations."
        actionLabel="Export Excel"
        actionIcon="table_view"
        (actionClicked)="exportExcel()"
      />

      <div class="flex justify-end -mt-2">
        <button
          type="button"
          (click)="exportPdf()"
          class="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
        >
          <mat-icon class="!text-sm !w-4 !h-4 text-rose-600">picture_as_pdf</mat-icon>
          Export PDF
        </button>
      </div>

      <app-report-filter-bar (filterChange)="onFilterChange($event)" />

      <!-- KPI Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <app-kpi-card label="Active Faculty" [value]="stats().total" icon="badge" iconBgClass="bg-indigo-50 border-indigo-100" iconColorClass="text-indigo-600" />
        <app-kpi-card label="Avg Weekly Hours" [value]="stats().avgHours + 'h'" icon="schedule" iconBgClass="bg-emerald-50 border-emerald-100" iconColorClass="text-emerald-600" />
        <app-kpi-card label="Subject Allocations" [value]="stats().totalAllocations" icon="menu_book" iconBgClass="bg-purple-50 border-purple-100" iconColorClass="text-purple-600" />
        <app-kpi-card label="Coursework Tasks" [value]="stats().totalAssignments" icon="assignment" iconBgClass="bg-amber-50 border-amber-100" iconColorClass="text-amber-600" />
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <app-chart-card title="Department-wise Faculty" subtitle="Staff distribution across academic departments" [isEmpty]="deptData().labels?.length === 0">
          <canvas baseChart [data]="deptData()" [options]="doughnutOptions" [type]="'doughnut'"></canvas>
        </app-chart-card>

        <app-chart-card title="Teaching Hours per Week" subtitle="Timetable + allocated hours per faculty member" [isEmpty]="hoursData().labels?.length === 0">
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
                <th class="px-6 py-4 border-b border-slate-100">Department</th>
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
                  <td class="px-6 py-4 text-xs text-slate-600">{{ row.department }}</td>
                  <td class="px-6 py-4 text-xs font-medium text-slate-500">{{ row.designation }}</td>
                  <td class="px-6 py-4 text-xs font-black text-indigo-700 text-center">{{ row.hours }}h / {{ row.maxHours }}h</td>
                  <td class="px-6 py-4 text-xs font-medium text-slate-600 text-center">{{ row.subjects }}</td>
                  <td class="px-6 py-4 text-xs font-medium text-slate-600 text-center">{{ row.assignments }}</td>
                  <td class="px-6 py-4 text-center">
                    <span
                      class="px-2 py-0.5 rounded-full font-bold text-[10px] uppercase"
                      [class]="row.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
                    >
                      {{ row.status }}
                    </span>
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

  protected readonly filters = signal<ReportFilters>({
    academicYear: 'All',
    courseId: 'All',
    semester: 'All'
  });

  private readonly selectedCourseName = computed(() => {
    const courseId = this.filters().courseId;
    if (courseId === 'All') return null;
    return this.academicService.courses().find(c => c.id === courseId)?.name ?? null;
  });

  protected readonly tableData = computed(() => {
    const f = this.filters();
    const courseName = this.selectedCourseName();
    const selectedCourseObj = f.courseId !== 'All' ? this.academicService.courses().find(c => c.id === f.courseId) : undefined;
    const semesterNum = f.semester !== 'All' ? Number(f.semester.replace(/\D/g, '')) : null;

    const faculty = this.facultyService.facultyList().filter(fac => {
      if (selectedCourseObj && fac.department !== selectedCourseObj.department) return false;
      return true;
    });

    const slots = this.timetableService.slots().filter(s => {
      if (f.courseId !== 'All' && s.courseId !== f.courseId) return false;
      if (semesterNum !== null && s.semester !== semesterNum) return false;
      return true;
    });

    const allocations = this.academicService.subjectAllocations().filter(a => {
      if (courseName && a.course !== courseName) return false;
      if (f.semester !== 'All' && a.semester !== f.semester) return false;
      return true;
    });

    const subjectsCatalog = this.academicService.subjects();
    const assignments = this.assignmentsService.assignments().filter(asgn => {
      if (courseName) {
        const sub = subjectsCatalog.find(sb => sb.id === asgn.subjectId);
        if (sub && sub.course !== courseName) return false;
      }
      if (f.semester !== 'All') {
        const sub = subjectsCatalog.find(sb => sb.id === asgn.subjectId);
        if (sub && sub.semester !== f.semester) return false;
      }
      return true;
    });

    return faculty.map(fac => {
      const normalizedName = fac.name.toLowerCase().trim();
      const facultySlots = slots.filter(
        s => s.facultyId === fac.id || s.facultyName.toLowerCase().trim() === normalizedName
      );
      const facultyAllocs = allocations.filter(
        a => a.faculty.toLowerCase().trim() === normalizedName
      );

      const allocHours = facultyAllocs.reduce((sum, a) => sum + (a.weeklyHours || 0), 0);
      const hours = Math.max(facultySlots.length, allocHours);

      const subjectNames = new Set<string>([
        ...facultySlots.map(s => s.subjectName),
        ...facultyAllocs.map(a => a.subject)
      ]);

      const facultyAssignments = assignments.filter(a => {
        const resolved = this.assignmentsService.resolveFacultyForAssignment(a);
        return (
          resolved.facultyId === fac.id ||
          resolved.facultyName.toLowerCase().trim() === normalizedName
        );
      }).length;

      return {
        id: fac.id,
        name: fac.name,
        initials: fac.initials || fac.name.split(' ').map(n => n[0]).join(''),
        department: fac.department,
        designation: fac.designation,
        hours,
        maxHours: fac.maxWeeklyHours ?? 18,
        subjects: subjectNames.size,
        assignments: facultyAssignments,
        status: fac.status
      };
    });
  });

  protected readonly stats = computed(() => {
    const rows = this.tableData();
    const avgHours = rows.length > 0 ? Math.round(rows.reduce((acc, r) => acc + r.hours, 0) / rows.length) : 0;
    const totalAllocations = rows.reduce((acc, r) => acc + r.subjects, 0);
    const totalAssignments = rows.reduce((acc, r) => acc + r.assignments, 0);

    return {
      total: rows.length,
      avgHours,
      totalAllocations,
      totalAssignments
    };
  });

  protected readonly deptData = computed<ChartData<'doughnut'>>(() => {
    const rows = this.tableData();
    const depts: Record<string, number> = {};
    rows.forEach(r => {
      depts[r.department] = (depts[r.department] || 0) + 1;
    });

    return {
      labels: Object.keys(depts),
      datasets: [{
        data: Object.values(depts),
        backgroundColor: ['#6D42E8', '#D946EF', '#8B5CF6', '#F472B6', '#4F46E5', '#06B6D4'],
        borderWidth: 0
      }]
    };
  });

  protected readonly hoursData = computed<ChartData<'bar'>>(() => {
    const table = [...this.tableData()].sort((a, b) => b.hours - a.hours).slice(0, 10);
    return {
      labels: table.map(r => r.name.split(' ').slice(0, 2).join(' ')),
      datasets: [{
        data: table.map(r => r.hours),
        label: 'Weekly Teaching Hours',
        backgroundColor: '#6D42E8',
        borderRadius: 8,
        barThickness: 22
      }]
    };
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

  protected readonly doughnutOptions: ChartConfiguration<'doughnut'>['options'] = {
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
    exportToExcel(this.tableData(), 'Institutional_Faculty_Workload_Report');
  }

  exportPdf() {
    const cols = ['Faculty Name', 'Department', 'Designation', 'Weekly Hours', 'Subjects', 'Assignments', 'Status'];
    const rows = this.tableData().map(r => [
      r.name,
      r.department,
      r.designation,
      `${r.hours}h / ${r.maxHours}h`,
      r.subjects,
      r.assignments,
      r.status
    ]);
    exportToPdf('Faculty & Workload Distribution Report', cols, rows, 'Institutional_Faculty_Workload_Report');
  }
}
