import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuditService } from '../../../services/audit.service';

@Component({
  selector: 'app-activity-history',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-6 animate-fade-in pb-20 max-w-4xl mx-auto">
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-[#172554] tracking-tight">Activity History</h1>
          <p class="text-sm text-slate-500 mt-1">Timeline of your personal administrative actions and session history.</p>
        </div>
      </div>

      <!-- Timeline Wrapper -->
      <div class="relative pl-8 before:content-[''] before:absolute before:left-[11px] before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200">
        @for (log of userLogs(); track log.id; let first = $first; let last = $last) {
          <div class="relative pb-10 group">
            <!-- Timeline Icon -->
            <div [class]="getIconBg(log.action)" class="absolute left-[-29px] top-0 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center text-white z-10 shadow-sm transition-transform group-hover:scale-110">
              <mat-icon class="text-[10px]">{{ getIcon(log.action) }}</mat-icon>
            </div>

            <!-- Content Card -->
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
                You {{ log.action.toLowerCase() }}ed a record in <span class="font-bold text-slate-900">{{ log.module }}</span> 
                targeting <span class="text-[#6D42E8] font-semibold">{{ log.target }}</span>.
              </p>

              @if (log.status === 'Failure') {
                <div class="mt-3 bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-2">
                  <mat-icon class="text-red-500 text-sm">error_outline</mat-icon>
                  <p class="text-[10px] text-red-700 font-bold">This action failed to complete successfully.</p>
                </div>
              }

              <div class="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <span class="text-[10px] text-slate-400 flex items-center gap-1 tabular-nums">
                    <mat-icon class="text-[14px]">lan</mat-icon> {{ log.ipAddress }}
                  </span>
                  <span class="text-[10px] text-slate-400 flex items-center gap-1">
                    <mat-icon class="text-[14px]">devices</mat-icon> Web Browser
                  </span>
                </div>
                <button class="text-[10px] font-bold text-[#6D42E8] hover:underline cursor-pointer">View Details</button>
              </div>
            </div>
          </div>
        } @empty {
          <div class="bg-white p-12 rounded-3xl border border-slate-200 border-dashed text-center flex flex-col items-center opacity-40 ml-[-2rem]">
            <mat-icon class="text-5xl mb-3 text-slate-300">history_toggle_off</mat-icon>
            <p class="font-bold text-slate-900">No activity recorded for your account yet.</p>
            <p class="text-xs text-slate-500 mt-1">Actions you take in the system will appear here in chronological order.</p>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityHistoryPage {
  private readonly auditService = inject(AuditService);

  protected readonly userLogs = computed(() => {
    return this.auditService.getByUser('u1'); // assuming 'u1' is current admin
  });

  protected getIcon(action: string): string {
    switch (action) {
      case 'Create': return 'add';
      case 'Update': return 'edit';
      case 'Delete': return 'delete';
      case 'Login': return 'login';
      case 'Permission Change': return 'security';
      case 'Export': return 'file_download';
      default: return 'history';
    }
  }

  protected getIconBg(action: string): string {
    switch (action) {
      case 'Create': return 'bg-emerald-500';
      case 'Update': return 'bg-[#6D42E8]';
      case 'Delete': return 'bg-red-500';
      case 'Permission Change': return 'bg-orange-500';
      case 'Login': return 'bg-blue-500';
      default: return 'bg-slate-400';
    }
  }
}
