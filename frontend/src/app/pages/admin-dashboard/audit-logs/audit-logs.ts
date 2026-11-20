import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuditEntry, AuditService } from '../../../services/audit.service';
import { ActivityService } from '../../../services/activity.service';
import { CurrentUserService } from '../../../services/current-user.service';
import { SettingsService } from '../../../services/settings.service';
import { PageHeader } from '../../../components/shared/page-header';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

@Component({
  selector: 'app-audit-logs',
  imports: [CommonModule, MatIconModule, ReactiveFormsModule, PageHeader],
  template: `
    <div class="space-y-6 animate-fade-in pb-20 max-w-6xl mx-auto">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <app-page-header
          title="Audit Logs"
          subtitle="Immutable trail of authentication events, governance operations, and administrative modifications."
        />
        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            (click)="exportExcel()"
            class="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <mat-icon class="text-sm">file_download</mat-icon> Export Excel
          </button>
          <button
            type="button"
            (click)="exportPdf()"
            class="bg-[#6D42E8] text-white px-4 py-2 rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-purple-900/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            <mat-icon class="text-sm">picture_as_pdf</mat-icon> Export PDF
          </button>
        </div>
      </div>

      @if (exportMessage()) {
        <div class="px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <div class="flex items-center gap-2">
            <mat-icon class="text-base">check_circle</mat-icon>
            <span>{{ exportMessage() }}</span>
          </div>
          <button type="button" (click)="exportMessage.set('')" class="cursor-pointer">
            <mat-icon class="text-base">close</mat-icon>
          </button>
        </div>
      }

      <!-- Data Toolbar -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <div class="relative flex-1">
          <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</mat-icon>
          <input
            type="text"
            [formControl]="searchControl"
            placeholder="Search by user, module, action, or target..."
            class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all"
          />
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <select [formControl]="moduleControl" class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none cursor-pointer">
            <option value="All">All Modules</option>
            @for (mod of availableModules(); track mod) {
              <option [value]="mod">{{ mod }}</option>
            }
          </select>
          <select [formControl]="actionControl" class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none cursor-pointer">
            <option value="All">All Actions</option>
            @for (act of availableActions(); track act) {
              <option [value]="act">{{ act }}</option>
            }
          </select>
          <select [formControl]="statusControl" class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none cursor-pointer">
            <option value="All">All Status</option>
            <option value="Success">Success</option>
            <option value="Failure">Failure</option>
          </select>
          <select [formControl]="rangeControl" class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none cursor-pointer">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
        @if (hasActiveFilters()) {
          <button
            type="button"
            (click)="resetFilters()"
            class="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer shrink-0"
          >
            Clear
          </button>
        }
      </div>

      <!-- Audit Table -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-100">
                <th class="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Timestamp</th>
                <th class="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[10px]">User & Role</th>
                <th class="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Module</th>
                <th class="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Action</th>
                <th class="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Target</th>
                <th class="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Status</th>
                <th class="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[10px] text-right">Details</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              @for (log of filteredLogs(); track log.id) {
                <tr class="hover:bg-slate-50/50 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap text-slate-500 tabular-nums font-medium">
                    {{ log.timestamp | date:'MMM d, HH:mm:ss' }}
                  </td>
                  <td class="px-6 py-4">
                    <p class="font-bold text-slate-900">{{ log.userName }}</p>
                    <p class="text-[10px] text-slate-500 font-medium tracking-wide uppercase">{{ log.role }}</p>
                  </td>
                  <td class="px-6 py-4">
                    <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] tracking-wide">{{ log.module }}</span>
                  </td>
                  <td class="px-6 py-4">
                    <span [class]="getActionColor(log.action)" class="font-bold text-[11px]">{{ log.action }}</span>
                  </td>
                  <td class="px-6 py-4 text-slate-600 font-medium max-w-xs truncate">{{ log.target }}</td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-1.5" [class]="log.status === 'Success' ? 'text-emerald-600' : 'text-red-600'">
                      <mat-icon class="text-sm">{{ log.status === 'Success' ? 'check_circle' : 'cancel' }}</mat-icon>
                      <span class="font-bold text-[10px] uppercase tracking-wider">{{ log.status }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <button
                      type="button"
                      (click)="viewDetails(log)"
                      class="text-[#6D42E8] hover:bg-purple-50 p-1.5 rounded-lg transition-all cursor-pointer"
                      aria-label="View Log Details"
                    >
                      <mat-icon class="text-sm">visibility</mat-icon>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="px-6 py-20 text-center">
                    <div class="flex flex-col items-center opacity-50">
                      <mat-icon class="text-4xl mb-2">find_in_page</mat-icon>
                      <p class="font-bold">No audit logs found matching the filters.</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Detail Drawer -->
      @if (selectedLog()) {
        <div class="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close details"
            (click)="selectedLog.set(null)"
            class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm w-full h-full border-0 cursor-default"
          ></button>
          <div class="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
            <div class="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 class="text-lg font-extrabold text-[#172554] tracking-tight">Audit Record Details</h2>
              <button type="button" (click)="selectedLog.set(null)" class="text-slate-400 hover:text-slate-600 cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="flex-1 overflow-y-auto p-6 space-y-6">
              <div class="grid grid-cols-2 gap-4">
                <div class="bg-slate-50 p-3 rounded-2xl">
                  <p class="text-[10px] font-bold text-slate-500 uppercase mb-1">Timestamp</p>
                  <p class="text-xs font-bold text-slate-900 tabular-nums">{{ selectedLog()?.timestamp | date:'medium' }}</p>
                </div>
                <div class="bg-slate-50 p-3 rounded-2xl">
                  <p class="text-[10px] font-bold text-slate-500 uppercase mb-1">Source IP / Console</p>
                  <p class="text-xs font-bold text-slate-900 tabular-nums">{{ selectedLog()?.ipAddress }}</p>
                </div>
              </div>

              <div class="space-y-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-purple-100 text-[#6D42E8] flex items-center justify-center font-bold">
                    {{ (selectedLog()?.userName || '').substring(0, 2).toUpperCase() }}
                  </div>
                  <div>
                    <p class="text-sm font-bold text-slate-900">{{ selectedLog()?.userName }}</p>
                    <p class="text-[11px] text-slate-500 font-medium tracking-wide uppercase">{{ selectedLog()?.role }}</p>
                  </div>
                </div>

                <div class="bg-slate-50 p-4 rounded-2xl space-y-3">
                  <div class="flex justify-between text-xs gap-3">
                    <span class="text-slate-500 shrink-0">Module:</span>
                    <span class="font-bold text-slate-900 text-right">{{ selectedLog()?.module }}</span>
                  </div>
                  <div class="flex justify-between text-xs gap-3">
                    <span class="text-slate-500 shrink-0">Action:</span>
                    <span class="font-bold text-[#6D42E8] text-right">{{ selectedLog()?.action }}</span>
                  </div>
                  <div class="flex justify-between text-xs gap-3">
                    <span class="text-slate-500 shrink-0">Target:</span>
                    <span class="font-bold text-slate-900 text-right break-words">{{ selectedLog()?.target }}</span>
                  </div>
                </div>

                @if (selectedLog()?.oldValue) {
                  <div class="space-y-2">
                    <p class="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Previous Value</p>
                    <div class="bg-red-50 border border-red-100 p-3 rounded-2xl text-[11px] text-red-700 font-mono break-all whitespace-pre-wrap leading-relaxed">
                      {{ selectedLog()?.oldValue }}
                    </div>
                  </div>
                }

                @if (selectedLog()?.newValue) {
                  <div class="space-y-2">
                    <p class="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">New Value</p>
                    <div class="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl text-[11px] text-emerald-700 font-mono break-all whitespace-pre-wrap leading-relaxed">
                      {{ selectedLog()?.newValue }}
                    </div>
                  </div>
                }
              </div>
            </div>
            <div class="p-6 border-t border-slate-100">
              <button type="button" (click)="selectedLog.set(null)" class="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer shadow-lg shadow-slate-900/20">
                Close
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditLogsPage {
  private readonly auditService = inject(AuditService);
  private readonly activityService = inject(ActivityService);
  private readonly currentUser = inject(CurrentUserService);
  private readonly settingsService = inject(SettingsService);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly moduleControl = new FormControl('All', { nonNullable: true });
  protected readonly actionControl = new FormControl('All', { nonNullable: true });
  protected readonly statusControl = new FormControl('All', { nonNullable: true });
  protected readonly rangeControl = new FormControl<'all' | 'today' | '7d' | '30d'>('all', { nonNullable: true });

  private readonly searchQuery = toSignal(this.searchControl.valueChanges, { initialValue: '' });
  private readonly moduleFilter = toSignal(this.moduleControl.valueChanges, { initialValue: 'All' });
  private readonly actionFilter = toSignal(this.actionControl.valueChanges, { initialValue: 'All' });
  private readonly statusFilter = toSignal(this.statusControl.valueChanges, { initialValue: 'All' });
  private readonly rangeFilter = toSignal(this.rangeControl.valueChanges, { initialValue: 'all' });

  protected readonly selectedLog = signal<AuditEntry | null>(null);
  protected readonly exportMessage = signal<string>('');

  protected readonly availableModules = computed(() => {
    const set = new Set<string>(['Settings', 'Fees', 'Students', 'Attendance', 'Exams', 'Results', 'User Accounts', 'Roles & Permissions', 'Authentication']);
    for (const e of this.auditService.entries()) {
      if (e.module) set.add(e.module);
    }
    return Array.from(set).sort();
  });

  protected readonly availableActions = computed(() => {
    const set = new Set<string>();
    for (const e of this.auditService.entries()) {
      if (e.action) set.add(e.action);
    }
    return Array.from(set).sort();
  });

  protected readonly hasActiveFilters = computed(() => {
    return (
      this.searchQuery().trim() !== '' ||
      this.moduleFilter() !== 'All' ||
      this.actionFilter() !== 'All' ||
      this.statusFilter() !== 'All' ||
      this.rangeFilter() !== 'all'
    );
  });

  protected readonly filteredLogs = computed(() => {
    let logs = this.auditService.entries();
    const q = this.searchQuery().trim().toLowerCase();
    const mod = this.moduleFilter();
    const act = this.actionFilter();
    const st = this.statusFilter();
    const range = this.rangeFilter();

    if (q) {
      logs = logs.filter(
        l =>
          l.userName.toLowerCase().includes(q) ||
          l.module.toLowerCase().includes(q) ||
          l.target.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.role.toLowerCase().includes(q)
      );
    }
    if (mod !== 'All') {
      logs = logs.filter(l => l.module === mod);
    }
    if (act !== 'All') {
      logs = logs.filter(l => l.action === act);
    }
    if (st !== 'All') {
      logs = logs.filter(l => l.status === st);
    }
    if (range !== 'all') {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const cutoff =
        range === 'today'
          ? startOfToday
          : range === '7d'
            ? now.getTime() - 7 * 86_400_000
            : now.getTime() - 30 * 86_400_000;
      logs = logs.filter(l => l.timestamp.getTime() >= cutoff);
    }
    return logs;
  });

  protected resetFilters(): void {
    this.searchControl.setValue('');
    this.moduleControl.setValue('All');
    this.actionControl.setValue('All');
    this.statusControl.setValue('All');
    this.rangeControl.setValue('all');
  }

  protected getActionColor(action: string): string {
    switch (action) {
      case 'Delete':
        return 'text-red-600';
      case 'Create':
        return 'text-emerald-600';
      case 'Update':
        return 'text-[#6D42E8]';
      case 'Permission Change':
        return 'text-orange-600';
      case 'Failed Login':
        return 'text-red-500';
      default:
        return 'text-slate-600';
    }
  }

  protected viewDetails(log: AuditEntry): void {
    this.selectedLog.set(log);
  }

  protected exportExcel(): void {
    const rows = this.filteredLogs().map(l => ({
      Timestamp: l.timestamp.toISOString(),
      User: l.userName,
      Role: l.role,
      Module: l.module,
      Action: l.action,
      Target: l.target,
      Status: l.status,
      SourceIP: l.ipAddress
    }));
    exportToExcel(rows, `EduERP-Audit-Logs-${new Date().toISOString().slice(0, 10)}`);
    this.recordExport('Excel Workbook (.xlsx)', rows.length);
  }

  protected exportPdf(): void {
    const rows = this.filteredLogs().map(l => [
      l.timestamp.toLocaleString('en-IN'),
      l.userName,
      l.role,
      l.module,
      l.action,
      l.target,
      l.status
    ]);
    exportToPdf(
      'Institutional Security & Governance Audit Trail',
      ['Timestamp', 'User', 'Role', 'Module', 'Action', 'Target', 'Status'],
      rows,
      `EduERP-Audit-Logs-${new Date().toISOString().slice(0, 10)}`,
      [`Total Records: ${rows.length}`, `Module Filter: ${this.moduleFilter()} · Status: ${this.statusFilter()}`]
    );
    this.recordExport('PDF Report', rows.length);
  }

  private recordExport(format: string, count: number): void {
    const actor = this.settingsService.adminProfile().fullName || 'System Administrator';
    this.auditService.log({
      userId: this.currentUser.userEmail() || 'admin',
      userName: actor,
      role: 'Super Admin',
      module: 'Audit Logs',
      action: 'Export',
      target: `Exported ${count} audit logs (${format})`,
      status: 'Success'
    });
    this.activityService.logActivity({
      user: actor,
      role: 'Super Admin',
      operationType: 'Export',
      action: 'exported audit trail',
      target: `${count} entries (${format})`,
      module: 'Audit Logs',
      category: 'Security',
      icon: 'file_download'
    });
    this.exportMessage.set(`Exported ${count} filtered audit log record(s) to ${format}.`);
  }
}
