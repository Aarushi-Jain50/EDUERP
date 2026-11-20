import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { PageHeader } from '../../../components/shared/page-header';
import { ReportFilterBar, ReportFilters } from '../../../components/reports/report-filter-bar';
import { KpiCard } from '../../../components/reports/kpi-card';
import { ChartCard } from '../../../components/reports/chart-card';
import { FinanceService } from '../../../services/finance.service';
import { AcademicService } from '../../../services/academic.service';
import { StudentsService } from '../../../services/students.service';
import { formatCurrency } from '../../../utils/money.helper';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

@Component({
  selector: 'app-fee-reports',
  imports: [CommonModule, MatIconModule, PageHeader, ReportFilterBar, KpiCard, ChartCard, BaseChartDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans animate-in fade-in duration-500">
      <app-page-header
        title="Fee & Financial Reports"
        subtitle="Institutional revenue tracking, outstanding dues analysis, and collection efficiency metrics."
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

      <app-report-filter-bar [showDateRange]="true" (filterChange)="onFilterChange($event)" />

      <!-- KPI Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <app-kpi-card label="Total Collected" [value]="formatCurrency(stats().collected)" icon="payments" iconBgClass="bg-emerald-50 border-emerald-100" iconColorClass="text-emerald-600" />
        <app-kpi-card label="Total Outstanding" [value]="formatCurrency(stats().outstanding)" icon="warning" iconBgClass="bg-rose-50 border-rose-100" iconColorClass="text-rose-600" />
        <app-kpi-card label="Collection Eff." [value]="stats().efficiency + '%'" icon="trending_up" iconBgClass="bg-indigo-50 border-indigo-100" iconColorClass="text-indigo-600" />
        <app-kpi-card label="Fee Defaulters" [value]="stats().defaulters" icon="people" iconBgClass="bg-amber-50 border-amber-100" iconColorClass="text-amber-600" />
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <app-chart-card title="Monthly Collection Trend" subtitle="Settled receipt revenue aggregated by month (₹)" [isEmpty]="trendData().labels?.length === 0">
          <canvas baseChart [data]="trendData()" [options]="barChartOptions" [type]="'bar'"></canvas>
        </app-chart-card>

        <app-chart-card title="Payment Mode Distribution" subtitle="Split of digital vs traditional collections" [isEmpty]="modeData().labels?.length === 0">
          <canvas baseChart [data]="modeData()" [options]="doughnutOptions" [type]="'doughnut'"></canvas>
        </app-chart-card>
      </div>

      <!-- Course-wise Table -->
      <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div class="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center text-slate-400">
          <h4 class="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <mat-icon class="!text-base !w-4 !h-4 text-[#6D42E8]">account_balance</mat-icon>
            Course-wise Revenue Breakdown
          </h4>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th class="px-6 py-4 border-b border-slate-100">Course Name</th>
                <th class="px-6 py-4 border-b border-slate-100 text-right">Target Amount</th>
                <th class="px-6 py-4 border-b border-slate-100 text-right text-emerald-600">Collected</th>
                <th class="px-6 py-4 border-b border-slate-100 text-right text-rose-600">Outstanding</th>
                <th class="px-6 py-4 border-b border-slate-100 text-center">Defaulters</th>
                <th class="px-6 py-4 border-b border-slate-100 text-center">Recovery %</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              @for (row of tableData(); track row.course) {
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-6 py-4 text-xs font-bold text-slate-900">{{ row.course }}</td>
                  <td class="px-6 py-4 text-xs font-medium text-slate-500 text-right">{{ formatCurrency(row.target) }}</td>
                  <td class="px-6 py-4 text-xs font-black text-emerald-700 text-right">{{ formatCurrency(row.collected) }}</td>
                  <td class="px-6 py-4 text-xs font-black text-rose-700 text-right">{{ formatCurrency(row.outstanding) }}</td>
                  <td class="px-6 py-4 text-xs font-medium text-slate-600 text-center">{{ row.defaulters }}</td>
                  <td class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center gap-2">
                      <div class="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full bg-[#6D42E8]" [style.width.%]="row.efficiency"></div>
                      </div>
                      <span class="text-[10px] font-black text-slate-700">{{ row.efficiency }}%</span>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="p-10 text-center text-slate-400 text-xs italic">No course fee metrics match the active filters.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class FeeReportsPage {
  private readonly financeService = inject(FinanceService);
  private readonly academicService = inject(AcademicService);
  private readonly studentsService = inject(StudentsService);

  protected readonly filters = signal<ReportFilters>({
    academicYear: 'All',
    courseId: 'All',
    semester: 'All'
  });

  protected readonly filteredStudentIds = computed(() => {
    const f = this.filters();
    return new Set(
      this.studentsService
        .students()
        .filter(s => {
          if (f.academicYear !== 'All' && s.academicYear !== f.academicYear) return false;
          if (f.courseId !== 'All' && s.courseId !== f.courseId) return false;
          if (f.semester !== 'All' && s.semester !== f.semester) return false;
          return true;
        })
        .map(s => s.id)
    );
  });

  protected readonly filteredLedgers = computed(() => {
    const ids = this.filteredStudentIds();
    return this.financeService.ledgers().filter(l => ids.has(l.studentId));
  });

  protected readonly filteredPayments = computed(() => {
    const f = this.filters();
    const ids = this.filteredStudentIds();
    return this.financeService.payments().filter(p => {
      if (p.status !== 'Paid') return false;
      if (!ids.has(p.studentId)) return false;
      if (f.startDate && p.date < f.startDate) return false;
      if (f.endDate && p.date > f.endDate) return false;
      return true;
    });
  });

  protected readonly stats = computed(() => {
    const payments = this.filteredPayments();
    const ledgers = this.filteredLedgers();

    const collected = payments.reduce((acc, p) => acc + p.total, 0);
    let totalDue = 0;
    let defaultersCount = 0;

    ledgers.forEach(l => {
      const unpaid = l.installments.filter(i => i.status !== 'Paid');
      if (unpaid.length > 0) {
        defaultersCount++;
        totalDue += unpaid.reduce(
          (acc, i) => acc + Math.max(0, i.totalAmount - i.paidAmount - (i.concessionAmount || 0)),
          0
        );
      }
    });

    const totalExpected = collected + totalDue;
    const efficiency = totalExpected > 0 ? Math.round((collected / totalExpected) * 100) : 0;

    return { collected, outstanding: totalDue, efficiency, defaulters: defaultersCount };
  });

  protected readonly trendData = computed<ChartData<'bar'>>(() => {
    const monthTotals: Record<string, number> = {};
    for (const p of this.filteredPayments()) {
      const month = (p.date || '2025-08').slice(0, 7);
      monthTotals[month] = (monthTotals[month] || 0) + p.total;
    }
    const keys = Object.keys(monthTotals).sort();

    return {
      labels: keys,
      datasets: [
        {
          data: keys.map(k => monthTotals[k]),
          label: 'Actual Collected (₹)',
          backgroundColor: '#6D42E8',
          borderRadius: 8,
          barThickness: 26
        }
      ]
    };
  });

  protected readonly modeData = computed<ChartData<'doughnut'>>(() => {
    const modes: Record<string, number> = {};
    this.filteredPayments().forEach(p => {
      modes[p.mode] = (modes[p.mode] || 0) + p.total;
    });

    return {
      labels: Object.keys(modes),
      datasets: [{
        data: Object.values(modes),
        backgroundColor: ['#6D42E8', '#D946EF', '#8B5CF6', '#F472B6', '#4F46E5'],
        borderWidth: 0
      }]
    };
  });

  protected readonly tableData = computed(() => {
    const f = this.filters();
    const ledgers = this.filteredLedgers();
    const payments = this.filteredPayments();
    const courses = this.academicService.courses().filter(c => f.courseId === 'All' || c.id === f.courseId);

    return courses
      .map(c => {
        const courseLedgers = ledgers.filter(l => l.courseId === c.id);
        const courseStudentIds = new Set(courseLedgers.map(l => l.studentId));
        const coursePayments = payments.filter(
          p => courseStudentIds.has(p.studentId) || p.courseName === c.name
        );

        const collected = coursePayments.reduce((acc, p) => acc + p.total, 0);
        const outstanding = courseLedgers.reduce((acc, l) => {
          return (
            acc +
            l.installments
              .filter(i => i.status !== 'Paid')
              .reduce((sum, i) => sum + Math.max(0, i.totalAmount - i.paidAmount - (i.concessionAmount || 0)), 0)
          );
        }, 0);

        const defaulters = courseLedgers.filter(l => l.installments.some(i => i.status !== 'Paid')).length;
        const target = collected + outstanding;
        const efficiency = target > 0 ? Math.round((collected / target) * 100) : 0;

        return { course: c.name, target, collected, outstanding, defaulters, efficiency };
      })
      .filter(row => row.target > 0 || f.courseId !== 'All');
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
    exportToExcel(this.tableData(), 'Institutional_Fee_Revenue_Report');
  }

  exportPdf() {
    const cols = ['Course', 'Target (₹)', 'Collected (₹)', 'Outstanding (₹)', 'Defaulters', 'Recovery %'];
    const rows = this.tableData().map(r => [
      r.course,
      formatCurrency(r.target),
      formatCurrency(r.collected),
      formatCurrency(r.outstanding),
      r.defaulters,
      `${r.efficiency}%`
    ]);
    exportToPdf('Institutional Fee Revenue Report', cols, rows, 'Institutional_Fee_Revenue_Report');
  }

  formatCurrency(amt: number) {
    return formatCurrency(amt);
  }
}
