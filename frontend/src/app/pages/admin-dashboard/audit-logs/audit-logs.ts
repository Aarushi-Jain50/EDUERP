import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { AuditService, AuditEntry } from '../../../services/audit.service';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fade-in pb-20">
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-[#172554] tracking-tight">Audit Logs</h1>
          <p class="text-sm text-slate-500 mt-1">Detailed immutable trail of all system activities and administrative changes.</p>
        </div>
        <div class="flex items-center gap-2">
          <button class="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2 cursor-pointer shadow-sm">
            <mat-icon class="text-sm">file_download</mat-icon> Export Excel
          </button>
          <button class="bg-[#6D42E8] text-white px-4 py-2 rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-purple-900/30 transition-all flex items-center gap-2 cursor-pointer">
            <mat-icon class="text-sm">picture_as_pdf</mat-icon> Export PDF
          </button>
        </div>
      </div>

      <!-- Data Toolbar -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div class="relative flex-1 w-full">
          <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</mat-icon>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Search by user, module, or action..."
            class="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D42E8] outline-none transition-all"
          />
        </div>
        <div class="flex items-center gap-3 w-full md:w-auto">
          <select [(ngModel)]="moduleFilter" class="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs focus:bg-white outline-none cursor-pointer flex-1 md:flex-none">
            <option value="All">All Modules</option>
            <option value="Settings">Settings</option>
            <option value="Fees">Fees</option>
            <option value="Students">Students</option>
            <option value="Attendance">Attendance</option>
            <option value="Exams">Exams</option>
          </select>
          <select [(ngModel)]="statusFilter" class="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs focus:bg-white outline-none cursor-pointer flex-1 md:flex-none">
            <option value="All">All Status</option>
            <option value="Success">Success</option>
            <option value="Failure">Failure</option>
          </select>
        </div>
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
                  <td class="px-6 py-4 text-slate-600 font-medium">{{ log.target }}</td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-1.5" [class]="log.status === 'Success' ? 'text-emerald-600' : 'text-red-600'">
                      <mat-icon class="text-sm">{{ log.status === 'Success' ? 'check_circle' : 'cancel' }}</mat-icon>
                      <span class="font-bold text-[10px] uppercase tracking-wider">{{ log.status }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <button (click)="viewDetails(log)" (keydown.enter)="viewDetails(log)" class="text-[#6D42E8] hover:bg-purple-50 p-1.5 rounded-lg transition-all cursor-pointer" aria-label="View Log Details">
                      <mat-icon class="text-sm">visibility</mat-icon>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="px-6 py-20 text-center">
                    <div class="flex flex-col items-center opacity-40">
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
          <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" (click)="selectedLog.set(null)"></div>
          <div class="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
            <div class="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 class="text-lg font-extrabold text-[#172554] tracking-tight">Log Details</h2>
              <button (click)="selectedLog.set(null)" class="text-slate-400 hover:text-slate-600 cursor-pointer">
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
                  <p class="text-[10px] font-bold text-slate-500 uppercase mb-1">IP Address</p>
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
                  <div class="flex justify-between text-xs">
                    <span class="text-slate-500">Module:</span>
                    <span class="font-bold text-slate-900">{{ selectedLog()?.module }}</span>
                  </div>
                  <div class="flex justify-between text-xs">
                    <span class="text-slate-500">Action:</span>
                    <span class="font-bold text-[#6D42E8]">{{ selectedLog()?.action }}</span>
                  </div>
                  <div class="flex justify-between text-xs">
                    <span class="text-slate-500">Target:</span>
                    <span class="font-bold text-slate-900">{{ selectedLog()?.target }}</span>
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
              <button (click)="selectedLog.set(null)" class="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer shadow-lg shadow-slate-900/20">
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

  protected searchQuery = '';
  protected moduleFilter = 'All';
  protected statusFilter = 'All';
  protected readonly selectedLog = signal<AuditEntry | null>(null);

  protected readonly filteredLogs = computed(() => {
    let logs = this.auditService.entries();

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      logs = logs.filter(l => 
        l.userName.toLowerCase().includes(q) || 
        l.module.toLowerCase().includes(q) || 
        l.target.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q)
      );
    }

    if (this.moduleFilter !== 'All') {
      logs = logs.filter(l => l.module === this.moduleFilter);
    }

    if (this.statusFilter !== 'All') {
      logs = logs.filter(l => l.status === this.statusFilter);
    }

    return logs;
  });

  protected getActionColor(action: string): string {
    switch (action) {
      case 'Delete': return 'text-red-600';
      case 'Create': return 'text-emerald-600';
      case 'Update': return 'text-[#6D42E8]';
      case 'Permission Change': return 'text-orange-600';
      case 'Failed Login': return 'text-red-500';
      default: return 'text-slate-600';
    }
  }

  protected viewDetails(log: AuditEntry) {
    this.selectedLog.set(log);
  }
}
