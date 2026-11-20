import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuditEntry, AuditService } from '../../../services/audit.service';
import { CurrentUserService } from '../../../services/current-user.service';
import { PageHeader } from '../../../components/shared/page-header';
import { exportToExcel } from '../../../utils/export.helper';

@Component({
  selector: 'app-activity-history',
  imports: [CommonModule, MatIconModule, ReactiveFormsModule, PageHeader],
  template: `
    <div class="space-y-6 animate-fade-in pb-20 max-w-4xl mx-auto">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <app-page-header
          title="Activity History"
          subtitle="Personal timeline of your administrative actions, exports, and security operations."
        />
        <button
          type="button"
          (click)="exportHistory()"
          class="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
        >
          <mat-icon class="text-sm">file_download</mat-icon> Export History
        </button>
      </div>

      <!-- Filter Strip -->
      <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</mat-icon>
          <input
            type="text"
            [formControl]="searchControl"
            placeholder="Search module or target record..."
            class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:bg-white focus:border-[#6D42E8] outline-none"
          />
        </div>
        <select [formControl]="actionControl" class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none cursor-pointer">
          <option value="All">All Actions</option>
          <option value="Create">Create</option>
          <option value="Update">Update</option>
          <option value="Delete">Delete</option>
          <option value="Permission Change">Permission Change</option>
          <option value="Export">Export</option>
          <option value="Login">Login</option>
          <option value="Logout">Logout</option>
        </select>
      </div>

      <!-- Timeline Wrapper -->
      <div class="relative pl-8 before:content-[''] before:absolute before:left-[11px] before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200">
        @for (log of filteredUserLogs(); track log.id) {
          <div class="relative pb-8 group">
            <div [class]="getIconBg(log.action)" class="absolute left-[-29px] top-0 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center text-white z-10 shadow-sm transition-transform group-hover:scale-110">
              <mat-icon class="text-[10px]">{{ getIcon(log.action) }}</mat-icon>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-purple-200 transition-all group-hover:shadow-md">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-black text-slate-900">{{ log.action }}</span>
                  <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[9px] tracking-wide uppercase">{{ log.module }}</span>
                </div>
                <span class="text-[10px] font-bold text-slate-400 flex items-center gap-1 tabular-nums">
                  <mat-icon class="text-xs">schedule</mat-icon> {{ log.timestamp | date:'MMM d, y, h:mm a' }}
                </span>
              </div>

              <p class="text-xs text-slate-700 leading-relaxed">
                {{ log.userName }} performed <span class="font-bold text-slate-900">{{ log.action }}</span> in
                <span class="font-bold text-slate-900">{{ log.module }}</span> targeting
                <span class="text-[#6D42E8] font-semibold">{{ log.target }}</span>.
              </p>

              @if (log.status === 'Failure') {
                <div class="mt-3 bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-2">
                  <mat-icon class="text-red-500 text-sm">error_outline</mat-icon>
                  <p class="text-[10px] text-red-700 font-bold">This operation failed or was blocked by security policy.</p>
                </div>
              }

              <div class="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <span class="text-[10px] text-slate-400 flex items-center gap-1 tabular-nums">
                    <mat-icon class="text-[14px]">lan</mat-icon> {{ log.ipAddress }}
                  </span>
                  <span class="text-[10px] text-slate-400 flex items-center gap-1">
                    <mat-icon class="text-[14px]">verified_user</mat-icon> {{ log.role }}
                  </span>
                </div>
                <button
                  type="button"
                  (click)="selectedLog.set(log)"
                  class="text-[10px] font-bold text-[#6D42E8] hover:underline cursor-pointer"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        } @empty {
          <div class="bg-white p-12 rounded-3xl border border-slate-200 border-dashed text-center flex flex-col items-center opacity-50 ml-[-2rem]">
            <mat-icon class="text-5xl mb-3 text-slate-300">history_toggle_off</mat-icon>
            <p class="font-bold text-slate-900">No activity recorded matching your filter.</p>
            <p class="text-xs text-slate-500 mt-1">Administrative changes across ERP modules will appear here chronologically.</p>
          </div>
        }
      </div>

      <!-- Detail Drawer -->
      @if (selectedLog()) {
        <div class="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close detail drawer"
            (click)="selectedLog.set(null)"
            class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm w-full h-full border-0 cursor-default"
          ></button>
          <div class="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            <div class="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 class="text-lg font-extrabold text-[#172554]">Action Details</h2>
              <button type="button" (click)="selectedLog.set(null)" class="text-slate-400 hover:text-slate-600 cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              <div class="bg-slate-50 p-4 rounded-2xl space-y-2.5">
                <div class="flex justify-between">
                  <span class="text-slate-500">Actor:</span>
                  <span class="font-bold text-slate-900">{{ selectedLog()?.userName }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Module:</span>
                  <span class="font-bold text-slate-900">{{ selectedLog()?.module }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Action:</span>
                  <span class="font-bold text-[#6D42E8]">{{ selectedLog()?.action }}</span>
                </div>
                <div class="flex justify-between gap-4">
                  <span class="text-slate-500 shrink-0">Target:</span>
                  <span class="font-bold text-slate-900 text-right">{{ selectedLog()?.target }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Timestamp:</span>
                  <span class="font-bold text-slate-700 tabular-nums">{{ selectedLog()?.timestamp | date:'medium' }}</span>
                </div>
              </div>

              @if (selectedLog()?.oldValue) {
                <div class="space-y-1.5">
                  <p class="text-[11px] font-bold text-slate-600 uppercase">Previous Value</p>
                  <div class="bg-red-50 border border-red-100 p-3 rounded-xl font-mono text-[11px] text-red-700 break-all">
                    {{ selectedLog()?.oldValue }}
                  </div>
                </div>
              }

              @if (selectedLog()?.newValue) {
                <div class="space-y-1.5">
                  <p class="text-[11px] font-bold text-slate-600 uppercase">New Value</p>
                  <div class="bg-emerald-50 border border-emerald-100 p-3 rounded-xl font-mono text-[11px] text-emerald-700 break-all">
                    {{ selectedLog()?.newValue }}
                  </div>
                </div>
              }
            </div>
            <div class="p-6 border-t border-slate-100">
              <button type="button" (click)="selectedLog.set(null)" class="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-bold cursor-pointer">
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
export class ActivityHistoryPage {
  private readonly auditService = inject(AuditService);
  private readonly currentUser = inject(CurrentUserService);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly actionControl = new FormControl('All', { nonNullable: true });

  private readonly searchQuery = toSignal(this.searchControl.valueChanges, { initialValue: '' });
  private readonly actionFilter = toSignal(this.actionControl.valueChanges, { initialValue: 'All' });

  protected readonly selectedLog = signal<AuditEntry | null>(null);

  protected readonly userLogs = computed(() => {
    return this.auditService.getForCurrentAdmin(this.currentUser.userEmail());
  });

  protected readonly filteredUserLogs = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const act = this.actionFilter();
    return this.userLogs().filter(l => {
      if (act !== 'All' && l.action !== act) return false;
      if (q) {
        return (
          l.module.toLowerCase().includes(q) ||
          l.target.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q)
        );
      }
      return true;
    });
  });

  protected getIcon(action: string): string {
    switch (action) {
      case 'Create':
        return 'add';
      case 'Update':
        return 'edit';
      case 'Delete':
        return 'delete';
      case 'Login':
        return 'login';
      case 'Logout':
        return 'logout';
      case 'Permission Change':
        return 'security';
      case 'Export':
        return 'file_download';
      default:
        return 'history';
    }
  }

  protected getIconBg(action: string): string {
    switch (action) {
      case 'Create':
        return 'bg-emerald-500';
      case 'Update':
        return 'bg-[#6D42E8]';
      case 'Delete':
        return 'bg-red-500';
      case 'Permission Change':
        return 'bg-orange-500';
      case 'Login':
        return 'bg-blue-500';
      default:
        return 'bg-slate-400';
    }
  }

  protected exportHistory(): void {
    const rows = this.filteredUserLogs().map(l => ({
      Timestamp: l.timestamp.toISOString(),
      Module: l.module,
      Action: l.action,
      Target: l.target,
      Status: l.status,
      SourceIP: l.ipAddress
    }));
    exportToExcel(rows, `EduERP-Admin-Activity-History-${new Date().toISOString().slice(0, 10)}`);
  }
}
