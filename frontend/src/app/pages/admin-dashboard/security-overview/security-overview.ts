import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { AuditService } from '../../../services/audit.service';

@Component({
  selector: 'app-security-overview',
  standalone: true,
  imports: [CommonModule, MatIconModule, BaseChartDirective],
  template: `
    <div class="space-y-6 animate-fade-in pb-20">
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-[#172554] tracking-tight">Security Overview</h1>
          <p class="text-sm text-slate-500 mt-1">Real-time security monitoring, active sessions, and system threat analysis.</p>
        </div>
        <div class="flex items-center gap-2">
          <button class="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2 cursor-pointer shadow-sm">
            <mat-icon class="text-sm">refresh</mat-icon> Refresh Data
          </button>
          <button class="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-red-900/30 transition-all flex items-center gap-2 cursor-pointer">
            <mat-icon class="text-sm">lock</mat-icon> Emergency Lockout
          </button>
        </div>
      </div>

      <!-- KPI Strip -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        @for (kpi of kpis(); track kpi.label) {
          <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div [class]="kpi.color + ' absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 opacity-5 transition-transform group-hover:scale-110'"></div>
            <div class="flex items-start justify-between relative z-10">
              <div [class]="kpi.bgColor + ' ' + kpi.iconColor + ' w-10 h-10 rounded-xl flex items-center justify-center shadow-sm'">
                <mat-icon class="text-lg">{{ kpi.icon }}</mat-icon>
              </div>
              <span [class]="kpi.trendColor + ' text-[10px] font-bold bg-opacity-10 px-2 py-0.5 rounded-full'">{{ kpi.trend }}</span>
            </div>
            <div class="mt-4 relative z-10">
              <h4 class="text-2xl font-black text-slate-900 tabular-nums">{{ kpi.value }}</h4>
              <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">{{ kpi.label }}</p>
            </div>
          </div>
        }
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Login Success vs Failure -->
        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 class="font-bold text-slate-900 text-sm mb-6 flex items-center gap-2">
            <mat-icon class="text-[#6D42E8] text-base">login</mat-icon> Authentication Success Rate
          </h3>
          <div class="h-[280px] relative">
            <canvas baseChart
              [data]="pieChartData()"
              [options]="pieChartOptions"
              [type]="'pie'">
            </canvas>
          </div>
        </div>

        <!-- Security Alerts Trend -->
        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 class="font-bold text-slate-900 text-sm mb-6 flex items-center gap-2">
            <mat-icon class="text-red-500 text-base">warning</mat-icon> Failed Login Attempts (24h)
          </h3>
          <div class="h-[280px] relative">
            <canvas baseChart
              [data]="lineChartData()"
              [options]="lineChartOptions"
              [type]="'line'">
            </canvas>
          </div>
        </div>
      </div>

      <!-- Active Sessions Table -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 class="font-bold text-slate-900 text-sm">Active User Sessions</h3>
            <p class="text-[11px] text-slate-500">Currently authenticated users across all devices.</p>
          </div>
          <button class="text-xs font-bold text-red-600 hover:underline cursor-pointer">Terminate All Sessions</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-100">
                <th class="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">User / Role</th>
                <th class="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">IP Address</th>
                <th class="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Browser / Device</th>
                <th class="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Login Time</th>
                <th class="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              @for (session of activeSessions(); track session.id) {
                <tr class="hover:bg-slate-50/50 transition-colors">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[10px]">
                        {{ session.userName.substring(0, 2).toUpperCase() }}
                      </div>
                      <div>
                        <p class="font-bold text-slate-900">{{ session.userName }}</p>
                        <p class="text-[10px] text-slate-500 font-medium tracking-wide uppercase">{{ session.role }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-slate-600 font-medium tabular-nums">{{ session.ipAddress }}</td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                      <mat-icon class="text-slate-400 text-sm">desktop_windows</mat-icon>
                      <span class="text-slate-600">Chrome on Windows</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-slate-500 tabular-nums">{{ session.timestamp | date:'short' }}</td>
                  <td class="px-6 py-4 text-right">
                    <button class="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-all cursor-pointer">
                      Terminate
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SecurityOverviewPage {
  private readonly auditService = inject(AuditService);

  protected readonly auditLogs = this.auditService.entries;

  protected readonly activeSessions = computed(() => {
    return this.auditLogs().filter(e => e.action === 'Login' && e.status === 'Success').slice(0, 8);
  });

  protected readonly kpis = computed(() => {
    const logs = this.auditLogs();
    const activeSessionsCount = this.activeSessions().length;
    const failedLogins = logs.filter(e => e.action === 'Failed Login' || (e.action === 'Login' && e.status === 'Failure')).length;
    const securityAlerts = logs.filter(e => e.action === 'Permission Change' || e.status === 'Failure').length;

    return [
      { label: 'Active Sessions', value: activeSessionsCount, icon: 'wifi', trend: '+12%', trendColor: 'text-emerald-600 bg-emerald-600', bgColor: 'bg-emerald-100', iconColor: 'text-emerald-600', color: 'bg-emerald-600' },
      { label: 'Failed Logins (24h)', value: failedLogins, icon: 'no_encryption', trend: '-5%', trendColor: 'text-red-600 bg-red-600', bgColor: 'bg-red-100', iconColor: 'text-red-600', color: 'bg-red-600' },
      { label: 'Security Alerts', value: securityAlerts, icon: 'gpp_maybe', trend: 'Stable', trendColor: 'text-orange-600 bg-orange-600', bgColor: 'bg-orange-100', iconColor: 'text-orange-600', color: 'bg-orange-600' },
      { label: 'Avg Session Time', value: '24m', icon: 'timer', trend: '+2m', trendColor: 'text-blue-600 bg-blue-600', bgColor: 'bg-blue-100', iconColor: 'text-blue-600', color: 'bg-blue-600' }
    ];
  });

  protected readonly pieChartData = computed<ChartConfiguration['data']>(() => {
    const logs = this.auditLogs();
    const success = logs.filter(e => e.action === 'Login' && e.status === 'Success').length;
    const failure = logs.filter(e => e.action === 'Failed Login' || (e.action === 'Login' && e.status === 'Failure')).length;

    return {
      labels: ['Successful Logins', 'Failed Attempts'],
      datasets: [{
        data: [success, failure],
        backgroundColor: ['#6D42E8', '#F43F5E'],
        hoverBackgroundColor: ['#4F46E5', '#E11D48'],
        borderWidth: 0
      }]
    };
  });

  protected readonly pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 8, font: { size: 10, weight: 'bold' } } }
    }
  };

  protected readonly lineChartData = computed<ChartConfiguration['data']>(() => {
    return {
      labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'],
      datasets: [{
        label: 'Failed Attempts',
        data: [2, 5, 3, 8, 12, 6, 4],
        borderColor: '#F43F5E',
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#F43F5E'
      }]
    };
  });

  protected readonly lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { border: { dash: [4, 4] }, ticks: { font: { size: 10 } } }
    }
  };
}
