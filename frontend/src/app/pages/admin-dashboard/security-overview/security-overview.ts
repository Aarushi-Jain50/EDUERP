import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { AuditService } from '../../../services/audit.service';
import { UserAccountsService } from '../../../services/user-accounts.service';
import { SettingsService } from '../../../services/settings.service';
import { ActivityService } from '../../../services/activity.service';
import { CurrentUserService } from '../../../services/current-user.service';
import { PageHeader } from '../../../components/shared/page-header';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';

@Component({
  selector: 'app-security-overview',
  imports: [CommonModule, MatIconModule, BaseChartDirective, PageHeader, ConfirmDialog],
  template: `
    <div class="space-y-6 animate-fade-in pb-20 max-w-6xl mx-auto">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <app-page-header
          title="Security Overview"
          subtitle="Live security telemetry, authentication risk charts, locked account controls, and active session management."
        />
        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            (click)="refreshTelemetry()"
            class="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <mat-icon class="text-sm">refresh</mat-icon> Refresh Data
          </button>
          <button
            type="button"
            (click)="showLockoutConfirm.set(true)"
            [class]="lockoutState().active ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'"
            class="text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <mat-icon class="text-sm">{{ lockoutState().active ? 'lock_open' : 'lock' }}</mat-icon>
            {{ lockoutState().active ? 'Lift Lockout' : 'Emergency Lockout' }}
          </button>
        </div>
      </div>

      @if (lockoutState().active) {
        <div class="bg-red-600 text-white px-5 py-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div class="flex items-start gap-3">
            <mat-icon class="text-xl shrink-0">gpp_bad</mat-icon>
            <div>
              <p class="text-xs font-extrabold uppercase tracking-wider">Emergency Security Lockout Active</p>
              <p class="text-[11px] text-red-100 mt-0.5">
                Triggered by {{ lockoutState().activatedBy || 'Administrator' }} at {{ lockoutState().activatedAt | date:'medium' }}.
                Non-admin authentication requests are flagged for review.
              </p>
            </div>
          </div>
          <button
            type="button"
            (click)="showLockoutConfirm.set(true)"
            class="bg-white text-red-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-50 cursor-pointer shrink-0"
          >
            Lift Lockout
          </button>
        </div>
      }

      @if (toastMessage()) {
        <div class="px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <mat-icon class="text-base">check_circle</mat-icon>
            <span>{{ toastMessage() }}</span>
          </div>
          <button type="button" (click)="toastMessage.set('')" class="cursor-pointer">
            <mat-icon class="text-base">close</mat-icon>
          </button>
        </div>
      }

      <!-- KPI Strip -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        @for (kpi of kpis(); track kpi.label) {
          <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div [class]="kpi.color + ' absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 opacity-5 transition-transform group-hover:scale-110'"></div>
            <div class="flex items-start justify-between relative z-10">
              <div [class]="kpi.bgColor + ' ' + kpi.iconColor + ' w-10 h-10 rounded-xl flex items-center justify-center shadow-sm'">
                <mat-icon class="text-lg">{{ kpi.icon }}</mat-icon>
              </div>
              <span class="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{{ kpi.badge }}</span>
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
        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 class="font-bold text-slate-900 text-sm mb-6 flex items-center gap-2">
            <mat-icon class="text-[#6D42E8] text-base">login</mat-icon> Authentication Success Rate
          </h3>
          <div class="h-[280px] relative">
            <canvas baseChart [data]="pieChartData()" [options]="pieChartOptions" [type]="'pie'"></canvas>
          </div>
        </div>

        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 class="font-bold text-slate-900 text-sm mb-6 flex items-center gap-2">
            <mat-icon class="text-red-500 text-base">warning</mat-icon> Failed Login & Alert Trend (Last 24h)
          </h3>
          <div class="h-[280px] relative">
            <canvas baseChart [data]="lineChartData()" [options]="lineChartOptions" [type]="'line'"></canvas>
          </div>
        </div>
      </div>

      <!-- Locked & Flagged Accounts -->
      @if (lockedAccounts().length > 0) {
        <div class="bg-white rounded-3xl border border-amber-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <mat-icon class="text-amber-600 text-lg">admin_panel_settings</mat-icon>
              <div>
                <h3 class="font-bold text-slate-900 text-sm">Locked & Flagged Accounts</h3>
                <p class="text-[11px] text-slate-500">Accounts locked due to failed password attempts or manual security suspension.</p>
              </div>
            </div>
          </div>
          <div class="divide-y divide-slate-100">
            @for (acc of lockedAccounts(); track acc.id) {
              <div class="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p class="text-xs font-bold text-slate-900">{{ acc.name }} ({{ acc.email }})</p>
                  <p class="text-[11px] text-slate-500 mt-0.5">
                    Role: {{ acc.role }} · Failed Attempts: {{ acc.failedLoginAttempts ?? 0 }} · Status: {{ acc.status }}
                  </p>
                </div>
                <button
                  type="button"
                  (click)="unlockUser(acc.id, acc.name)"
                  class="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  <mat-icon class="text-sm">lock_open</mat-icon> Unlock Account
                </button>
              </div>
            }
          </div>
        </div>
      }

      <!-- Active Sessions Table -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
          <div>
            <h3 class="font-bold text-slate-900 text-sm">Active User Sessions ({{ activeSessions().length }})</h3>
            <p class="text-[11px] text-slate-500">Live authenticated console sessions from recent login audit events.</p>
          </div>
          @if (activeSessions().length > 0) {
            <button
              type="button"
              (click)="showTerminateAllConfirm.set(true)"
              class="text-xs font-bold text-red-600 hover:underline cursor-pointer"
            >
              Terminate All Sessions
            </button>
          }
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-100">
                <th class="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">User / Role</th>
                <th class="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">IP Address</th>
                <th class="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Portal Context</th>
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
                      <span class="text-slate-600">{{ session.target }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-slate-500 tabular-nums">{{ session.timestamp | date:'short' }}</td>
                  <td class="px-6 py-4 text-right">
                    <button
                      type="button"
                      (click)="terminateSession(session.id, session.userName)"
                      class="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-all cursor-pointer"
                    >
                      Terminate
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="px-6 py-12 text-center text-slate-400 font-medium">
                    No active browser sessions currently open.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <app-confirm-dialog
        [isOpen]="showLockoutConfirm()"
        [title]="lockoutState().active ? 'Lift Emergency Lockout?' : 'Activate Emergency Lockout?'"
        [message]="lockoutState().active ? 'Standard portal logins will resume normal verification under the configured security policy.' : 'All non-admin logins will be flagged and restricted across EduERP until lifted by a Super Admin.'"
        [confirmLabel]="lockoutState().active ? 'Lift Lockout' : 'Activate Lockout'"
        [icon]="lockoutState().active ? 'lock_open' : 'lock'"
        [variant]="lockoutState().active ? 'primary' : 'danger'"
        (confirmed)="toggleEmergencyLockout()"
        (cancelled)="showLockoutConfirm.set(false)"
      />

      <app-confirm-dialog
        [isOpen]="showTerminateAllConfirm()"
        title="Terminate All Active Sessions?"
        message="This revokes all currently listed active console sessions and logs a security audit event."
        confirmLabel="Terminate All"
        icon="power_settings_new"
        variant="danger"
        (confirmed)="terminateAllSessions()"
        (cancelled)="showTerminateAllConfirm.set(false)"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SecurityOverviewPage {
  private readonly auditService = inject(AuditService);
  private readonly userAccountsService = inject(UserAccountsService);
  private readonly settingsService = inject(SettingsService);
  private readonly activityService = inject(ActivityService);
  private readonly currentUser = inject(CurrentUserService);

  protected readonly auditLogs = this.auditService.entries;
  protected readonly lockoutState = this.settingsService.emergencyLockout;
  protected readonly terminatedIds = signal<Set<string>>(new Set());
  protected readonly toastMessage = signal<string>('');
  protected readonly showLockoutConfirm = signal<boolean>(false);
  protected readonly showTerminateAllConfirm = signal<boolean>(false);
  protected readonly lastRefreshedAt = signal<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  protected readonly lockedAccounts = computed(() => {
    const threshold = this.settingsService.security().maxFailedLogins || 5;
    return this.userAccountsService
      .users()
      .filter(u => u.isLocked || (u.failedLoginAttempts ?? 0) >= threshold);
  });

  protected readonly activeSessions = computed(() => {
    const terminated = this.terminatedIds();
    return this.auditLogs()
      .filter(e => e.action === 'Login' && e.status === 'Success' && !terminated.has(e.id))
      .slice(0, 10);
  });

  protected readonly kpis = computed(() => {
    const logs = this.auditLogs();
    const nowMs = Date.now();
    const oneDayAgo = nowMs - 24 * 60 * 60 * 1000;
    const failed24h = logs.filter(
      e => (e.action === 'Failed Login' || e.status === 'Failure') && e.timestamp.getTime() >= oneDayAgo
    ).length;
    const lockedCount = this.lockedAccounts().length;
    const timeoutMins = this.settingsService.security().sessionTimeoutMinutes || 30;
    const activeCount = Math.max(
      this.activeSessions().length,
      this.userAccountsService.users().reduce((acc, u) => acc + (u.activeSessionsCount ?? 0), 0) - this.terminatedIds().size
    );

    return [
      {
        label: 'Active Sessions',
        value: Math.max(0, activeCount),
        icon: 'wifi',
        badge: `Updated ${this.lastRefreshedAt()}`,
        bgColor: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        color: 'bg-emerald-600'
      },
      {
        label: 'Failed Logins (24h)',
        value: failed24h,
        icon: 'no_encryption',
        badge: 'Live Audit',
        bgColor: 'bg-red-100',
        iconColor: 'text-red-600',
        color: 'bg-red-600'
      },
      {
        label: 'Locked Accounts',
        value: lockedCount,
        icon: 'gpp_maybe',
        badge: lockedCount > 0 ? 'Needs Review' : 'Healthy',
        bgColor: 'bg-orange-100',
        iconColor: 'text-orange-600',
        color: 'bg-orange-600'
      },
      {
        label: 'Session Timeout',
        value: `${timeoutMins}m`,
        icon: 'timer',
        badge: 'Enforced Policy',
        bgColor: 'bg-blue-100',
        iconColor: 'text-blue-600',
        color: 'bg-blue-600'
      }
    ];
  });

  protected readonly pieChartData = computed<ChartConfiguration['data']>(() => {
    const logs = this.auditLogs();
    const success = logs.filter(e => e.action === 'Login' && e.status === 'Success').length;
    const failure = logs.filter(e => e.action === 'Failed Login' || e.status === 'Failure').length;

    return {
      labels: ['Successful Logins', 'Failed / Blocked Events'],
      datasets: [
        {
          data: [success, failure],
          backgroundColor: ['#6D42E8', '#F43F5E'],
          hoverBackgroundColor: ['#4F46E5', '#E11D48'],
          borderWidth: 0
        }
      ]
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
    const buckets = [0, 0, 0, 0, 0, 0];
    const nowMs = Date.now();
    const oneDayAgo = nowMs - 24 * 60 * 60 * 1000;

    for (const entry of this.auditLogs()) {
      const ts = entry.timestamp.getTime();
      if (ts < oneDayAgo) continue;
      if (entry.action !== 'Failed Login' && entry.status !== 'Failure' && entry.action !== 'Permission Change') {
        continue;
      }
      const hour = entry.timestamp.getHours();
      const bucketIdx = Math.min(5, Math.floor(hour / 4));
      buckets[bucketIdx] += 1;
    }

    return {
      labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
      datasets: [
        {
          label: 'Failed & Security Events',
          data: buckets,
          borderColor: '#F43F5E',
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#F43F5E'
        }
      ]
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
      y: { beginAtZero: true, border: { dash: [4, 4] }, ticks: { precision: 0, font: { size: 10 } } }
    }
  };

  refreshTelemetry(): void {
    this.lastRefreshedAt.set(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    this.toastMessage.set('Security telemetry and audit streams refreshed.');
  }

  toggleEmergencyLockout(): void {
    this.showLockoutConfirm.set(false);
    const nextActive = !this.lockoutState().active;
    const actor = this.settingsService.adminProfile().fullName || 'System Administrator';
    this.settingsService.setEmergencyLockout(
      nextActive,
      actor,
      nextActive ? 'Manual lockout activated from Security Overview.' : 'Lockout lifted by administrator.'
    );
    this.auditService.log({
      userId: this.currentUser.userEmail() || 'admin',
      userName: actor,
      role: 'Super Admin',
      module: 'Security Overview',
      action: 'Permission Change',
      target: 'Institutional Emergency Lockout',
      oldValue: nextActive ? 'Inactive' : 'Active',
      newValue: nextActive ? 'Active' : 'Inactive',
      status: 'Success'
    });
    this.activityService.logActivity({
      user: actor,
      role: 'Super Admin',
      operationType: 'Security',
      action: nextActive ? 'activated emergency lockout' : 'lifted emergency lockout',
      target: 'Campus Authentication Gateway',
      module: 'Security Overview',
      category: 'Security',
      icon: nextActive ? 'lock' : 'lock_open'
    });
    this.toastMessage.set(
      nextActive ? 'Emergency Lockout activated across portal.' : 'Emergency Lockout lifted cleanly.'
    );
  }

  terminateSession(sessionId: string, userName: string): void {
    this.terminatedIds.update(prev => {
      const next = new Set(prev);
      next.add(sessionId);
      return next;
    });
    const actor = this.settingsService.adminProfile().fullName || 'System Administrator';
    this.auditService.log({
      userId: this.currentUser.userEmail() || 'admin',
      userName: actor,
      role: 'Super Admin',
      module: 'Security Overview',
      action: 'Logout',
      target: `Terminated session ${sessionId} (${userName})`,
      status: 'Success'
    });
    this.toastMessage.set(`Terminated active session for ${userName}.`);
  }

  terminateAllSessions(): void {
    this.showTerminateAllConfirm.set(false);
    const active = this.activeSessions();
    this.terminatedIds.update(prev => {
      const next = new Set(prev);
      active.forEach(s => next.add(s.id));
      return next;
    });
    const actor = this.settingsService.adminProfile().fullName || 'System Administrator';
    this.auditService.log({
      userId: this.currentUser.userEmail() || 'admin',
      userName: actor,
      role: 'Super Admin',
      module: 'Security Overview',
      action: 'Logout',
      target: `Terminated all ${active.length} active browser sessions`,
      status: 'Success'
    });
    this.toastMessage.set(`Terminated ${active.length} active session(s).`);
  }

  unlockUser(userId: string, name: string): void {
    const res = this.userAccountsService.toggleLockUser(userId);
    if (res.success) {
      this.toastMessage.set(`Account unlocked for ${name}.`);
    }
  }
}
