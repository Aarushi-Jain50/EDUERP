import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-status-badge',
  imports: [],
  template: `
    <span
      class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border whitespace-nowrap"
      [class]="badgeClasses()"
    >
      <span class="w-1.5 h-1.5 rounded-full shrink-0" [class]="dotClass()"></span>
      <span>{{ status() }}</span>
    </span>
  `
})
export class StatusBadge {
  readonly status = input.required<string>();

  protected badgeClasses(): string {
    const s = this.status().toLowerCase();
    switch (s) {
      case 'active':
      case 'paid':
      case 'pass':
      case 'submitted':
      case 'online':
        return 'bg-emerald-50/80 text-emerald-700 border-emerald-200/80';
      case 'upcoming':
        return 'bg-sky-50/80 text-sky-700 border-sky-200/80';
      case 'evaluated':
      case 'hybrid':
        return 'bg-indigo-50/80 text-indigo-700 border-indigo-200/80';
      case 'offline':
        return 'bg-slate-100/80 text-slate-700 border-slate-300/80';
      case 'completed':
      case 'draft':
        return 'bg-slate-100/80 text-slate-600 border-slate-200';
      case 'inactive':
      case 'pending':
      case 'partial':
      case 'late':
        return 'bg-amber-50/80 text-amber-700 border-amber-200/80';
      case 'overdue':
      case 'cancelled':
      case 'fail':
        return 'bg-rose-50/80 text-rose-700 border-rose-200/80';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  }

  protected dotClass(): string {
    const s = this.status().toLowerCase();
    switch (s) {
      case 'active':
      case 'paid':
      case 'pass':
      case 'submitted':
      case 'online':
        return 'bg-emerald-500';
      case 'upcoming':
        return 'bg-sky-500';
      case 'evaluated':
      case 'hybrid':
        return 'bg-indigo-600';
      case 'offline':
        return 'bg-slate-600';
      case 'completed':
      case 'draft':
        return 'bg-slate-400';
      case 'inactive':
      case 'pending':
      case 'partial':
      case 'late':
        return 'bg-amber-500';
      case 'overdue':
      case 'cancelled':
      case 'fail':
        return 'bg-rose-500';
      default:
        return 'bg-slate-400';
    }
  }
}
